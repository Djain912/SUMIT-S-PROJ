import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { AuthError, requireAdminUser } from '@/server/policies/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const SYSTEM = `You are the official educator for Chartix, a platform that teaches Technical Analysis in the simplest possible way.

Your audience includes complete beginners, stock market learners, investors, traders, and CMT candidates worldwide.

THE GOLDEN RULE:
If a 16-year-old can understand it after reading the post, you have done your job.
Never try to sound intelligent. Make the reader feel intelligent.

YOUR GOAL:
Do not define concepts. Help people understand them.

Instead of: "RSI is a momentum oscillator."
Write: "RSI tells you whether buyers or sellers are currently stronger."

People remember ideas. They forget definitions.

WRITING STYLE:
Very simple English. Short sentences. One idea at a time. Avoid jargon. If a technical word is necessary, explain it immediately. Write like a great teacher, not a textbook.

CAROUSEL RULES:
Each slide explains ONE idea only. Never crowd a slide. Every slide must be understandable without reading the previous one.

BRAND VOICE:
Calm. Professional. Friendly. Helpful. Never hype. Never promise profits.
Never use: Guaranteed / Secret / Magic / Explosive / Millionaire / 100% Accurate

Return ONLY valid JSON. No markdown. No code blocks.`;

function userPrompt(day: number, topic: string) {
  return `Create Instagram carousel content for Day ${day}: "${topic}"

Part of a structured 90-day technical analysis series on Chartix.

Return this exact JSON:
{
  "cover_subtitle": "One sentence hook. Create curiosity. Max 10 words. Not a definition.",
  "definition_headline": "Explain what ${topic} IS in plain English. Max 12 words. An understanding, not a textbook definition.",
  "definition_body": "Why does ${topic} exist and why should a trader care? 2 short sentences. Max 25 words total.",
  "key_insight": "The one idea about ${topic} that makes everything click. Max 25 words.",
  "how_it_works_title": "Simple heading: how traders actually use this (5-6 words)",
  "steps": [
    {"label": "What it shows", "text": "What ${topic} reveals to a trader. Max 20 words."},
    {"label": "When to use it", "text": "The right market condition to apply ${topic}. Max 20 words."},
    {"label": "What to look for", "text": "The specific signal a trader watches for. Max 20 words."},
    {"label": "The edge", "text": "Why knowing this gives a trader an advantage. Max 20 words."}
  ],
  "rules_title": "Simple rules for ${topic} (5-6 words)",
  "rules": [
    "Rule 1 — a simple truth, not a command. Max 12 words.",
    "Rule 2 — max 12 words.",
    "Rule 3 — max 12 words. Practical.",
    "Rule 4 — the rule most beginners miss. Max 12 words."
  ],
  "example_title": "Real example headline (4-5 words)",
  "example_scenario": "A real market scenario using Nifty, Reliance, HDFC Bank, TCS, Apple or Microsoft. Specific. Max 40 words.",
  "example_action": "What the trader saw and did. Why it worked. Max 25 words.",
  "mistakes_title": "The mistake most beginners make",
  "mistakes": [
    "Mistake 1 — what beginners actually do wrong with ${topic}. Max 15 words.",
    "Mistake 2 — the next most common error. Max 15 words.",
    "Mistake 3 — using ${topic} in the wrong conditions. Max 15 words.",
    "Mistake 4 — the emotional or psychological mistake. Max 15 words."
  ],
  "takeaway": "One sentence. The single most important thing to remember about ${topic}. Max 20 words."
}`;
}

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

    if (!Number.isFinite(day) || day < 1 || !topic) {
      return NextResponse.json(
        { success: false, error: { message: 'A valid day number and topic are required.' } },
        { status: 400 },
      );
    }

    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.75,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: userPrompt(day, topic) },
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
    return NextResponse.json({ success: false, error: { message } }, { status: 500 });
  }
}
