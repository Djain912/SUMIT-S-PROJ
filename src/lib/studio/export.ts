import { toSvg } from 'html-to-image';
import { getFontEmbedCss } from './font-embed';
import { SLIDE_H, SLIDE_W } from './design';

/**
 * Rasterise a slide element to a PNG data URL.
 *
 * Deliberately does NOT use html-to-image's own `toPng`. That helper waits on
 * requestAnimationFrame internally, and browsers suspend rAF in a background
 * tab - so an export would stall the moment the user switched tabs mid-run.
 * We take its SVG output and draw it ourselves, which works either way.
 */
export async function slideToPngDataUrl(
  node: HTMLElement,
  opts: { pixelRatio?: number; fontEmbedCSS?: string } = {},
): Promise<string> {
  const pixelRatio = opts.pixelRatio ?? 2;
  const fontEmbedCSS = opts.fontEmbedCSS ?? (await getFontEmbedCss());

  // html-to-image copies *computed* styles onto every cloned child, so if the
  // live node has been shrunk by its layout (a flex parent, a narrow window)
  // the PNG bakes in that squeezed layout. Force the real node to full slide
  // size for the duration of the capture, then put it back exactly as it was.
  const prev = {
    width: node.style.width,
    minWidth: node.style.minWidth,
    height: node.style.height,
    minHeight: node.style.minHeight,
    flex: node.style.flex,
  };
  node.style.width = `${SLIDE_W}px`;
  node.style.minWidth = `${SLIDE_W}px`;
  node.style.height = `${SLIDE_H}px`;
  node.style.minHeight = `${SLIDE_H}px`;
  node.style.flex = '0 0 auto';
  void node.offsetWidth; // force synchronous reflow before capture

  let svgUrl: string;
  try {
    svgUrl = await toSvg(node, {
      width: SLIDE_W,
      height: SLIDE_H,
      fontEmbedCSS,
      style: { transform: 'none', margin: '0' },
    });
  } finally {
    node.style.width = prev.width;
    node.style.minWidth = prev.minWidth;
    node.style.height = prev.height;
    node.style.minHeight = prev.minHeight;
    node.style.flex = prev.flex;
  }

  const img = await loadImage(svgUrl);

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(SLIDE_W * pixelRatio);
  canvas.height = Math.round(SLIDE_H * pixelRatio);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get a 2D canvas context.');
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/png');
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer = setTimeout(
      () => reject(new Error('Timed out rasterising the slide.')), 30000);
    img.onload = () => { clearTimeout(timer); resolve(img); };
    img.onerror = () => { clearTimeout(timer); reject(new Error('Could not rasterise the slide SVG.')); };
    img.src = src;
  });
}
