import { ImageResponse } from 'next/og';

export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';
export const runtime = 'nodejs';

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={72} height={72} alt="Chartix" style={{ borderRadius: '16px' }} />
          <div style={{ fontSize: '36px', fontWeight: 800, color: '#064e3b' }}>Chartix</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '980px', fontSize: '70px', fontWeight: 850, lineHeight: 1.05 }}>
            <span style={{ color: '#064e3b' }}>Pass your CMT exam.&nbsp;</span>
            <span style={{ color: '#059669' }}>Study smarter.</span>
          </div>
          <div style={{ maxWidth: '900px', color: '#52525b', fontSize: '30px', lineHeight: 1.35 }}>
            Study notes, 10,000+ practice quizzes, performance analytics, and an AI tutor for CMT Level I, II &amp; III.
          </div>
        </div>

        <div style={{ display: 'flex', color: '#059669', fontSize: '26px', fontWeight: 700 }}>chartix.in</div>
      </div>
    ),
    size,
  );
}
