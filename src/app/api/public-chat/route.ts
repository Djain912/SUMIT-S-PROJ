import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai/openai';
import { prisma } from '@/lib/db/prisma';
import { buildContext } from '@/lib/ai/rag';
import { enforceRateLimit } from '@/server/policies/rate-limit';

export const dynamic = 'force-dynamic';

// ── System prompt ────────────────────────────────────────────────────────────
const SYSTEM_BASE = `You are the Chartix CMT Exam Bot — a knowledgeable and friendly assistant for students and professionals exploring the CMT (Chartered Market Technician) designation.

You have two knowledge sources available:
1. OFFICIAL CMT INFORMATION — facts about the CMT programme, exam structure, fees, eligibility, careers
2. CMT STUDY MATERIAL — actual curriculum content from Chartix notes (technical analysis concepts, chart patterns, indicators, etc.)

WHAT YOU ANSWER (answer all of these confidently):
• CMT exam structure — number of levels, what each covers, topic weightings
• CMT curriculum chapters and subject areas per level
• Exam format — question count, duration, passing scores, exam windows
• Eligibility and experience requirements for the CMT charter
• Registration process, exam fees, scheduling
• Career paths and job roles for CMT charterholders
• Differences between CMT and other designations (CFA, CFTe, CFTE, etc.)
• CMT Association membership and benefits
• Technical analysis concepts from the CMT curriculum (RSI, MACD, Dow Theory, Elliott Wave, Support & Resistance, Moving Averages, Chart Patterns, Volume Analysis, etc.)
• How to prepare for the CMT exam — study strategies, resources, tips
• What topics are important for each CMT level

TONE & FORMAT:
• Friendly, confident, and direct
• Use bullet points for lists
• Keep responses focused and under 300 words
• If context material is available, use it as your primary source
• If unsure, say so and recommend cmtassociation.org for official details

IMPORTANT: Do NOT decline questions about technical analysis concepts — you are trained on the CMT curriculum and should answer them. Only decline completely off-topic questions (politics, cooking, sports, etc.).

For off-topic questions use:
"I'm the Chartix CMT Exam Bot — I specialise in CMT exam prep and technical analysis. For that topic, you'll need to look elsewhere! For CMT prep, visit chartix.in 🎓"`;

function buildSystemPrompt(
  ragContext: string,
  manualSources: string,
  qaPairs: { question: string; answer: string }[],
): string {
  let prompt = SYSTEM_BASE;

  // Highest priority: admin-written mandatory Q&A corrections
  if (qaPairs.length > 0) {
    prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY FACTS — always use these exact answers:
${qaPairs.map((p, i) => `${i + 1}. Q: ${p.question}\n   A: ${p.answer}`).join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  // RAG context from CMT study notes (most relevant to user's question)
  if (ragContext.trim()) {
    prompt += `

───────────────────────────────────────
CMT STUDY MATERIAL (from Chartix notes — use as primary source for concept questions):

${ragContext}
───────────────────────────────────────`;
  }

  // Manual sources (CMT programme facts uploaded by admin)
  if (manualSources.trim()) {
    prompt += `

───────────────────────────────────────
OFFICIAL CMT PROGRAMME INFORMATION:

${manualSources.slice(0, 12000)}
───────────────────────────────────────`;
  }

  return prompt;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(request: Request) {
  try {
    // Rate limit: 20 messages per IP per hour
    const rl = await enforceRateLimit({
      request,
      key: 'public-chat',
      maxRequests: 20,
      windowMs: 60 * 60 * 1000,
    });

    if (!rl.allowed) {
      return NextResponse.json(
        {
          success: false,
          error: {
            message: `You've reached the message limit. Please try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).`,
          },
        },
        { status: 429 },
      );
    }

    const body = await request.json();
    const message: string = (body.message as string | undefined)?.trim() ?? '';
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history.slice(-6) : [];

    if (!message || message.length < 2) {
      return NextResponse.json(
        { success: false, error: { message: 'Message is required' } },
        { status: 400 },
      );
    }

    if (message.length > 1000) {
      return NextResponse.json(
        { success: false, error: { message: 'Message too long (max 1000 characters)' } },
        { status: 400 },
      );
    }

    // Load all three knowledge sources in parallel:
    // 1. RAG vector search (finds most relevant CMT curriculum content)
    // 2. Manual public bot sources (CMT programme facts)
    // 3. Admin Q&A corrections (mandatory overrides)
    const [ragContext, sources, qaPairs] = await Promise.all([
      buildContext(message, null).catch(() => ''), // vector search across all CMT notes
      prisma.publicBotSource.findMany({
        select: { type: true, name: true, content: true },
        orderBy: { createdAt: 'asc' },
      }),
      prisma.botQAPair.findMany({
        where: { botType: 'public' },
        select: { question: true, answer: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    const manualSources = sources
      .map((s) => `[${s.name}]\n${s.content}`)
      .join('\n\n---\n\n');

    const systemPrompt = buildSystemPrompt(ragContext, manualSources, qaPairs);

    const stream = await openai.chat.completions.create({
      model: 'gpt-4o',       // upgraded from gpt-4o-mini — better reasoning
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 800,        // increased from 450
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) controller.enqueue(encoder.encode(delta));
          }
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    console.error('[public-chat] error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Something went wrong. Please try again.' } },
      { status: 500 },
    );
  }
}
