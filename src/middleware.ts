import { NextResponse, type NextRequest } from 'next/server';
import { decode } from 'next-auth/jwt';

function applySecurityHeaders(res: NextResponse) {
  // SAMEORIGIN (not DENY): our own tools (index-builder, fii-dii) render in
  // same-origin iframes; other sites still cannot embed Chartix pages.
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  return res;
}

// AI/LLM crawlers and scraping tools — hard-blocked (robots.txt is only a
// polite request; this actually refuses them). Search engines (Googlebot,
// Bingbot) and link-preview bots (WhatsApp, Twitter, LinkedIn) stay allowed.
const BLOCKED_UA_RE = new RegExp(
  [
    // AI training / answer-engine crawlers
    'GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'Claude-Web',
    'anthropic-ai', 'CCBot', 'Google-Extended', 'Applebot-Extended',
    'PerplexityBot', 'Bytespider', 'Amazonbot', 'meta-externalagent',
    'FacebookBot', 'Diffbot', 'omgili', 'ImagesiftBot', 'cohere-ai',
    'Timpibot', 'YouBot', 'AI2Bot', 'PetalBot',
    // Generic scraping libraries / headless tools
    'Scrapy', 'python-requests', 'python-urllib', 'aiohttp', 'httpx',
    'Go-http-client', 'Java/', 'libwww-perl', 'PhantomJS', 'HeadlessChrome',
    'node-fetch', 'axios/', 'curl/', 'Wget',
  ].join('|'),
  'i',
);

function getSessionToken(request: NextRequest): string | undefined {
  const plain = request.cookies.get('authjs.session-token')?.value;
  if (plain) return plain;
  const chunks: string[] = [];
  for (let i = 0; i < 10; i++) {
    const chunk = request.cookies.get(`authjs.session-token.${i}`)?.value;
    if (!chunk) break;
    chunks.push(chunk);
  }
  return chunks.length > 0 ? chunks.join('') : undefined;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Refuse known scrapers and AI crawlers on every route
  const ua = request.headers.get('user-agent') ?? '';
  if (BLOCKED_UA_RE.test(ua)) {
    return new NextResponse('Access denied', { status: 403 });
  }

  // /admin/login is public — always allow
  if (pathname === '/admin/login' || pathname.startsWith('/admin/login/')) {
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  const isAdminRoute = pathname === '/admin' || pathname.startsWith('/admin/');
  const isUserRoute = pathname === '/user' || pathname.startsWith('/user/');

  if (!isAdminRoute && !isUserRoute) {
    return applySecurityHeaders(NextResponse.next({ request }));
  }

  // Decode JWT — no DB call, pure cookie read
  const rawToken = getSessionToken(request);
  let token: { role?: string } | null = null;
  if (rawToken) {
    try {
      token = await decode({
        token: rawToken,
        secret: process.env.AUTH_SECRET!,
        salt: 'authjs.session-token',
      }) as { role?: string };
    } catch {
      token = null;
    }
  }

  // Not logged in → send to sign-in
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    url.searchParams.set('next', pathname);
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  // Non-admin on admin route → send to sign-in
  if (isAdminRoute && token.role !== 'ADMIN') {
    const url = request.nextUrl.clone();
    url.pathname = '/sign-in';
    return applySecurityHeaders(NextResponse.redirect(url));
  }

  return applySecurityHeaders(NextResponse.next({ request }));
}

export const config = {
  // Run on every page and API route (bot blocking + headers), skipping only
  // Next.js internals and static assets.
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|svg|ico|webp|woff2?|css|js|map)$).*)',
  ],
};
