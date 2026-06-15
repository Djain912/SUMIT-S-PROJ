import { NextResponse } from 'next/server';
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { getUserAnalyticsData } from '@/server/services/analytics.service';
import { openai, MEMORY_MODEL } from '@/lib/ai/openai';
import { enforceRateLimit } from '@/server/policies/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const LEVEL_LABEL: Record<string, string> = {
  LEVEL_1: 'Level I', LEVEL_2: 'Level II', LEVEL_3: 'Level III',
};

type ChatMessage = { role: 'user' | 'assistant'; content: string };

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    const limit = await enforceRateLimit({
      request,
      key: 'analytics-chat',
      maxRequests: 30,
      windowMs: 60 * 60 * 1000,
      identifier: user.id,
    });
    if (!limit.allowed) {
      return NextResponse.json(
        { success: false, error: { message: 'You have asked a lot of questions — please try again later.' } },
        { status: 429 },
      );
    }

    const body = await request.json();
    const message: string = body.message?.trim() ?? '';
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history.slice(-6) : [];
    if (!message || message.length < 2) {
      return NextResponse.json({ success: false, error: { message: 'Message is required' } }, { status: 400 });
    }
    if (message.length > 600) {
      return NextResponse.json({ success: false, error: { message: 'Question too long' } }, { status: 400 });
    }

    const data = await getUserAnalyticsData(user.id);
    const s = data.overallStats;

    const levelLines = data.levelSummaries
      .filter(l => l.totalAttempts > 0)
      .map(l => `${LEVEL_LABEL[l.level] ?? l.level}: ${l.accuracy}% over ${l.totalAttempts} quizzes (best ${l.bestScore}%)`)
      .join('; ');
    const weakLines = data.weakTopics.slice(0, 8).map(t => `${t.title} (${t.chapterTitle}) ${t.accuracy}%`).join('; ') || 'none';
    const strongLines = data.strongTopics.slice(0, 8).map(t => `${t.title} ${t.accuracy}%`).join('; ') || 'none';
    const chapterLines = data.chapterAnalysis.slice(0, 12).map(c => `${c.title}: ${c.accuracy}% (${c.correctAnswers}/${c.totalQuestions})`).join('; ') || 'none';

    const snapshot = s.totalAttempts === 0
      ? 'The student has not completed any quizzes yet.'
      : `Overall: ${s.overallAccuracy}% accuracy, ${s.totalAttempts} quizzes, ${s.totalQuestions} questions, avg score ${s.averageScore}%, current streak ${s.currentStreak}d (best ${s.longestStreak}d), study time ${s.totalTimeSpentMinutes} min.
By level: ${levelLines || 'n/a'}.
Per chapter: ${chapterLines}.
Weak topics (<50%): ${weakLines}.
Strong topics (>=70%): ${strongLines}.`;

    const systemPrompt = `You are Chartix Coach, an AI mentor that answers a CMT exam student's questions about THEIR OWN quiz performance, using the data below. Be specific, warm and concise.

RULES:
- Answer ONLY from the performance data provided. If the data does not contain the answer (e.g. they ask about a topic they have never been quizzed on), say so honestly and suggest taking a quiz on it.
- Quote the student's real numbers and topic names.
- When relevant, recommend a concrete next action (which topic to revise or quiz next, weakest first).
- Keep answers short — a few sentences or a short bullet list. No emojis. No LaTeX; write any math in plain text.
- You are a study coach, not a financial adviser — never give investment/trading advice.

STUDENT PERFORMANCE DATA:
${snapshot}`;

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      { role: 'user', content: message },
    ];

    const stream = await openai.chat.completions.create({
      model: MEMORY_MODEL,
      messages,
      stream: true,
      temperature: 0.3,
      max_tokens: 500,
    });

    const encoder = new TextEncoder();
    const readable = new ReadableStream({
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

    return new Response(readable, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: 'Sign in to use the coach' } }, { status: 401 });
    }
    console.error('[analytics/chat] error:', error);
    return NextResponse.json({ success: false, error: { message: 'Something went wrong. Please try again.' } }, { status: 500 });
  }
}
