/**
 * Backfills intrinsic width/height onto <img> tags in note HTML.
 *
 * Why: `.prose img` forces `height: auto`, so an image with no known
 * dimensions occupies zero height until it decodes, then snaps to full size
 * and shoves the rest of the note down. normalizeNoteHtml therefore cannot
 * lazy-load those images (a mid-scroll jolt at every figure), and falls back
 * to eager loading — which on the 32-image candlestick note means 32
 * simultaneous requests before the reader sees anything.
 *
 * Once real dimensions are stored, normalizeNoteHtml can reserve each box via
 * aspect-ratio and every image goes back to lazy loading.
 *
 * Dimensions come from Cloudinary's `fl_getinfo` (no auth required). Every
 * note image is Cloudinary-hosted.
 *
 * Idempotent: images that already carry width/height are skipped, so this is
 * safe to re-run. Pass --dry to inspect without writing.
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const DRY = process.argv.includes('--dry');

const infoCache = new Map();

async function getDimensions(src) {
  if (infoCache.has(src)) return infoCache.get(src);

  const marker = '/upload/';
  const idx = src.indexOf(marker);
  if (idx === -1) return null;

  // Strip any cache-busting query string before building the info URL.
  const after = src.slice(idx + marker.length).split('?')[0];
  const url = `${src.slice(0, idx + marker.length)}fl_getinfo/${after}`;

  let result = null;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const json = await res.json();
      const w = json?.input?.width;
      const h = json?.input?.height;
      if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
        result = { width: w, height: h };
      }
    }
  } catch {
    // Network hiccup — leave this image alone; a re-run will pick it up.
  }

  infoCache.set(src, result);
  return result;
}

// Resolves many URLs at once. fl_getinfo takes ~1s per image on a cold cache,
// so doing 200+ of them one at a time is pointlessly slow.
async function warmCache(srcs, concurrency = 12) {
  const queue = [...new Set(srcs)];
  let done = 0;
  const workers = Array.from({ length: concurrency }, async () => {
    for (;;) {
      const src = queue.shift();
      if (!src) return;
      await getDimensions(src);
      done++;
      if (done % 25 === 0) console.log(`  resolved ${done} image(s)...`);
    }
  });
  await Promise.all(workers);
}

async function main() {
  const notes = await prisma.note.findMany({
    select: { id: true, title: true, contentHtml: true },
  });

  // Pre-resolve every distinct image URL in parallel before touching notes.
  const allSrcs = notes.flatMap((n) =>
    [...(n.contentHtml ?? '').matchAll(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)]
      .map((m) => m[1]),
  );
  console.log(`Resolving ${new Set(allSrcs).size} distinct image URL(s)...`);
  await warmCache(allSrcs);

  let scanned = 0, already = 0, updated = 0, failed = 0, notesChanged = 0;

  for (const note of notes) {
    const html = note.contentHtml;
    if (!html || !html.includes('<img')) continue;

    const tags = [...html.matchAll(/<img\b[^>]*>/gi)].map(m => m[0]);
    const replacements = new Map();

    for (const tag of tags) {
      scanned++;

      if (/\bwidth\s*=/i.test(tag) && /\bheight\s*=/i.test(tag)) { already++; continue; }

      const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
      if (!srcMatch) { failed++; continue; }

      const dims = await getDimensions(srcMatch[1]);
      if (!dims) { failed++; continue; }

      // Insert the attributes just before the tag's closing bracket, leaving
      // everything the author wrote untouched.
      const stripped = tag.replace(/\s+(width|height)\s*=\s*["'][^"']*["']/gi, '');
      const close = stripped.endsWith('/>') ? '/>' : '>';
      const body = stripped.slice(0, stripped.length - close.length).trimEnd();
      replacements.set(tag, `${body} width="${dims.width}" height="${dims.height}"${close === '/>' ? ' />' : '>'}`);
      updated++;
    }

    if (replacements.size === 0) continue;

    let next = html;
    for (const [from, to] of replacements) next = next.split(from).join(to);

    if (next !== html) {
      notesChanged++;
      if (!DRY) {
        await prisma.note.update({ where: { id: note.id }, data: { contentHtml: next } });
      }
      console.log(`  ${DRY ? '[dry] ' : ''}${replacements.size} image(s) → ${note.title}`);
    }
  }

  console.log('\n' + (DRY ? 'DRY RUN — nothing written' : 'Backfill complete'));
  console.table({ scanned, alreadyHadDimensions: already, updated, failed, notesChanged });
}

main()
  .catch((err) => { console.error(err); process.exitCode = 1; })
  .finally(() => prisma.$disconnect());
