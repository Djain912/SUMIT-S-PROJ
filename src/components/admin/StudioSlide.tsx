'use client';

import type { Block, Slide, Theme } from '@/lib/studio/design';
import { SLIDE_H, SLIDE_W } from '@/lib/studio/design';

/**
 * One 1080x1350 carousel slide, rendered as real DOM so it can be exported
 * to PNG in the browser (no serverless screenshot service needed).
 */
export function StudioSlide({
  slide, theme, index, total, logoUrl,
}: {
  slide: Slide;
  theme: Theme;
  index: number;
  total: number;
  logoUrl?: string;
}) {
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
        width: SLIDE_W,
        height: SLIDE_H,
        overflow: 'hidden',
        background: nb ? '#FBF7EE' : theme.paper,
        display: 'flex',
        flexDirection: 'column',
        padding: '84px 84px 76px',
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
        <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 20, color: '#A8B2BD' }}>
          {index} / {total}
        </span>
      </div>

      {/* body */}
      <div style={{
        position: 'relative', zIndex: 2, flex: 1, display: 'flex',
        flexDirection: 'column', justifyContent: 'center', gap: 30,
      }}>
        {slide.blocks.map((b, i) => (
          <BlockView key={i} block={b} theme={theme} nb={nb} ink={ink} display={display} sans={sans} />
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
          : <span style={{ fontSize: 26, color: '#8A99A8', fontFamily: sans }}>chartix.in</span>}
        <span style={{ fontFamily: sans, fontWeight: 500, fontSize: 21, color: '#A8B2BD' }}>
          {slide.hint ?? ''}
        </span>
      </div>
    </div>
  );
}

function BlockView({
  block, theme, nb, ink, display, sans,
}: {
  block: Block; theme: Theme; nb: boolean; ink: string; display: string; sans: string;
}) {
  switch (block.kind) {
    case 'rule':
      return <div style={{ width: 78, height: 5, background: theme.accent, borderRadius: 3 }} />;

    case 'title':
      return <h1 style={{
        margin: 0, fontFamily: display, fontWeight: 400,
        fontSize: nb ? 92 : 104, lineHeight: nb ? 1.02 : 0.94,
        letterSpacing: nb ? 0 : -3, color: ink,
      }}>{block.text}</h1>;

    case 'heading':
      return <h2 style={{
        margin: 0, fontFamily: display, fontWeight: 400,
        fontSize: nb ? 62 : 66, lineHeight: 1.04,
        letterSpacing: nb ? 0 : -1.6, color: ink,
      }}>{block.text}</h2>;

    case 'big':
      return <div style={{
        fontFamily: display, fontWeight: 400, fontSize: 78, lineHeight: 1.06,
        letterSpacing: nb ? 0 : -2, color: ink,
      }}>{block.text}</div>;

    case 'lead':
      return <p style={{ margin: 0, fontSize: 36, lineHeight: 1.5, color: nb ? '#2C3E4C' : theme.body }}>
        {block.text}
      </p>;

    case 'panel': {
      const danger = block.tone === 'danger';
      return (
        <div style={{
          background: nb ? '#FFF3B0' : (danger ? '#FCEBEC' : theme.soft),
          borderRadius: nb ? 6 : 26,
          padding: '34px 38px',
          transform: nb ? 'rotate(-0.5deg)' : undefined,
          boxShadow: nb ? '6px 7px 0 rgba(0,0,0,.10)' : undefined,
        }}>
          <div style={{
            fontFamily: sans, fontWeight: nb ? 400 : 700, fontSize: 17,
            letterSpacing: 3, textTransform: 'uppercase',
            color: nb ? '#8A6D00' : (danger ? '#B3242B' : theme.accent),
            marginBottom: 12,
          }}>{block.label}</div>
          <div style={{
            fontFamily: nb ? display : sans, fontWeight: nb ? 400 : 600,
            fontSize: 31, lineHeight: 1.45, color: nb ? '#4A3B00' : ink,
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
                fontFamily: display, fontSize: 44, lineHeight: 1,
                color: theme.accent, opacity: 0.5, minWidth: 56,
              }}>{String(i + 1).padStart(2, '0')}</div>
              <div>
                <div style={{
                  fontFamily: sans, fontWeight: 700, fontSize: 16, letterSpacing: 2.6,
                  textTransform: 'uppercase', color: theme.accent, marginBottom: 7,
                }}>{s.label}</div>
                <div style={{ fontSize: 29, lineHeight: 1.42, color: ink }}>{s.text}</div>
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
                color: block.bad ? '#C0392B' : theme.accent, minWidth: 38,
              }}>{block.bad ? '✕' : '✓'}</span>
              <span style={{ fontSize: 29, lineHeight: 1.45, color: ink }}>{t}</span>
            </div>
          ))}
        </div>
      );

    default:
      return null;
  }
}
