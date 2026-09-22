/**
 * Fix broken KaTeX formulas in published notes.
 *
 * Usage: npx tsx scripts/fix-katex-formulas.mjs [--dry-run]
 */
import { PrismaClient } from '@prisma/client';
import katex from 'katex';
import { JSDOM } from 'jsdom';

const DRY_RUN = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

function mathmlToLatex(mathmlStr) {
  const dom = new JSDOM('<body>' + mathmlStr + '</body>');
  const doc = dom.window.document;

  function convert(node) {
    if (node.nodeType === 3) return node.textContent;
    const tag = node.tagName?.toLowerCase();
    if (!tag) return '';
    const children = [...node.childNodes].map(convert).join('');
    switch(tag) {
      case 'math': case 'mrow': case 'semantics': return children;
      case 'mi': {
        const t = node.textContent;
        if (node.getAttribute('mathvariant') === 'normal') return t;
        return t.length > 1 ? `\\text{${t}}` : t;
      }
      case 'mo': {
        const t = node.textContent;
        if (t === '−') return '-';
        if (t === '×') return '\\times ';
        if (t === '÷') return '\\div ';
        if (t === '∣' || t === '|') return '|';
        if (t === '⁡') return '';
        if (t === ' ') return '\\;';
        return t;
      }
      case 'mn': return node.textContent;
      case 'mtext': {
        const t = node.textContent.replace(/ /g, ' ').trim();
        return t ? `\\text{ ${t} }` : '\\;';
      }
      case 'mspace': return '\\;';
      case 'mfrac': {
        const parts = [...node.children].map(convert);
        return `\\frac{${parts[0] || ''}}{${parts[1] || ''}}`;
      }
      case 'msup': {
        const parts = [...node.children].map(convert);
        return `${parts[0]}^{${parts[1] || ''}}`;
      }
      case 'msub': {
        const parts = [...node.children].map(convert);
        return `${parts[0]}_{${parts[1] || ''}}`;
      }
      case 'msubsup': {
        const parts = [...node.children].map(convert);
        return `${parts[0]}_{${parts[1] || ''}}^{${parts[2] || ''}}`;
      }
      case 'msqrt': return `\\sqrt{${children}}`;
      case 'mpadded': return children;
      case 'annotation': return '';
      default: return children;
    }
  }

  const mathEl = doc.querySelector('math');
  if (!mathEl) return null;
  return convert(mathEl);
}

function fixNote(html) {
  let fixCount = 0;

  function replacer(match, mathml) {
    const latex = mathmlToLatex(mathml);
    if (!latex || !latex.trim()) return match;
    try {
      const rendered = katex.renderToString(latex, { displayMode: true, throwOnError: false });
      if (rendered.includes('katex-html')) {
        fixCount++;
        return rendered;
      }
    } catch { /* keep original */ }
    return match;
  }

  // Pattern 1: empty katex-html
  html = html.replace(
    /<span class="katex"><span class="katex-mathml">(<math[^>]*>[\s\S]*?<\/math>)<\/span><span class="katex-html"[^>]*>\s*<\/span><\/span>/g,
    replacer
  );

  // Pattern 2: no katex-html at all
  html = html.replace(
    /<span class="katex"><span class="katex-mathml">(<math[^>]*>[\s\S]*?<\/math>)<\/span><\/span>/g,
    replacer
  );

  return { html, fixCount };
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== APPLYING FIXES ===');

  const notes = await prisma.note.findMany({
    where: { isPublished: true, isDeleted: false, contentHtml: { contains: 'katex' } },
    select: { id: true, title: true, contentHtml: true, subtopic: { select: { title: true } } },
  });

  let totalFixed = 0;
  let notesUpdated = 0;

  for (const note of notes) {
    const { html, fixCount } = fixNote(note.contentHtml || '');

    if (fixCount > 0) {
      console.log(`[${note.subtopic.title}] ${note.title}: ${fixCount} formulas ${DRY_RUN ? 'would be fixed' : 'fixed'}`);
      if (!DRY_RUN) {
        await prisma.note.update({
          where: { id: note.id },
          data: { contentHtml: html },
        });
      }
      totalFixed += fixCount;
      notesUpdated++;
    }
  }

  console.log(`\n${DRY_RUN ? 'Would fix' : 'Fixed'} ${totalFixed} formulas in ${notesUpdated} notes.`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
