import { NextResponse } from 'next/server';
import { openai } from '@/lib/ai/openai';
import { prisma } from '@/lib/db/prisma';
import { createEmbedding, searchPublicBotChunks } from '@/lib/ai/knowledge-store';
import { enforceRateLimit } from '@/server/policies/rate-limit';

export const dynamic = 'force-dynamic';

const SYSTEM_BASE = `You are the Chartix CMT Exam Bot — a knowledgeable and friendly assistant on Chartix.in, a CMT exam preparation platform.

Your knowledge comes exclusively from official CMT-related documents and materials uploaded by the Chartix team. Answer questions based only on what is in the provided context.

WHAT YOU ANSWER:
• CMT exam structure, levels, topic weightings, curriculum
• Exam format, question count, duration, passing scores, exam windows
• Eligibility requirements, registration, fees, scheduling
• Technical analysis concepts that appear in the CMT curriculum
• Career paths for CMT charterholders
• How to prepare for the CMT exam
• Anything else covered in the provided context

RULES:
• Only use information from the CONTEXT section below — do not invent facts
• If the context does not cover the question, say: "I don't have that information right now. For official details, visit cmtassociation.org or sign up at chartix.in for our full study platform."
• Be friendly, concise, and use bullet points for lists
• Write any formulas in plain readable text with Unicode symbols (× ÷ − √ Σ) — NEVER use LaTeX/MathJax, backslash commands, $, \\(, \\), \\text{} or \\frac{}{}
• Keep responses under 300 words`;

function buildSystemPrompt(
  context: string,
  qaPairs: { question: string; answer: string }[],
): string {
  let prompt = SYSTEM_BASE;

  if (qaPairs.length > 0) {
    prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY FACTS — always use these exact answers:
${qaPairs.map((p, i) => `${i + 1}. Q: ${p.question}\n   A: ${p.answer}`).join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  if (context.trim()) {
    prompt += `

───────────────────────────────────────
CONTEXT (from uploaded CMT documents — use this as your sole knowledge source):

${context}
───────────────────────────────────────`;
  } else {
    prompt += `

No specific context was found for this question. Answer only if you are certain from general CMT knowledge, otherwise direct the user to chartix.in or cmtassociation.org.`;
  }

  return prompt;
}

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(request: Request) {
  try {
    const rl = await enforceRateLimit({
      request,
      key: 'public-chat',
      maxRequests: 20,
      windowMs: 60 * 60 * 1000,
    });

    if (!rl.allowed) {
      return NextResponse.json(
        { success: false, error: { message: `You've reached the message limit. Please try again in ${Math.ceil(rl.retryAfterSeconds / 60)} minute(s).` } },
        { status: 429 },
      );
    }

    const body = await request.json();
    const message: string = (body.message as string | undefined)?.trim() ?? '';
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history.slice(-6) : [];
    const source: string = (body.source as string | undefined) ?? '';
    const isLabTutor = source === 'indicator-lab';

    // The Indicator Lab AI tutor is a public, anonymous funnel — cap it hard at
    // 3 questions/day per IP and steer heavy users to enroll. This protects AI
    // spend; signed-in study members get the full Chartix Scholar instead.
    if (isLabTutor) {
      const daily = await enforceRateLimit({
        request,
        key: 'indicator-lab-tutor',
        maxRequests: 3,
        windowMs: 24 * 60 * 60 * 1000,
      });
      if (!daily.allowed) {
        const hrs = Math.ceil(daily.retryAfterSeconds / 3600);
        return NextResponse.json(
          {
            success: false,
            limit: true,
            error: { message: `You've used your 3 free Chartix Scholar questions for today. Enroll for unlimited access to the full study chatbot, notes, quizzes and mock tests — your free questions reset in about ${hrs} hour${hrs !== 1 ? 's' : ''}.` },
          },
          { status: 429 },
        );
      }
    }

    if (!message || message.length < 2) {
      return NextResponse.json({ success: false, error: { message: 'Message is required' } }, { status: 400 });
    }

    if (message.length > 1000) {
      return NextResponse.json({ success: false, error: { message: 'Message too long (max 1000 characters)' } }, { status: 400 });
    }

    // Run vector search on uploaded PDFs + load admin Q&A in parallel
    const [queryEmbedding, qaPairs] = await Promise.all([
      createEmbedding(message),
      prisma.botQAPair.findMany({
        where: { botType: 'public' },
        select: { question: true, answer: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
    ]);

    // Search only public_bot chunks (from your uploaded PDFs)
    const chunks = await searchPublicBotChunks(queryEmbedding, 8);

    const context = chunks
      .map((c) => c.content)
      .join('\n\n---\n\n');

    const systemPrompt = buildSystemPrompt(context, qaPairs);

    const stream = await openai.chat.completions.create({
      // The Lab tutor runs on the far cheaper mini model — plenty for short
      // indicator Q&A, and keeps public AI cost low. Homepage chat stays on 4o.
      model: isLabTutor ? 'gpt-4o-mini' : 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...history.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
      ],
      stream: true,
      temperature: 0.3,
      max_tokens: 800,
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
