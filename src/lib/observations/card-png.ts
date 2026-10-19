// Server-side PNG rendering for Market Desk cards (used for Telegram delivery).
// resvg draws the same SVG the admin page shows, with the brand fonts loaded
// from public/fonts/desk — Vercel functions have no system fonts.

import path from 'path';
import { Resvg } from '@resvg/resvg-js';
import { SANS, SERIF } from './card-svg';

const FONT_DIR = path.join(process.cwd(), 'public', 'fonts', 'desk');
const FONT_FILES = [
  'instrument-serif-regular.ttf',
  'manrope-400.ttf',
  'manrope-500.ttf',
  'manrope-600.ttf',
  'manrope-700.ttf',
].map((f) => path.join(FONT_DIR, f));

/** Card SVG (1600×900) → PNG at the given width (default 1.5×). */
export function renderCardPng(svg: string, width = 2400): Buffer {
  // resvg stops at the first unknown family in a list, so name the bundled fonts directly.
  const direct = svg.split(SERIF).join('Instrument Serif').split(SANS).join('Manrope');
  const resvg = new Resvg(direct, {
    fitTo: { mode: 'width', value: width },
    font: {
      fontFiles: FONT_FILES,
      loadSystemFonts: false,
      defaultFontFamily: 'Manrope',
      serifFamily: 'Instrument Serif',
      sansSerifFamily: 'Manrope',
    },
  });
  return resvg.render().asPng();
}
