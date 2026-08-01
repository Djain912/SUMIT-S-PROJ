'use client';

import type { Block, Slide, Theme } from '@/lib/studio/design';
import { SLIDE_H, SLIDE_W } from '@/lib/studio/design';

/**
 * One 1080x1350 carousel slide, rendered as real DOM so it can be exported
 * to PNG in the browser (no serverless screenshot service needed).
 */
export function StudioSlide({
  slide, theme, index, total, logoUrl, width = SLIDE_W, height = SLIDE_H,
}: {
  slide: Slide;
  theme: Theme;
  index: number;
  total: number;
  logoUrl?: string;
  width?: number;
  height?: number;
}) {
  // 16:9 canvases are much shorter - tighten padding and type so nothing clips.
  const wide = width > height;
  const scale = wide ? 0.78 : 1;
  const nb = !!slide.notebook;
  const ink = nb ? '#12212E' : theme.ink;
  const bodyColor = nb ? '#2C3E4C' : theme.body;
  const display = nb ? "'StudioHand', cursive" : "'StudioSerif', Georgia, serif";
  const sans = nb ? "'StudioHand', cursive" : "'StudioSans', system-ui, sans-serif";

  return (
    <div
      data-studio-slide={index}
      style={{
        position: 'relative',
        width,
        height,
        overflow: 'hidden',
        background: nb ? '#FBF7EE' : theme.paper,
        display: 'flex',
        flexDirection: 'column',
        padding: wide ? '54px 72px 48px' : '84px 84px 76px',
        fontFamily: sans,
        color: bodyColor,
        boxSizing: 'border-box',
      }}
    >
      {nb && (
        <>
          <div style={{
            position: 'absolute', inset: 0, zIndex: 0, opacity: 0.7,
            background: 'repeating-linear-gradient(to bottom,transparent 0 53px,#D3E0EC 53px 55px)',
          }} />
          <div style={{
            position: 'absolute', top: 0, bottom: 0, left: 56, width: 3,
            background: '#F0A9A6', opacity: 0.8, zIndex: 0,
          }} />
        </>
      )}

      {/* eyebrow */}
      <div style={{
        position: 'relative', zIndex: 2, display: 'flex',
        justifyContent: 'space-between', alignItems: 'center', marginBottom: 52,
      }}>
        <span style={{
          fontFamily: sans,
          fontWeight: nb ? 400 : 700,
          fontSize: nb ? 26 : 19,
          letterSpacing: nb ? 0 : 2.4,
          textTransform: nb ? 'none' : 'uppercase',
          color: nb ? '#fff' : theme.accent,
          background: nb ? '#12212E' : theme.soft,
          padding: '11px 24px',
          borderRadius: 100,
        }}>{slide.chip}</span>
        <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 20, color: theme.muted }}>
          {index} / {total}
        </span>
      </div>

      {/* body */}
      <div style={{
        position: 'relative', zIndex: 2, flex: 1, display: 'flex',
        flexDirection: 'column', justifyContent: 'center', gap: 30,
      }}>
        {slide.blocks.map((b, i) => (
          <BlockView key={i} block={b} theme={theme} nb={nb} ink={ink} display={display} sans={sans} scale={scale} />
        ))}
      </div>

      {/* footer */}
      <div style={{
        position: 'relative', zIndex: 2, display: 'flex',
        justifyContent: 'space-between', alignItems: 'flex-end',
        borderTop: `2px solid ${nb ? '#D3E0EC' : theme.line}`,
        paddingTop: 26, marginTop: 34,
      }}>
        {logoUrl
          ? (
            // Deliberately a plain <img>: next/image renders a wrapper + srcset that
            // html-to-image cannot rasterise into the exported PNG.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt="Chartix" style={{ width: 150, height: 'auto', display: 'block' }} />
          )
          : <span style={{ fontSize: 26, color: theme.muted, fontFamily: sans }}>chartix.in</span>}
        <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 21, color: theme.muted }}>
          {slide.hint ?? ''}
        </span>
      </div>
    </div>
  );
}

function BlockView({
  block, theme, nb, ink, display, sans, scale = 1,
}: {
  block: Block; theme: Theme; nb: boolean; ink: string; display: string; sans: string; scale?: number;
}) {
  const fs = (n: number) => Math.round(n * scale);
  switch (block.kind) {
    case 'rule':
      return <div style={{ width: 78, height: 5, background: theme.accent, borderRadius: 3 }} />;

    case 'image':
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18, minHeight: 0 }}>
          <div style={{
            borderRadius: 20, overflow: 'hidden',
            border: `2px solid ${theme.line}`,
            background: theme.dark ? '#0B0F14' : '#fff',
          }}>
            {/* data: URL from the admin's own upload - rasterises cleanly into the PNG */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.src} alt={block.caption ?? 'chart'}
              style={{ width: '100%', display: 'block', objectFit: 'contain' }} />
          </div>
          {block.caption ? (
            <p style={{
              margin: 0, fontSize: fs(27), lineHeight: 1.42,
              color: theme.body, fontStyle: 'italic',
            }}>{block.caption}</p>
          ) : null}
        </div>
      );

    case 'title':
      return <h1 style={{
        margin: 0, fontFamily: display, fontWeight: 400,
        fontSize: fs(nb ? 92 : 104), lineHeight: nb ? 1.02 : 0.94,
        letterSpacing: nb ? 0 : -3, color: ink,
      }}>{block.text}</h1>;

    case 'heading':
      return <h2 style={{
        margin: 0, fontFamily: display, fontWeight: 400,
        fontSize: fs(nb ? 62 : 66), lineHeight: 1.04,
        letterSpacing: nb ? 0 : -1.6, color: ink,
      }}>{block.text}</h2>;

    case 'big':
      return <div style={{
        fontFamily: display, fontWeight: 400, fontSize: fs(78), lineHeight: 1.06,
        letterSpacing: nb ? 0 : -2, color: ink,
      }}>{block.text}</div>;

    case 'lead':
      return <p style={{ margin: 0, fontSize: fs(36), lineHeight: 1.5, color: nb ? '#2C3E4C' : theme.body }}>
        {block.text}
      </p>;

    case 'panel': {
      const danger = block.tone === 'danger';
      return (
        <div style={{
          background: nb ? '#FFF3B0' : (danger ? (theme.dark ? '#2A1517' : '#FCEBEC') : theme.soft),
          borderRadius: nb ? 6 : 26,
          padding: '34px 38px',
          transform: nb ? 'rotate(-0.5deg)' : undefined,
          boxShadow: nb ? '6px 7px 0 rgba(0,0,0,.10)' : undefined,
        }}>
          <div style={{
            fontFamily: sans, fontWeight: nb ? 400 : 700, fontSize: 17,
            letterSpacing: 3, textTransform: 'uppercase',
            color: nb ? '#8A6D00' : (danger ? (theme.dark ? '#F08A90' : '#B3242B') : theme.accent),
            marginBottom: 12,
          }}>{block.label}</div>
          <div style={{
            fontFamily: nb ? display : sans, fontWeight: nb ? 400 : 600,
            fontSize: fs(31), lineHeight: 1.45, color: nb ? '#4A3B00' : ink,
          }}>{block.text}</div>
        </div>
      );
    }

    case 'steps':
      return (
        <div>
          {block.items.map((s, i) => (
            <div key={i} style={{
              display: 'flex', gap: 24, alignItems: 'flex-start', padding: '22px 0',
              borderBottom: i === block.items.length - 1 ? 'none' : `2px solid ${theme.line}`,
            }}>
              <div style={{
                fontFamily: display, fontSize: fs(44), lineHeight: 1,
                color: theme.accent, opacity: 0.5, minWidth: 56,
              }}>{String(i + 1).padStart(2, '0')}</div>
              <div>
                <div style={{
                  fontFamily: sans, fontWeight: 700, fontSize: 16, letterSpacing: 2.6,
                  textTransform: 'uppercase', color: theme.accent, marginBottom: 7,
                }}>{s.label}</div>
                <div style={{ fontSize: fs(29), lineHeight: 1.42, color: ink }}>{s.text}</div>
              </div>
            </div>
          ))}
        </div>
      );

    case 'ticks':
      return (
        <div>
          {block.items.map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 20, alignItems: 'flex-start', padding: '19px 0' }}>
              <span style={{
                fontFamily: sans, fontWeight: 700, fontSize: 29, lineHeight: 1.25,
                color: block.bad ? (theme.dark ? '#F08A90' : '#C0392B') : theme.accent, minWidth: 38,
              }}>{block.bad ? '✕' : '✓'}</span>
              <span style={{ fontSize: fs(29), lineHeight: 1.45, color: ink }}>{t}</span>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}
