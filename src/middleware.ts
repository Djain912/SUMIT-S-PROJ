import { NextResponse, type NextRequest } from 'next/server';
import { decode } from 'next-auth/jwt';

// Flip to false to ENFORCE the policy (blocks violations) instead of only
// reporting them. Keep it true until the browser console shows no legitimate
// violations on checkout, the chart tools, and sign-in — then enforce.
const CSP_REPORT_ONLY = true;

// Content-Security-Policy. Allowlists every external origin the app actually
// loads: Razorpay checkout (payments), Cloudinary (media), Google Fonts, and
// the chart-library CDNs used by the static tool pages (index-builder, fii-dii).
// 'unsafe-inline'/'unsafe-eval' on scripts are required by Next.js hydration
// and the inline-heavy static tool files; the DOMPurify layer is the primary
// XSS defence, this CSP is defence-in-depth (locks down script/frame/connect
// ORIGINS, object-src, base-uri, form-action).
function buildCsp(): string {
  return [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://cdnjs.cloudflare.com https://unpkg.com https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
    "font-src 'self' data: https://fonts.gstatic.com",
    "img-src 'self' data: blob: https:",
    "connect-src 'self' https://api.cloudinary.com https://*.razorpay.com https://query1.finance.yahoo.com https://*.yahoo.com",
    "frame-src 'self' https://api.razorpay.com https://checkout.razorpay.com",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'self'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function applySecurityHeaders(res: NextResponse) {
  // SAMEORIGIN (not DENY): our own tools (index-builder, fii-dii) render in
  // same-origin iframes; other sites still cannot embed Chartix pages.
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.headers.set(
    CSP_REPORT_ONLY ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy',
    buildCsp(),
  );
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

// NextAuth names the session cookie "__Secure-authjs.session-token" on HTTPS
// (production) and "authjs.session-token" on plain HTTP (localhost). The salt
// used to decrypt the JWT must equal the cookie name, so return both.
function getSessionToken(request: NextRequest): { token: string; salt: string } | null {
  for (const name of ['__Secure-authjs.session-token', 'authjs.session-token']) {
    const plain = request.cookies.get(name)?.value;
    if (plain) return { token: plain, salt: name };
    const chunks: string[] = [];
    for (let i = 0; i < 10; i++) {
      const chunk = request.cookies.get(`${name}.${i}`)?.value;
      if (!chunk) break;
      chunks.push(chunk);
    }
    if (chunks.length > 0) return { token: chunks.join(''), salt: name };
  }
  return null;
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
  const session = getSessionToken(request);
  let token: { role?: string } | null = null;
  if (session) {
    try {
      token = await decode({
        token: session.token,
        secret: process.env.AUTH_SECRET!,
        salt: session.salt,
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
