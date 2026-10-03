const rawSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://chartix.in';

function normalizeSiteUrl(url: string) {
  const withProtocol = /^https?:\/\//i.test(url) ? url : `https://${url}`;
  return withProtocol.replace(/\/+$/, '');
}

const normalizedSiteUrl = normalizeSiteUrl(rawSiteUrl);

export const siteConfig = {
  name: 'Chartix',
  domain: normalizedSiteUrl.replace(/^https?:\/\//i, ''),
  url: normalizedSiteUrl,
  title: 'Chartix — CMT Exam Prep & Coaching | Notes, Questions & Mock Tests',
  description:
    'Chartix is a CMT Association Participating Prep Provider. Prepare for CMT Level I, II & III with structured notes, 3,500+ practice questions, mock tests, AI analytics, and an AI tutor.',
  keywords: [
    'Chartix',
    'CMT exam prep',
    'CMT coaching',
    'CMT classes',
    'CMT classes online',
    'CMT prep provider',
    'CMT Level 1 preparation',
    'CMT Level 2 preparation',
    'CMT Level 3 preparation',
    'CMT Level I preparation',
    'CMT Level II preparation',
    'CMT Level III preparation',
    'CMT study material',
    'CMT practice questions',
    'CMT mock test',
    'CMT exam questions',
    'Chartered Market Technician study notes',
    'Chartered Market Technician coaching',
    'technical analysis course',
    'technical analysis exam preparation',
    'technical analysis classes',
    'technical analysis online course',
    'CMT exam preparation India',
    'best CMT prep provider',
    'CMT notes',
    'CMT question bank',
  ],
};
