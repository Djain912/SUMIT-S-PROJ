'use client';

import { useState, useEffect } from 'react';

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

// Insert Cloudinary auto-format/quality/resize transforms into raw image URLs so
// large admin-uploaded PNGs are served as small WebP/AVIF — reliable on mobile.
// Skips URLs that already carry a transformation segment (e.g. f_auto/q_auto/w_…).
function optimizeCloudinary(html: string): string {
  return html.replace(
    /(https?:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(?![a-z]{1,3}_)/g,
    '$1f_auto,q_auto,w_1200/',
  );
}

export function BlogContent({ html, className }: { html: string; className?: string }) {
  // SSR: render admin-authored HTML directly (no jsdom dependency on server).
  // Client: re-render after DOMPurify sanitizes in the real browser DOM.
  const [safeHtml, setSafeHtml] = useState(() => optimizeCloudinary(html));

  useEffect(() => {
    // Runs only in the browser — real DOM exists, no jsdom needed
    import('isomorphic-dompurify').then(({ default: DOMPurify }) => {
      setSafeHtml(
        optimizeCloudinary(DOMPurify.sanitize(html, {
          ALLOWED_TAGS,
          ALLOWED_ATTR,
          ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'svg', 'math', 'style', 'link', 'meta', 'base'],
          FORBID_ATTR: ['srcset', 'formaction'],
          ADD_ATTR: ['target'],
          USE_PROFILES: { html: true },
        })),
      );
    });
  }, [html]);

  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: safeHtml }}
    />
  );
}
