import { ImageResponse } from 'next/og';
import { siteConfig } from '@/lib/site';

export const size = {
  width: 1200,
  height: 630,
};

export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: '#ffffff',
          color: '#18181b',
          padding: '72px',
          fontFamily: 'Inter, Arial, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
          <div
            style={{
              width: '64px',
              height: '64px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '16px',
              background: '#18181b',
              color: '#ffffff',
              fontSize: '34px',
              fontWeight: 800,
            }}
          >
            C
          </div>
          <div style={{ fontSize: '34px', fontWeight: 800 }}>{siteConfig.name}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div style={{ maxWidth: '960px', fontSize: '72px', fontWeight: 850, lineHeight: 1 }}>
            CMT exam prep for technical analysis candidates
          </div>
          <div style={{ maxWidth: '880px', color: '#52525b', fontSize: '30px', lineHeight: 1.35 }}>
            Study notes, practice quizzes, chapter-wise revision, and analytics for CMT Level I, II, and III.
          </div>
        </div>

        <div style={{ color: '#71717a', fontSize: '24px' }}>{siteConfig.domain}</div>
      </div>
    ),
    size,
  );
}
