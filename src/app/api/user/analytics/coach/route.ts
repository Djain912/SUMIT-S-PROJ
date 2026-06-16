import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { getUserAnalyticsData } from '@/server/services/analytics.service';
import { openai, MEMORY_MODEL } from '@/lib/ai/openai';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// AI study coach. Reads the student's ALREADY-COMPUTED analytics (a tiny
// summary, not raw rows) and turns it into a personalised coaching note +
// study plan. Cached per-student keyed by a "stats fingerprint", so we only
// pay for a regeneration when the student's numbers actually change (e.g.
// after a new quiz) — page reloads are free.

type CoachOutput = {
  headline: string;
  summary: string;
  focusTopic: { title: string; reason: string } | null;
  plan: { step: string; detail: string }[];
  encouragement: string;
};

let redis: Redis | null = null;
function getRedis(): Redis | null {
  if (!process.env.UPSTASH_REDIS_REST_URL) return null;
  if (!redis) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return redis;
}

const LEVEL_LABEL: Record<string, string> = {
  LEVEL_1: 'Level I', LEVEL_2: 'Level II', LEVEL_3: 'Level III',
};

export async function GET() {
  try {
    const user = await requireAuthenticatedUser();
    const data = await getUserAnalyticsData(user.id);
    const s = data.overallStats;

    // No quiz history yet — return a friendly prompt without spending on AI.
    if (s.totalAttempts === 0) {
      return NextResponse.json({
        success: true,
        data: {
          headline: 'Take your first quiz to unlock your AI coach',
          summary: 'Once you complete a quiz, your personal coach will analyse your strengths and weak spots and build you a study plan.',
          focusTopic: null,
          plan: [],
          encouragement: 'Start with any topic you have read — even one quiz gives me something to work with!',
        } satisfies CoachOutput,
      });
    }

    // Fingerprint: changes whenever the student's performance changes, which is
    // exactly when the coaching should be regenerated.
    const fingerprint = `${s.totalAttempts}-${s.totalQuestions}-${s.correctAnswers}-${data.weakTopics.length}-${data.strongTopics.length}`;
    // Bump this version whenever the coaching prompt changes — it invalidates
    // every student's cached coaching so they get the new guidance immediately.
    const cacheKey = `analytics-coach:v2:${user.id}:${fingerprint}`;
    const r = getRedis();

    if (r) {
      const cached = await r.get<CoachOutput>(cacheKey);
      if (cached?.headline) {
        return NextResponse.json({ success: true, data: cached }, { headers: { 'x-coach-source': 'cache' } });
      }
    }

    // Build a compact, token-cheap snapshot for the model.
    const levelLines = data.levelSummaries
      .filter(l => l.totalAttempts > 0)
      .map(l => `${LEVEL_LABEL[l.level] ?? l.level}: ${l.accuracy}% accuracy over ${l.totalAttempts} quizzes (best ${l.bestScore}%)`)
      .join('; ');
    const weakLines = data.weakTopics.slice(0, 6)
      .map(t => `${t.title} (${t.chapterTitle}) — ${t.accuracy}%`)
      .join('; ') || 'none yet';
    const strongLines = data.strongTopics.slice(0, 6)
      .map(t => `${t.title} — ${t.accuracy}%`)
      .join('; ') || 'none yet';

    const snapshot = `Overall: ${s.overallAccuracy}% accuracy, ${s.totalAttempts} quizzes, ${s.totalQuestions} questions, avg score ${s.averageScore}%. Current streak ${s.currentStreak} days (best ${s.longestStreak}).
By level: ${levelLines || 'n/a'}.
WEAK topics (<50%): ${weakLines}.
STRONG topics (>=70%): ${strongLines}.`;

    const completion = await openai.chat.completions.create({
      model: MEMORY_MODEL, // gpt-4o-mini — cheap; summarising stats needs no more
      temperature: 0.4,
      max_tokens: 700,
      response_format: { type: 'json_object' },
      messages: [
        {
          role: 'system',
          content: `You are a warm, sharp CMT exam study coach inside the Chartix app. You are given a student's quiz-performance snapshot. Produce concise, specific, encouraging coaching — never generic filler like "practice more". Reference the student's actual topics and numbers. Output STRICT JSON with this shape:
{
  "headline": "one short motivating line (max 8 words)",
  "summary": "2-3 sentences on where they stand: what's working and the single biggest gap. Use their real topic names.",
  "focusTopic": { "title": "the ONE topic to prioritise next", "reason": "one sentence why" },
  "plan": [ { "step": "short action title", "detail": "one specific sentence" } ],
  "encouragement": "one genuine, non-cheesy encouraging line"
}

WHAT CHARTIX OFFERS — every recommendation MUST be one of these, nothing else:
- Practising quizzes on specific CMT Level I topics (use the student's real topic names)
- Taking a full-length mock test (132 questions, exam format)
- Reading the Chartix notes for a specific Level I topic
- Asking Chartix Scholar (the in-app AI tutor) to explain a concept

STRICT RULES:
- Chartix currently has ONLY CMT Level I. NEVER mention or recommend Level II or Level III materials, quizzes, or "advancing to the next level" — they do not exist on the platform.
- NEVER recommend anything outside Chartix: no study groups, forums, peers, external books, websites, or communities.
- plan has 3-4 steps, ordered by priority (weakest topics first, then reinforce strong ones).
- If there are NO weak topics, the plan = take a full-length mock test, revisit specific strong topics to stay sharp, practise any Level I topics not yet attempted, and use Chartix Scholar to go deeper. Do NOT suggest moving beyond Level I.
- Be specific to CMT Level I technical analysis. No emojis.`,
        },
        { role: 'user', content: snapshot },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? '{}';
    let parsed: CoachOutput;
    try {
      parsed = JSON.parse(raw) as CoachOutput;
    } catch {
      return NextResponse.json(
        { success: false, error: { message: 'Could not generate coaching right now.' } },
        { status: 502 },
      );
    }

    // Cache 14 days; it is replaced sooner whenever the fingerprint changes.
    if (r) await r.set(cacheKey, parsed, { ex: 14 * 24 * 60 * 60 });

    return NextResponse.json({ success: true, data: parsed }, { headers: { 'x-coach-source': 'ai' } });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ success: false, error: { message: error.message } }, { status: error.statusCode });
    }
    console.error('[analytics/coach] error:', error);
    return NextResponse.json({ success: false, error: { message: 'Unable to generate coaching' } }, { status: 500 });
  }
}
