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
  title: 'Chartix - CMT Exam Prep, Technical Analysis Notes & Practice Quizzes',
  description:
    'Chartix helps CMT candidates master technical analysis with structured study notes, chapter-wise practice quizzes, exam analytics, and focused revision for CMT Level I, II, and III.',
  keywords: [
    'Chartix',
    'CMT exam prep',
    'CMT Level I preparation',
    'CMT Level II preparation',
    'CMT Level III preparation',
    'technical analysis course',
    'technical analysis exam preparation',
    'chart reading practice',
    'trading psychology notes',
    'market analysis quizzes',
    'Chartered Market Technician study notes',
    'CMT practice questions',
  ],
};
