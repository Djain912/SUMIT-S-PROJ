/**
 * Pre-built @font-face CSS for slide export.
 *
 * html-to-image otherwise walks every stylesheet in the document to collect
 * fonts. In this app that means all of Tailwind plus Next's dev CSS, which is
 * slow enough to appear hung. Supplying `fontEmbedCSS` makes it skip that scan
 * entirely and guarantees the three studio fonts are baked into the PNG.
 */

const FONTS: Array<{ family: string; file: string; weight: string }> = [
  { family: 'StudioSerif', file: '/fonts/studio/InstrumentSerif-Regular.woff2', weight: '400' },
  { family: 'StudioSans',  file: '/fonts/studio/Manrope-Variable.woff2',        weight: '200 800' },
  { family: 'StudioHand',  file: '/fonts/studio/Caveat-Variable.woff2',         weight: '400 700' },
];

let cached: string | null = null;

async function toBase64(url: string): Promise<string> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load font ${url} (${res.status})`);
  const buf = await res.arrayBuffer();
  let binary = '';
  const bytes = new Uint8Array(buf);
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

/** Builds (and caches) the @font-face CSS with the fonts inlined as base64. */
export async function getFontEmbedCss(): Promise<string> {
  if (cached) return cached;
  const parts = await Promise.all(
    FONTS.map(async (f) => {
      const b64 = await toBase64(f.file);
      return `@font-face{font-family:'${f.family}';`
        + `src:url(data:font/woff2;base64,${b64}) format('woff2');`
        + `font-weight:${f.weight};font-style:normal;font-display:block;}`;
    }),
  );
  cached = parts.join('\n');
  return cached;
}
