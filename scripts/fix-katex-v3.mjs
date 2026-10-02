/**
 * Fix ALL broken KaTeX formulas in published notes using DOM parsing.
 * Problems fixed:
 * 1. katex spans with missing/empty/skeleton katex-html → re-render
 * 2. Heading tags wrapping katex-display → convert to <p>
 * 3. Double katex-display nesting → single
 */
import { PrismaClient } from '@prisma/client';
import katex from 'katex';
import { JSDOM } from 'jsdom';

const DRY_RUN = process.argv.includes('--dry-run');
const prisma = new PrismaClient();

function mathmlToLatex(mathEl) {
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
  return convert(mathEl);
}

function fixNoteHtml(html) {
  const fixes = [];
  const dom = new JSDOM('<!DOCTYPE html><html><body>' + html + '</body></html>');
  const doc = dom.window.document;
  const body = doc.body;
  let changed = false;

  // Fix 1: Heading tags wrapping katex-display → convert to <p>
  body.querySelectorAll('h1, h2, h3, h4, h5, h6').forEach(heading => {
    const katexDisplay = heading.querySelector('.katex-display, .katex');
    if (katexDisplay) {
      const p = doc.createElement('p');
      while (heading.firstChild) p.appendChild(heading.firstChild);
      heading.parentNode.replaceChild(p, heading);
      fixes.push('heading-wrapping-formula -> <p>');
      changed = true;
    }
  });

  // Fix 2: Double katex-display nesting
  body.querySelectorAll('.katex-display > .katex-display').forEach(inner => {
    const outer = inner.parentNode;
    while (inner.firstChild) outer.insertBefore(inner.firstChild, inner);
    outer.removeChild(inner);
    fixes.push('double katex-display -> single');
    changed = true;
  });

  // Fix 3: Find ALL .katex spans and check if they have proper katex-html
  body.querySelectorAll('.katex').forEach(katexEl => {
    const mathmlSpan = katexEl.querySelector('.katex-mathml');
    const htmlSpan = katexEl.querySelector('.katex-html');

    if (!mathmlSpan) {
      // Orphan katex span with no mathml — leftover fragment, remove it
      const text = katexEl.textContent.replace(/[\s​‌‍﻿]/g, '');
      if (!text) {
        katexEl.parentNode.removeChild(katexEl);
        fixes.push('removed orphan katex fragment');
        changed = true;
      }
      return;
    }

    // Check if katex-html has real content
    const hasRealHtml = htmlSpan && htmlSpan.textContent.trim().length > 0;
    if (hasRealHtml) return; // already working

    // Extract LaTeX from MathML
    const mathEl = mathmlSpan.querySelector('math');
    if (!mathEl) return;

    const latex = mathmlToLatex(mathEl);
    if (!latex || !latex.trim()) return;

    try {
      const rendered = katex.renderToString(latex, { displayMode: false, throwOnError: false });
      if (rendered.includes('katex-html')) {
        // Replace the katex span's outerHTML with the rendered version
        const temp = doc.createElement('span');
        temp.innerHTML = rendered;
        katexEl.parentNode.replaceChild(temp.firstChild, katexEl);
        fixes.push('re-rendered: ' + latex.slice(0, 60));
        changed = true;
      }
    } catch (e) {
      // keep original
    }
  });

  if (!changed) return { html, fixes };

  // Extract body innerHTML (without the wrapper tags we added)
  return { html: body.innerHTML, fixes };
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
