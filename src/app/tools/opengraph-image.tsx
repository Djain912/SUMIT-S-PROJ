import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';
export const alt = 'Chartix Indicator Lab — free interactive RSI, MACD, Bollinger Bands calculators';

// Faux RSI-style oscillator values (0–100 range)
const RSI_BARS = [42, 55, 61, 74, 70, 58, 49, 38, 30, 44, 52, 63, 72, 68, 55];
// Faux price line points (normalised 0–1)
const PRICE = [0.38, 0.44, 0.51, 0.62, 0.58, 0.49, 0.42, 0.36, 0.40, 0.47, 0.55, 0.64, 0.72, 0.68, 0.60];

const CHART_W = 340;
const CHART_H = 130;

function pricePolyline(): string {
  return PRICE.map((v, i) => {
    const x = (i / (PRICE.length - 1)) * CHART_W;
    const y = CHART_H - v * CHART_H;
    return `${x},${y}`;
  }).join(' ');
}

export default async function OpenGraphImage() {
  const buf = await fetch('https://chartix.in/chartix-icon.png').then((r) => r.arrayBuffer());
  const logo = `data:image/png;base64,${Buffer.from(buf).toString('base64')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 60%)',
          padding: '60px 72px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={60} height={60} alt="Chartix" style={{ borderRadius: '14px' }} />
            <div style={{ fontSize: '32px', fontWeight: 800, color: '#064e3b' }}>Chartix</div>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '20px',
              fontWeight: 700,
              color: '#047857',
              background: '#d1fae5',
              border: '2px solid #6ee7b7',
              padding: '8px 20px',
              borderRadius: '999px',
            }}
          >
            FREE · NO LOGIN
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '40px' }}>

          {/* Left — headline */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: '#059669', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              🔬 Indicator Lab
            </div>
            <div style={{ maxWidth: '620px', fontSize: '64px', fontWeight: 850, lineHeight: 1.04, color: '#064e3b' }}>
              Build every indicator. See the exact math.
            </div>
            <div style={{ maxWidth: '580px', fontSize: '27px', lineHeight: 1.35, color: '#52525b' }}>
              RSI · MACD · Bollinger Bands · Stochastics · OBV · ADX · 11 more — live chart + step-by-step formula
            </div>
          </div>

          {/* Right — indicator visuals */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', minWidth: '360px' }}>

            {/* Price line chart */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #bbf7d0',
                borderRadius: '14px',
                padding: '14px 16px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '13px', fontWeight: 700, color: '#047857', letterSpacing: '0.05em' }}>PRICE</div>
              <svg width={CHART_W} height={CHART_H} style={{ display: 'block' }}>
                <polyline
                  points={pricePolyline()}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3"
                  strokeLinejoin="round"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            {/* RSI oscillator */}
            <div
              style={{
                background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '14px',
                padding: '14px 16px 10px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.05em' }}>RSI (14)</div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#dc2626' }}>68.4</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '52px' }}>
                {RSI_BARS.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${(v / 100) * 52}px`,
                      borderRadius: '3px 3px 0 0',
                      background: v >= 70 ? '#ef4444' : v <= 30 ? '#22c55e' : '#60a5fa',
                    }}
                  />
                ))}
              </div>
              {/* Overbought line hint */}
              <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '11px', color: '#ef4444', fontWeight: 600 }}>
                70 — overbought
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', color: '#059669', fontSize: '24px', fontWeight: 700 }}>
          chartix.in/tools
        </div>
      </div>
    ),
    size,
  );
}
