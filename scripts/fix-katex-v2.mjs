/**
 * Fix KaTeX formula issues in published notes:
 * 1. Broken katex spans (no katex-html, with <br> tags) → re-render
 * 2. Heading tags wrapping katex-display → convert to <p>
 * 3. Double katex-display nesting → single
 * 4. Fix h3/p tag mismatch from bad heading-to-p boundary
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

function renderLatex(latex) {
  try {
    return katex.renderToString(latex, { displayMode: false, throwOnError: false });
  } catch { return null; }
}

function fixNoteHtml(html) {
  let fixes = [];

  // Fix 1: Heading tags (<h2-h4>) wrapping katex-display formula, closing with </p>
  // Pattern: <h3 attrs><span class="katex-display">...</span></p>
  // Replace: <p><span class="katex-display">...</span></p>
  html = html.replace(
    /<(h[2-4])([^>]*)>(\s*<span class="katex-display[\s\S]*?<\/span>)<\/p>/g,
    (match, tag, attrs, content) => {
      fixes.push('heading-wrapping-formula -> <p>');
      return '<p>' + content + '</p>';
    }
  );

  // Fix 2: Double katex-display nesting
  html = html.replace(
    /<span class="katex-display"><span class="katex-display">/g,
    () => {
      fixes.push('double katex-display -> single');
      return '<span class="katex-display">';
    }
  );

  // Fix 3: Broken katex spans — katex-mathml present but no katex-html, possibly with <br> tags
  // This catches: <span class="katex"><span class="katex-mathml"><math...>...</math></span><br></span>
  // And: <span class="katex"><span class="katex-mathml"><math...>...</math></span></span>
  html = html.replace(
    /<span class="katex"><span class="katex-mathml">(<math[^>]*>[\s\S]*?<\/math>)<\/span>(?:<br\s*\/?>)*<\/span>/g,
    (match, mathml) => {
      const latex = mathmlToLatex(mathml);
      if (!latex || !latex.trim()) return match;
      const rendered = renderLatex(latex);
      if (rendered && rendered.includes('katex-html')) {
        fixes.push('re-rendered: ' + latex.slice(0, 60));
        return rendered;
      }
      return match;
    }
  );

  // Fix 4: katex spans with empty katex-html
  html = html.replace(
    /<span class="katex"><span class="katex-mathml">(<math[^>]*>[\s\S]*?<\/math>)<\/span><span class="katex-html"[^>]*>\s*<\/span><\/span>/g,
    (match, mathml) => {
      const latex = mathmlToLatex(mathml);
      if (!latex || !latex.trim()) return match;
      const rendered = renderLatex(latex);
      if (rendered && rendered.includes('katex-html')) {
        fixes.push('re-rendered empty: ' + latex.slice(0, 60));
        return rendered;
      }
      return match;
    }
  );

  return { html, fixes };
}

async function main() {
  console.log(DRY_RUN ? '=== DRY RUN ===' : '=== APPLYING FIXES ===');

  const notes = await prisma.note.findMany({
    where: { isPublished: true, isDeleted: false, contentHtml: { contains: 'katex' } },
    select: { id: true, title: true, contentHtml: true, subtopic: { select: { title: true } } },
  });

  let totalFixes = 0;
  let notesFixed = 0;

  for (const note of notes) {
    const { html, fixes } = fixNoteHtml(note.contentHtml || '');
    if (fixes.length > 0) {
      console.log('\n[' + note.subtopic.title + '] ' + note.title + ': ' + fixes.length + ' fixes');
      for (const f of fixes) console.log('  - ' + f);

      // Verify tag balance after fix
      const openH3 = (html.match(/<h3[\s>]/g) || []).length;
      const closeH3 = (html.match(/<\/h3>/g) || []).length;
      if (openH3 !== closeH3) console.log('  WARNING: h3 still mismatched after fix: ' + openH3 + '/' + closeH3);

      if (!DRY_RUN) {
        await prisma.note.update({
          where: { id: note.id },
          data: { contentHtml: html },
        });
      }
      totalFixes += fixes.length;
      notesFixed++;
    }
  }

  console.log('\n' + (DRY_RUN ? 'Would apply' : 'Applied') + ' ' + totalFixes + ' fixes across ' + notesFixed + ' notes.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
