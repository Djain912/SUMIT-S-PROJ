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
 * styles. The SECURITY sanitisation (DOMPurify) runs on both server and client;
 * the layout normalisation below needs DOMParser so runs client-side only.
 */
import { sanitizeHtml } from '@/lib/security/sanitize';

export function normalizeNoteHtml(html: string): string {
  if (!html) return '';

  // Security first — strip active content on BOTH server and client so raw
  // HTML never reaches the page during SSR (the old code returned it verbatim
  // when window was undefined).
  const safe = sanitizeHtml(html);

  // Layout normalisation needs the browser DOM; on the server return the
  // already-sanitised HTML (it re-normalises cosmetically after hydration).
  if (typeof window === 'undefined') return safe;

  const doc = new DOMParser().parseFromString(safe, 'text/html');

  // 0. Security: remove any active content that could have been pasted into
  //    the editor — script/embed tags, inline event handlers (onclick, onerror
  //    …) and javascript: URLs. Notes must be pure presentational HTML.
  doc.body
    .querySelectorAll('script, iframe, object, embed, form, link, meta, base')
    .forEach((el) => el.remove());
  doc.body.querySelectorAll('*').forEach((el) => {
    [...el.attributes].forEach((attr) => {
      const name = attr.name.toLowerCase();
      if (name.startsWith('on')) el.removeAttribute(attr.name);
      if ((name === 'href' || name === 'src' || name === 'xlink:href') &&
          attr.value.trim().toLowerCase().startsWith('javascript:')) {
        el.removeAttribute(attr.name);
      }
    });
  });

  // Chartix note-theme utility classes we intentionally keep (styled in
  // globals.css). Everything else foreign is still stripped below.
  const KEEP_CLASSES = new Set(['formula', 'key', 'tip']);

  // 1. Strip foreign class attributes and ChatGPT/editor data-* markers, but
  //    preserve our whitelisted Chartix note classes so formula & callout
  //    boxes render. All other visual styling comes from `.prose`.
  doc.body.querySelectorAll('*').forEach((el) => {
    const kept = (el.getAttribute('class') ?? '')
      .split(/\s+/)
      .filter((c) => KEEP_CLASSES.has(c));
    if (kept.length) el.setAttribute('class', kept.join(' '));
    else el.removeAttribute('class');
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

  // 4. Upgrade Cloudinary images to highest quality / modern format / retina.
  //    Cloudinary applies these transformations on the fly — no re-upload needed.
  doc.body.querySelectorAll('img').forEach((img) => {
    const el = img as HTMLImageElement;
    const src = el.getAttribute('src') ?? '';
    el.setAttribute('src', enhanceCloudinaryUrl(src));

    // Read the authored dimensions BEFORE overwriting the inline styles below,
    // otherwise `height: auto` wipes out the very value we need.
    const ratio = readAspectRatio(el);

    // Crisp rendering + responsive sizing
    el.style.maxWidth = '100%';
    el.style.height = 'auto';
    el.style.cursor = 'zoom-in';
    el.setAttribute('decoding', 'async');

    // Reserve the image's box BEFORE it loads. `.prose img` forces
    // `height: auto`, so an image with no known dimensions occupies zero
    // height until it decodes and then snaps to full size, shoving the rest
    // of the note down.
    if (ratio) el.style.aspectRatio = ratio;

    // Never lazy-load note figures. Reserving the box stops the *layout* from
    // jolting, but it does not stop the *image* from arriving late: with
    // loading="lazy" the fetch only starts once the figure nears the viewport,
    // so the reader scrolls into a blank reserved box and the chart pops in a
    // beat later. That pop-in is what reads as figures blinking while
    // scrolling, and it repeats whenever a browser evicts a decoded offscreen
    // image and re-decodes it on the way back.
    //
    // Notes average 3.8 figures (max 32) and each is capped at w_1600,q_auto,
    // f_auto (~50KB), so fetching them up front costs ~190KB on a typical note.
    // fetchpriority="low" keeps them behind text and the rest of the page, so
    // they stream in while the reader is still at the top and are decoded long
    // before they are scrolled to.
    el.removeAttribute('loading');
    el.setAttribute('fetchpriority', 'low');
  });

  return doc.body.innerHTML;
}

/**
 * Reads an image's intrinsic aspect ratio from its width/height attributes or
 * inline styles, so its box can be reserved before the file loads. Returns
 * null when the authored HTML carries no usable dimensions.
 */
function readAspectRatio(el: HTMLImageElement): string | null {
  const parse = (raw: string | null | undefined): number | null => {
    if (!raw) return null;
    const n = parseFloat(String(raw).replace(/px$/i, '').trim());
    return Number.isFinite(n) && n > 0 ? n : null;
  };

  const width = parse(el.getAttribute('width')) ?? parse(el.style.width);
  const height = parse(el.getAttribute('height')) ?? parse(el.style.height);
  if (!width || !height) return null;

  return `${width} / ${height}`;
}

/**
 * Inserts sizing/quality/format transformations into a Cloudinary URL.
 *   w_1600,c_limit → never send more than 1600px wide, and never upscale.
 *                    The reading column is ~760px, so this is still >2x for
 *                    retina. Source charts are often 3400px+, and shipping
 *                    those untouched was the bulk of a note's weight.
 *   q_auto         → automatic quality
 *   f_auto         → best modern format (AVIF/WebP) for the browser
 *
 * Measured on a real 3416x1990 note chart: 397KB raw / 143KB under the old
 * `q_auto:best,f_auto,dpr_auto,e_improve` / 52KB here.
 *
 * `dpr_auto` was dropped: it only does anything when the browser sends the
 * DPR client hint, which we never opt into via Accept-CH, so it was a no-op.
 * `e_improve` was dropped too — auto contrast/colour correction on technical
 * analysis charts alters the very colours the chart is teaching.
 *
 * Leaves non-Cloudinary URLs and already-transformed URLs untouched.
 */
function enhanceCloudinaryUrl(src: string): string {
  if (!src.includes('res.cloudinary.com')) return src;
  const marker = '/upload/';
  const idx = src.indexOf(marker);
  if (idx === -1) return src;

  const after = src.slice(idx + marker.length);
  // Don't double-apply. Anything before the version segment (v1234…) or the
  // public id is an existing transformation, whether ours or hand-authored.
  const firstSegment = after.split('/')[0];
  const isExistingTransform = /^[a-z]+_/.test(firstSegment) && !/^v\d+$/.test(firstSegment);
  if (isExistingTransform) return src;

  const params = 'w_1600,c_limit,q_auto,f_auto';
  return `${src.slice(0, idx + marker.length)}${params}/${after}`;
}
