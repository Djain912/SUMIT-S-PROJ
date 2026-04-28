export function validateCsrfOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  const host = request.headers.get('host');

  if (!origin || !host) {
    // Same-origin requests from the browser always send Origin.
    // If both are missing it's likely a server-to-server call — allow.
    return true;
  }

  try {
    const originUrl = new URL(origin);
    // Allow same host
    if (originUrl.host === host) return true;
    // Allow localhost in development
    if (process.env.NODE_ENV === 'development' && originUrl.hostname === 'localhost') return true;
    return false;
  } catch {
    return false;
  }
}
