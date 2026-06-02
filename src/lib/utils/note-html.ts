/**
 * normalizeNoteHtml
 *
 * Notes are often authored by pasting from external editors (ChatGPT, Google
 * Docs, Word, the CMT curriculum site). That pasted HTML carries FOREIGN CSS
 * CLASSES and inline widths that corrupt our layout because Chartix also uses
 * Tailwind:
 *   - `text-center`            → centers entire sections
 *   - `w-fit` / `min-w-(--thread-content-width)` → collapses tables into narrow columns
 *   - `last:pe-10`, `empty:hidden`, `mt-3`, `w-full` → misc layout breakage
 *   - inline `width:` on table/td/th → narrow columns → words break mid-character
 *
 * This function sanitises note HTML so it renders purely from our `.prose`
 * styles. It runs client-side (needs DOMParser).
 */
export function normalizeNoteHtml(html: string): string {
  if (typeof window === 'undefined' || !html) return html;

  const doc = new DOMParser().parseFromString(html, 'text/html');

  // 1. Strip ALL class attributes and ChatGPT/editor data-* markers.
  //    All visual styling comes from `.prose` — foreign classes only break it.
  doc.body.querySelectorAll('*').forEach((el) => {
    el.removeAttribute('class');
    // Remove data-start / data-end / data-section-id / data-col-size / etc.
    [...el.attributes].forEach((attr) => {
      if (attr.name.startsWith('data-')) el.removeAttribute(attr.name);
    });
  });

  // 2. Insert zero-width spaces in genuinely long unbroken tokens (e.g. URLs)
  //    so they can wrap without forcing words apart.
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT);
  const textNodes: Text[] = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach((node) => {
    node.nodeValue = node.nodeValue?.replace(/(\S{40})(?=\S)/g, '$1​') ?? '';
  });

  // 3. Normalise tables — remove fixed widths so columns size to content.
  doc.body.querySelectorAll('table').forEach((t) => {
    const table = t as HTMLTableElement;
    table.style.borderCollapse = 'collapse';
    table.style.width = '100%';
    table.style.tableLayout = 'auto';
    table.style.border = '1px solid #d4d4d8';
    table.removeAttribute('width');
    table.removeAttribute('height');
  });

  doc.body.querySelectorAll('col, colgroup').forEach((el) => {
    (el as HTMLElement).removeAttribute('width');
    (el as HTMLElement).style.width = 'auto';
  });

  doc.body.querySelectorAll('th, td').forEach((cell) => {
    const c = cell as HTMLTableCellElement;
    c.style.border = '1px solid #d4d4d8';
    c.style.padding = '0.75rem';
    c.style.width = 'auto';
    c.style.minWidth = '120px';
    c.style.maxWidth = 'none';
    c.style.wordBreak = 'normal';
    c.style.overflowWrap = 'break-word';
    c.style.whiteSpace = 'normal';
    c.removeAttribute('width');
  });

  return doc.body.innerHTML;
}
