function getAllowedOrigins(): Set<string> {
  const configured = (process.env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);

  const defaults = [
    process.env.NEXT_PUBLIC_SITE_URL,
    'https://chartix.in',
    'https://www.chartix.in',
    'https://sumitsproj.vercel.app',
  ]
    .filter(Boolean)
    .map((value) => value!.replace(/\/+$/, '').toLowerCase());

  return new Set([...configured, ...defaults]);
}

export function validateCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) {
    return true;
  }

  try {
    const originUrl = new URL(origin);

    if (originUrl.host === host) return true;

    if (process.env.NODE_ENV === 'development' && originUrl.hostname === 'localhost') return true;

    const allowedOrigins = getAllowedOrigins();
    return allowedOrigins.has(originUrl.origin.toLowerCase());
  } catch {
    return false;
  }
}
