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

export function BlogContent({ html, className }: { html: string; className?: string }) {
  // SSR: render admin-authored HTML directly (no jsdom dependency on server).
  // Client: re-render after DOMPurify sanitizes in the real browser DOM.
  const [safeHtml, setSafeHtml] = useState(html);

  useEffect(() => {
    // Runs only in the browser — real DOM exists, no jsdom needed
    import('isomorphic-dompurify').then(({ default: DOMPurify }) => {
      setSafeHtml(
        DOMPurify.sanitize(html, {
          ALLOWED_TAGS,
          ALLOWED_ATTR,
          ALLOWED_URI_REGEXP: /^(?:(?:https?|mailto|tel):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
          FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'form', 'svg', 'math', 'style', 'link', 'meta', 'base'],
          FORBID_ATTR: ['srcset', 'formaction'],
          ADD_ATTR: ['target'],
          USE_PROFILES: { html: true },
        }),
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
