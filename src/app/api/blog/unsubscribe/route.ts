import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');

  if (!token) {
    return new NextResponse('Missing unsubscribe token.', { status: 400 });
  }

  try {
    await prisma.blogSubscriber.delete({ where: { unsubscribeToken: token } });
  } catch {
    // Already unsubscribed or invalid token — show success anyway
  }

  return new NextResponse(
    `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Unsubscribed</title>
    <style>body{font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb;}
    .box{text-align:center;padding:2rem;max-width:400px;}
    h1{font-size:1.5rem;color:#111;}p{color:#6b7280;margin-top:.5rem;}
    a{color:#047857;text-decoration:none;}</style></head>
    <body><div class="box">
    <h1>You have been unsubscribed.</h1>
    <p>You will no longer receive blog updates from Chartix.</p>
    <p style="margin-top:1.5rem"><a href="https://chartix.in">← Back to Chartix</a></p>
    </div></body></html>`,
    { status: 200, headers: { 'Content-Type': 'text/html' } }
  );
}
