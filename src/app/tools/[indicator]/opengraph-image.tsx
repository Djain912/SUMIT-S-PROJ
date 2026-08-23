import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

const NAMES: Record<string, string> = {
  roc: 'Rate of Change (ROC)',
  macd: 'MACD',
  rsi: 'RSI',
  stochastics: 'Stochastics',
  adl: 'Accumulation / Distribution',
  mfi: 'Money Flow Index',
  ppo: 'PPO',
  dmi: 'DMI / ADX',
  obv: 'On Balance Volume',
  cmf: 'Chaikin Money Flow',
  rvol: 'Relative Volume',
  sma: 'Simple Moving Average',
  ema: 'Exponential Moving Average',
  lwma: 'Linearly Weighted Moving Average',
  wilderma: 'Wilder Moving Average',
  distma: 'Distance from MA (%)',
  bb: 'Bollinger Bands®',
};

// Faux oscillator bars — generic enough to suit any indicator
const BARS = [38, 52, 61, 74, 68, 55, 44, 36, 42, 58, 67, 72, 65, 53, 46];
// Faux price line (normalised 0–1)
const PRICE = [0.35, 0.42, 0.50, 0.61, 0.57, 0.47, 0.40, 0.34, 0.39, 0.46, 0.54, 0.63, 0.70, 0.66, 0.58];

const CHART_W = 310;
const CHART_H = 110;

function pricePolyline(): string {
  return PRICE.map((v, i) => {
    const x = (i / (PRICE.length - 1)) * CHART_W;
    const y = CHART_H - v * CHART_H;
    return `${x},${y}`;
  }).join(' ');
}

export default async function OpenGraphImage({ params }: { params: Promise<{ indicator: string }> }) {
  const { indicator } = await params;
  const name = NAMES[indicator] ?? indicator.toUpperCase();

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
          background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 55%)',
          padding: '56px 72px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={56} height={56} alt="Chartix" style={{ borderRadius: '12px' }} />
            <div style={{ fontSize: '30px', fontWeight: 800, color: '#064e3b' }}>Chartix</div>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '19px',
              fontWeight: 700,
              color: '#047857',
              background: '#d1fae5',
              border: '2px solid #6ee7b7',
              padding: '7px 18px',
              borderRadius: '999px',
            }}
          >
            FREE · NO LOGIN
          </div>
        </div>

        {/* Body */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '36px' }}>

          {/* Left — text */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#059669', letterSpacing: '0.06em', textTransform: 'uppercase' }}>
              🔬 Indicator Lab
            </div>
            <div style={{ maxWidth: '640px', fontSize: '66px', fontWeight: 850, lineHeight: 1.04, color: '#064e3b' }}>
              {name}
            </div>
            <div style={{ maxWidth: '580px', fontSize: '26px', lineHeight: 1.35, color: '#52525b' }}>
              Live chart · Step-by-step calculation · How professionals use it
            </div>
          </div>

          {/* Right — charts */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '340px' }}>

            {/* Price line */}
            <div
              style={{
                background: '#f0fdf4',
                border: '1.5px solid #bbf7d0',
                borderRadius: '12px',
                padding: '12px 14px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', fontSize: '12px', fontWeight: 700, color: '#047857', letterSpacing: '0.05em' }}>PRICE</div>
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

            {/* Indicator oscillator bars */}
            <div
              style={{
                background: '#eff6ff',
                border: '1.5px solid #bfdbfe',
                borderRadius: '12px',
                padding: '12px 14px 8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '4px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#1d4ed8', letterSpacing: '0.05em' }}>{indicator.toUpperCase()}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: '5px', height: '48px' }}>
                {BARS.map((v, i) => (
                  <div
                    key={i}
                    style={{
                      flex: 1,
                      height: `${(v / 100) * 48}px`,
                      borderRadius: '3px 3px 0 0',
                      background: v >= 70 ? '#ef4444' : v <= 30 ? '#22c55e' : '#60a5fa',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', color: '#059669', fontSize: '22px', fontWeight: 700 }}>
          chartix.in/tools/{indicator}
        </div>
      </div>
    ),
    size,
  );
}
