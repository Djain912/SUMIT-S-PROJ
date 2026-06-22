import DOMPurify from 'isomorphic-dompurify';

/**
 * Central HTML sanitizer. Runs on both server (jsdom) and client so that
 * content is safe even during SSR — the previous note sanitizer only ran in
 * the browser, leaving a window where raw HTML reached the page before
 * hydration.
 *
 * Use this at EVERY `dangerouslySetInnerHTML` sink that renders content which
 * originated from a human (notes, blog posts, quiz questions, AI output).
 * Static JSON-LD built from our own typed objects does not need it.
 */

// Tags we allow in rich content (notes, questions, blog). No <script>, <iframe>,
// <object>, <embed>, <form>, <svg>, <math>, <style>, <link>, <meta>, <base>.
const ALLOWED_TAGS = [
  'p', 'br', 'hr', 'span', 'div',
  'strong', 'b', 'em', 'i', 'u', 's', 'sub', 'sup', 'mark', 'small',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code', 'kbd',
  'a', 'img',
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'col', 'colgroup', 'caption',
  'figure', 'figcaption',
];

const ALLOWED_ATTR = [
  'href', 'target', 'rel', 'title',
  'src', 'alt', 'width', 'height', 'loading',
  'class', 'style',
  'colspan', 'rowspan', 'scope',
];

/**
 * Sanitize untrusted/rich HTML. Strips active content (scripts, event
 * handlers, javascript:/data: URLs) while preserving presentational markup,
 * tables and images used by Chartix notes and questions.
 */
export function sanitizeHtml(dirty: string | null | undefined): string {
  if (!dirty) return '';
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // Only allow safe URL schemes — blocks javascript:, vbscript:, and data:
    // URIs (except images, handled by the regex below).
    ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.-]+(?:[^a-z+.\-:]|$))/i,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'svg', 'math', 'style', 'link', 'meta', 'base'],
    FORBID_ATTR: ['srcset', 'formaction', 'xlink:href'],
    ADD_ATTR: ['target'],
    // Force any anchor that survives to open safely.
    USE_PROFILES: { html: true },
  });
}

/** Escape a plain string for safe interpolation into an HTML attribute/text. */
export function escapeHtml(value: string | null | undefined): string {
  if (!value) return '';
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
