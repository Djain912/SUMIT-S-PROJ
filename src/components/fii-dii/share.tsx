'use client';

import { useEffect, useRef, useState } from 'react';
import { Check, Copy, Download, Image as ImageIcon, Loader2, Share2 } from 'lucide-react';
import { siteConfig } from '@/lib/site';

const PAGE = '/tools/fii-dii';

export function shareLink(source: string, path = PAGE) {
  return `${siteConfig.url}${path}?utm_source=${source}&utm_medium=share&utm_campaign=fii-dii`;
}

/** Caption with the Chartix link appended (link tagged with where it was shared). */
function withLink(message: string, source: string, path?: string) {
  return `${message}\n\nFree daily FII & DII data → ${shareLink(source, path)}`;
}

// ── image: the captured element framed with a title and Chartix footer ──
const loadImg = (src: string) => new Promise<HTMLImageElement>((resolve, reject) => {
  const im = new Image();
  im.onload = () => resolve(im);
  im.onerror = reject;
  im.src = src;
});

async function buildImage(el: HTMLElement, title: string, subtitle: string): Promise<Blob> {
  const { toCanvas } = await import('html-to-image');
  const shot = await toCanvas(el, {
    pixelRatio: 2,
    backgroundColor: '#ffffff',
    filter: (n) => !(n instanceof HTMLElement && n.dataset.shareIgnore !== undefined),
  });
  const serif = getComputedStyle(document.querySelector('h1') ?? document.body).fontFamily;
  const sans = getComputedStyle(document.body).fontFamily;
  const S = 2;
  const pad = 32 * S;
  const head = 92 * S;
  const foot = 64 * S;
  const W = shot.width + pad * 2;
  const H = head + shot.height + foot;
  const c = document.createElement('canvas');
  c.width = W; c.height = H;
  const g = c.getContext('2d')!;
  g.fillStyle = '#FAFAF8';
  g.fillRect(0, 0, W, H);

  g.fillStyle = '#065F46';
  g.font = `500 ${11 * S}px ${sans}`;
  g.fillText('FII & DII DATA', pad, 36 * S);
  g.fillStyle = '#1C1917';
  g.font = `${26 * S}px ${serif}`;
  g.fillText(title, pad, 66 * S);
  g.fillStyle = '#78716C';
  g.font = `${13 * S}px ${sans}`;
  g.fillText(subtitle, pad, 84 * S);

  g.drawImage(shot, pad, head);
  g.strokeStyle = '#E7E5E0';
  g.lineWidth = S;
  g.strokeRect(pad, head, shot.width, shot.height);

  const fy = head + shot.height + 22 * S;
  try {
    const logo = await loadImg('/chartix-wordmark.png');
    const lh = 24 * S;
    g.drawImage(logo, pad, fy, lh * (logo.width / logo.height), lh);
  } catch { /* text footer still carries the brand */ }
  g.fillStyle = '#57534E';
  g.font = `500 ${13 * S}px ${sans}`;
  g.textAlign = 'right';
  g.fillText('Free daily FII & DII data · chartix.in/tools/fii-dii', W - pad, fy + 16 * S);

  return new Promise((resolve, reject) => c.toBlob((b) => (b ? resolve(b) : reject(new Error('no image'))), 'image/png'));
}

type Props = {
  /** Caption (without link) — the Chartix link is appended automatically. */
  message: string;
  /** Element id to turn into an image. Omit for text-only sharing. */
  targetId?: string;
  imageTitle?: string;
  imageSubtitle?: string;
  fileName?: string;
  path?: string;
  label?: string;
  variant?: 'primary' | 'quiet';
};

export function ShareButton({ message, targetId, imageTitle = 'FII & DII flows', imageSubtitle = '', fileName = 'chartix-fii-dii', path, label = 'Share', variant = 'quiet' }: Props) {
  const [open, setOpen] = useState(false);
  const [img, setImg] = useState<Blob | null>(null);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const box = useRef<HTMLDivElement | null>(null);
  const canNative = typeof navigator !== 'undefined' && !!navigator.share;

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (box.current && !box.current.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('mousedown', close); document.removeEventListener('keydown', esc); };
  }, [open]);

  // Render the image as soon as the menu opens, so the share tap itself stays instant
  // (mobile browsers only allow the share sheet straight after a tap).
  useEffect(() => {
    if (!open || !targetId || img || busy || failed) return;
    const el = document.getElementById(targetId);
    if (!el) return;
    setBusy(true);
    const timeout = new Promise<never>((_, reject) => setTimeout(() => reject(new Error('timeout')), 15000));
    Promise.race([buildImage(el, imageTitle, imageSubtitle), timeout])
      .then(setImg)
      .catch(() => setFailed(true))
      .finally(() => setBusy(false));
  }, [open, targetId, img, busy, failed, imageTitle, imageSubtitle]);

  const flash = (msg: string) => { setDone(msg); setTimeout(() => setDone(null), 2200); };
  const copy = async (text: string) => { try { await navigator.clipboard.writeText(text); return true; } catch { return false; } };
  const openUrl = (url: string) => { window.open(url, '_blank', 'noopener,noreferrer'); setOpen(false); };

  const download = () => {
    if (!img) return;
    const url = URL.createObjectURL(img);
    const a = document.createElement('a');
    a.href = url; a.download = `${fileName}.png`; a.click();
    URL.revokeObjectURL(url);
  };

  const shareImage = async () => {
    if (!img) return;
    const caption = withLink(message, 'image', path);
    const file = new File([img], `${fileName}.png`, { type: 'image/png' });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file], text: caption, title: 'Chartix — FII & DII data' }); setOpen(false); return; } catch { return; }
    }
    download();
    await copy(caption);
    flash('Image saved · caption copied');
  };

  const shareNativeText = async () => {
    try { await navigator.share({ text: withLink(message, 'native', path), title: 'Chartix — FII & DII data' }); setOpen(false); } catch { /* cancelled */ }
  };

  const item = 'flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[14px] text-stone-700 transition hover:bg-stone-50 hover:text-stone-900 disabled:opacity-40';
  const btn = variant === 'primary'
    ? 'inline-flex items-center gap-2 rounded-full bg-emerald-800 px-4 py-2 text-[13.5px] font-medium text-white transition hover:bg-emerald-900'
    : 'inline-flex items-center gap-1.5 rounded-full border border-stone-200 bg-white px-3 py-1.5 text-[13px] text-stone-600 transition hover:border-stone-400 hover:text-stone-900';

  return (
    <div ref={box} className="relative inline-block" data-share-ignore>
      <button type="button" onClick={() => setOpen((v) => !v)} className={btn} aria-expanded={open} aria-haspopup="menu">
        <Share2 className="h-3.5 w-3.5" /> {label}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 z-50 mt-2 w-64 rounded-xl border border-stone-200 bg-white p-1.5 shadow-[0_8px_30px_rgba(28,25,23,0.10)]">
          {targetId && failed && (
            <p className="px-3 py-2.5 text-[13px] text-stone-400">Image unavailable — share the text below.</p>
          )}
          {targetId && !failed && <>
            <button type="button" role="menuitem" className={item} disabled={!img} onClick={shareImage}>
              {busy || !img ? <Loader2 className="h-4 w-4 animate-spin text-stone-400" /> : <ImageIcon className="h-4 w-4 text-stone-400" />}
              {busy || !img ? 'Preparing image…' : canNative ? 'Share as image' : 'Save image + copy caption'}
            </button>
            {canNative && (
              <button type="button" role="menuitem" className={item} disabled={!img} onClick={() => { download(); setOpen(false); }}>
                <Download className="h-4 w-4 text-stone-400" /> Download image
              </button>
            )}
            <div className="my-1 h-px bg-stone-100" />
          </>}
          {canNative && (
            <button type="button" role="menuitem" className={item} onClick={shareNativeText}>
              <Share2 className="h-4 w-4 text-stone-400" /> Share text…
            </button>
          )}
          <button type="button" role="menuitem" className={item} onClick={() => openUrl(`https://wa.me/?text=${encodeURIComponent(withLink(message, 'whatsapp', path))}`)}>
            <span className="w-4 text-center text-[12px] font-semibold text-stone-400">W</span> WhatsApp
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => openUrl(`https://twitter.com/intent/tweet?text=${encodeURIComponent(withLink(message, 'x', path))}`)}>
            <span className="w-4 text-center text-[12px] font-semibold text-stone-400">X</span> X (Twitter)
          </button>
          <button type="button" role="menuitem" className={item} onClick={() => openUrl(`https://t.me/share/url?url=${encodeURIComponent(shareLink('telegram', path))}&text=${encodeURIComponent(message)}`)}>
            <span className="w-4 text-center text-[12px] font-semibold text-stone-400">T</span> Telegram
          </button>
          <button type="button" role="menuitem" className={item} onClick={async () => { if (await copy(withLink(message, 'copy', path))) flash('Copied to clipboard'); }}>
            {done ? <Check className="h-4 w-4 text-emerald-700" /> : <Copy className="h-4 w-4 text-stone-400" />} {done ?? 'Copy text'}
          </button>
        </div>
      )}
    </div>
  );
}
