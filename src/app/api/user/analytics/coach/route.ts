import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import { getUserAnalyticsData } from '@/server/services/analytics.service';
import { openai, MEMORY_MODEL } from '@/lib/ai/openai';
import { prisma } from '@/lib/db/prisma';

// Below this many questions answered, the sample is too small to judge mastery —
// the coach must push curriculum coverage, not declare the student "done".
const LOW_COVERAGE_QUESTIONS = 40;

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
    const cacheKey = `analytics-coach:v3:${user.id}:${fingerprint}`;
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

    // Coverage: how much of the Level I curriculum has actually been attempted.
    // 100% accuracy on a handful of questions is NOT mastery — the coach needs
    // this to avoid over-praising a student who has barely started.
    const [chaptersTotal, subtopicsTotal] = await Promise.all([
      prisma.chapter.count({ where: { level: 'LEVEL_1', isPublished: true, isDeleted: false } }),
      prisma.subtopic.count({ where: { isPublished: true, isDeleted: false, chapter: { level: 'LEVEL_1', isPublished: true, isDeleted: false } } }),
    ]);
    const subtopicsAttempted = data.chapterAnalysis.reduce((n, ch) => n + ch.subtopics.length, 0);
    const lowCoverage = s.totalQuestions < LOW_COVERAGE_QUESTIONS || subtopicsAttempted < Math.max(3, subtopicsTotal * 0.5);

    const snapshot = `Overall: ${s.overallAccuracy}% accuracy, ${s.totalAttempts} quizzes, ${s.totalQuestions} questions answered, avg score ${s.averageScore}%. Current streak ${s.currentStreak} days (best ${s.longestStreak}).
COVERAGE: attempted ${subtopicsAttempted} of ${subtopicsTotal} Level I topics across ${data.chapterAnalysis.length} of ${chaptersTotal} chapters. ${lowCoverage ? 'This is LOW coverage — the student has only sampled a small slice of the curriculum, so accuracy is NOT yet evidence of mastery.' : 'Coverage is reasonably broad.'}
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
- COVERAGE BEFORE MASTERY: judge the student on coverage, not just accuracy. If the snapshot says coverage is LOW, do NOT congratulate them on "mastering all topics" or call it a "perfect streak across all topics" — they have only answered a few questions on a few topics. Be honest but encouraging: it's a strong start on a small sample. The plan must then focus on BREADTH — read the Chartix notes for topics not yet studied and take quizzes across the chapters they haven't attempted yet. Do NOT recommend a full-length mock test as the top priority when coverage is low (a mock test makes sense once they've studied most of the curriculum).
- When coverage is broad and there are no weak topics, THEN it's appropriate to suggest a full-length mock test, revisiting strong topics, and using Chartix Scholar to go deeper.
- plan has 3-4 steps, ordered by priority (close weak topics and gaps in coverage first).
- Be specific to CMT Level I technical analysis. Reference the student's real topic names. No emojis.`,
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
