import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';
export const alt = 'Chartix Custom Index Builder — build your own stock index, free';

// Heights for a faux "rising index" bar chart (advertises what the tool does).
const BARS = [70, 95, 82, 130, 110, 165, 140, 205, 180, 240];

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
          background: 'linear-gradient(135deg, #ecfdf5 0%, #ffffff 55%)',
          color: '#064e3b',
          padding: '64px 72px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logo} width={64} height={64} alt="Chartix" style={{ borderRadius: '14px' }} />
            <div style={{ fontSize: '34px', fontWeight: 800, color: '#064e3b' }}>Chartix</div>
          </div>
          <div
            style={{
              display: 'flex',
              fontSize: '22px',
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

        {/* Headline + chart */}
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: '40px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ maxWidth: '640px', fontSize: '70px', fontWeight: 850, lineHeight: 1.02, color: '#064e3b' }}>
              Build Your Own Stock Index
            </div>
            <div style={{ maxWidth: '600px', fontSize: '28px', lineHeight: 1.3, color: '#52525b' }}>
              Market-cap &amp; equal-weight index builder · 4,900+ NSE/BSE stocks · charts, CAGR &amp; drawdown.
            </div>
          </div>

          {/* Rising bar chart */}
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: '12px', height: '260px' }}>
            {BARS.map((h, i) => (
              <div
                key={i}
                style={{
                  width: '34px',
                  height: `${h}px`,
                  borderRadius: '8px 8px 0 0',
                  background: i === BARS.length - 1 ? '#059669' : '#34d399',
                }}
              />
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', color: '#059669', fontSize: '26px', fontWeight: 700 }}>
          chartix.in/tools/index-builder
        </div>
      </div>
    ),
    size,
  );
}
