import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AuthError, requireAdminUser } from '@/server/policies/auth';
import { systemPrompt, userPrompt } from '@/lib/studio/prompts';
import type { AudienceKey, PlatformKey } from '@/lib/studio/design';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// POST /api/admin/studio/generate  { day, topic }
export async function POST(request: Request) {
  try {
    await requireAdminUser();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: { message: 'OPENAI_API_KEY is not configured on the server.' } },
        { status: 500 },
      );
    }

    const body = await request.json();
    const day = Number(body?.day);
    const topic = typeof body?.topic === 'string' ? body.topic.trim() : '';
    const audience: AudienceKey = body?.audience === 'expert' ? 'expert' : 'beginner';
    const allowedPlatforms = ['instagram', 'linkedin', 'twitter', 'reddit'] as const;
    const platform: PlatformKey = allowedPlatforms.includes(body?.platform)
      ? body.platform : 'instagram';
    const brief: string = typeof body?.brief === 'string' ? body.brief.slice(0, 4000) : '';
    const chartCaptions: string[] = Array.isArray(body?.chartCaptions)
      ? body.chartCaptions.filter((c: unknown) => typeof c === 'string').slice(0, 8)
      : [];

    if (!Number.isFinite(day) || day < 1 || !topic) {
      return NextResponse.json(
        { success: false, error: { message: 'A valid day number and topic are required.' } },
        { status: 400 },
      );
    }

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: audience === 'expert' ? 0.6 : 0.75,
      max_tokens: platform === 'reddit' ? 2200 : 1600,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: systemPrompt(audience) },
        { role: 'user', content: userPrompt(day, topic, audience, platform, brief, chartCaptions) },
      ],
    });

    const raw = response.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json(
        { success: false, error: { message: 'The model returned an empty response. Try again.' } },
        { status: 502 },
      );
    }

    let content: unknown;
    try {
      content = JSON.parse(raw);
    } catch {
      return NextResponse.json(
        { success: false, error: { message: 'The model returned invalid JSON. Try again.' } },
        { status: 502 },
      );
    }

    return NextResponse.json({ success: true, data: content });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: error.message } },
        { status: error.statusCode },
      );
    }
    const message = error instanceof Error ? error.message : 'Unexpected error';
    console.error('[studio/generate] error:', error);
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
