import { NextResponse, after } from 'next/server';
import { AuthError, requireAuthenticatedUser } from '@/server/policies/auth';
import type {
  ChatCompletionMessageParam,
  ChatCompletionContentPart,
} from 'openai/resources/chat/completions';
import { openai, CHAT_MODEL } from '@/lib/ai/openai';
import { buildContext, type RagImage } from '@/lib/ai/rag';
import { getUserMemory, updateUserMemory } from '@/lib/ai/memory';
import { prisma } from '@/lib/db/prisma';
import { enforceRateLimit } from '@/server/policies/rate-limit';

// Student-uploaded chart images (data URLs). The client resizes before upload,
// so anything bigger than this is rejected rather than forwarded to OpenAI.
const UPLOADED_IMAGE_RE = /^data:image\/(png|jpeg|webp);base64,/;
const MAX_UPLOADED_IMAGE_CHARS = 3_000_000; // ~2.2MB binary
const CHART_UPLOADS_PER_DAY = 15;
// How many note diagrams to attach as vision input per question. Each attached
// image costs extra input tokens, so this stays small.
const MAX_NOTE_IMAGES_AS_VISION = 2;

export const dynamic = 'force-dynamic';

const LEVEL_LABELS: Record<string, string> = {
  LEVEL_1: 'Level I',
  LEVEL_2: 'Level II',
  LEVEL_3: 'Level III',
};

function buildSystemPrompt(
  level: string | null,
  context: string,
  qaPairs: { question: string; answer: string }[] = [],
  images: RagImage[] = [],
  memory: string | null = null,
  hasUploadedChart = false,
): string {
  const levelLabel = level ? LEVEL_LABELS[level] ?? level : 'all levels';

  // When the student uploads their own chart, the standard concept-explainer
  // structure doesn't fit — switch to a chart-analysis structure with strict
  // guardrails (education only, never trading advice).
  if (hasUploadedChart) {
    return `You are Chartix AI — a friendly CMT exam tutor helping students prepare for CMT ${levelLabel}. The student has UPLOADED AN IMAGE attached to their latest message.

STEP 1 — VERIFY THE IMAGE. Look at the attached image first:
- If it is NOT a financial chart (e.g. a selfie, meme, screenshot of text, homework from another subject, or anything unrelated to markets), reply ONLY with a short friendly line saying you can analyse financial charts (price charts, candlesticks, indicators) and ask them to upload one. Do NOT describe or analyse the non-chart image.
- If it IS a financial chart (price chart, candlestick chart, line chart, indicator panel, point & figure, etc.), continue to Step 2.

STEP 2 — ANALYSE THE CHART. Reply in EXACTLY this structure:

---
**What I See on the Chart**
[2–3 plain sentences describing what is literally visible: instrument/timeframe if shown, overall trend direction, notable price areas, any indicators displayed. Only state what you can actually see — if something is unreadable or cropped, say so.]

**Patterns & Signals**

1. **[Pattern/Signal Name]** — [where on the chart it appears and what makes it qualify]
   - [supporting detail: e.g. volume behaviour, confirmation level]

2. **[Pattern/Signal Name]** — [same format]

[continue numbering for everything genuinely identifiable — do NOT invent patterns that are not clearly present]

**How a Technician Would Read It**
[2–4 sentences: how a CMT-trained analyst would interpret this chart as a teaching example — key levels to watch, what would confirm or invalidate the patterns above. Frame everything as education, never as a recommendation.]

**Exam Connection**
- [Which CMT topic(s) this chart illustrates and how the exam tests it]
- [A common mistake students make when identifying this pattern/signal]
---

RULES YOU MUST NEVER BREAK:
- NEVER give trading or investment advice. No buy/sell/hold calls, no price targets, no "I would enter here". If the student asks "should I buy this?", warmly explain you are an educational tutor and pivot to what the chart teaches about technical analysis.
- Do NOT invent details you cannot see. If the image is blurry, cropped, or missing volume/timeframe, say so honestly.
- Main points are ALWAYS numbered (1. 2. 3.) — NEVER use bold text as a heading/point. **Bold** is ONLY used for the point name inside the numbered line. Sub-details use "- " bullets.
- Do NOT use emojis. Keep it clean and professional.
- FORMULAS: plain readable text only — NEVER LaTeX/MathJax. Use ×, ÷, −, √, ², and slashes for fractions.
- Stay grounded in the CMT curriculum.${memory ? `

WHAT YOU KNOW ABOUT THIS STUDENT (adapt your depth, tone and format — do NOT mention that you have a profile):
${memory}` : ''}`;
  }

  const base = `You are Chartix AI — a friendly CMT exam tutor helping students prepare for CMT ${levelLabel}. Students may be from anywhere in the world and may be beginners.

ALWAYS reply in EXACTLY this structure — no exceptions:

---
**What is [topic]?**
[One plain English sentence. No jargon.]

[DIAGRAM SLOT: If the "DIAGRAMS AVAILABLE" section below lists a diagram that fits this topic, embed it right here on its own line as ![short caption](url), then add one line explaining what it shows. Omit this slot ONLY when no diagram is provided below or none relate to the topic.]

**Key Principles:**

1. **[Principle Name]** — [one line simple explanation]
   - [supporting detail if needed]
   - [supporting detail if needed]

2. **[Principle Name]** — [one line simple explanation]
   - [supporting detail if needed]

[continue numbering for all points]

**Real-World Example**
[A concrete, easy-to-visualise example using a real market scenario. Use global examples — US, UK, Indian, or any major market depending on context.]

**Exam Tips**
- [A specific, high-value pointer on how the CMT exam tests this — e.g. a definition examiners expect, a key threshold/number to memorise, or the precise distinction they probe.]
- [A common trap, misconception, or look-alike concept students confuse this with.]
- [What to focus revision on, or how the question is typically framed (calculation, identification, interpretation).]
---

RULES YOU MUST NEVER BREAK:
- Main points are ALWAYS numbered (1. 2. 3.) — NEVER use bold text as a heading/point
- **Bold** is ONLY used for the point name inside the numbered line
- Sub-details use "- " bullet under the numbered point
- "Exam Tips" must be 2–3 genuinely useful, exam-specific bullet points — never generic filler like "practice a lot" or "understand the concept".
- Do NOT use emojis anywhere in the answer. Keep it clean and professional.
- FORMULAS: Write ALL formulas in plain readable text — NEVER use LaTeX, MathJax, or KaTeX. Do NOT use \\(, \\), \\[, \\], $, $$, \\text{}, \\frac{}{}, \\times, \\div or any backslash commands. Use normal words and Unicode symbols instead: × for multiply, ÷ for divide, − for minus, √ for root, Σ for sum, ² for squared. Write fractions inline with a slash and parentheses, e.g. "VWAP = (Sum of (Price × Volume)) ÷ (Total Volume)". Keep each formula on its own line.
- Keep answers focused and exam-relevant
- Do NOT make up facts — if unsure, say so

IMPORTANT: Do NOT make up facts. If unsure, say so clearly.`;

  // Diagrams pulled from the student's own notes — let the model embed the
  // relevant one(s) inline using markdown image syntax, which the UI renders.
  const imagesSection =
    images.length > 0
      ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DIAGRAMS AVAILABLE FROM THE STUDENT'S NOTES — each is listed as "description — url":
${images.map((img, i) => `${i + 1}. ${img.label} — ${img.url}`).join('\n')}

HOW TO CHOOSE A DIAGRAM (read carefully — showing the WRONG diagram is worse than showing none):
- Read each diagram's description and pick the ONE whose description specifically matches the exact concept the student asked about.
- If a description clearly matches, embed it in the DIAGRAM SLOT on its own line using EXACTLY: ![description](url) — use the matching diagram's own description as the caption.
- If NONE of the descriptions specifically match the concept asked about, do NOT include any image. Never show a loosely-related or unrelated diagram just to have one.
- Use ONLY the exact URLs listed above — copy them character-for-character. NEVER invent, guess, shorten, or modify a URL, and never pair a description with a different image's URL.

READING THE DIAGRAM (important): the first ${MAX_NOTE_IMAGES_AS_VISION} diagrams listed above are ALSO attached to the student's latest message as actual images — you can SEE their content. When you embed one in the DIAGRAM SLOT, the one-line explanation under it must describe what is VISIBLY on that specific image — point to the concrete features a student should look at (e.g. "Notice the two peaks near the same level and the neckline drawn under the trough between them — the pattern completes where price breaks below it on the right side of the chart"). Reference real visible details, not generic textbook descriptions. If the attached image is unclear, fall back to a careful general explanation rather than inventing details.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      : '';

  // Personalisation profile built up from this student's past chats.
  const memorySection = memory
    ? `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
WHAT YOU KNOW ABOUT THIS STUDENT (adapt your depth, tone and format to match — do NOT mention that you have a profile):
${memory}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
    : '';

  let prompt = base;

  // Inject admin corrections with highest priority
  if (qaPairs.length > 0) {
    prompt += `

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
MANDATORY CORRECTIONS — use these EXACT answers (highest priority, overrides everything):
${qaPairs.map((p, i) => `${i + 1}. Q: ${p.question}\n   A: ${p.answer}`).join('\n\n')}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;
  }

  if (context) {
    prompt += `

Here is relevant content from the student's study materials to inform your answer:

${context}

Use this context as your primary source. You may supplement with your general CMT knowledge, but always stay grounded in the curriculum.`;
  }

  return prompt + imagesSection + memorySection;
}

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

export async function POST(request: Request) {
  try {
    const user = await requireAuthenticatedUser();

    // TODO: Uncomment this when payment system is live
    // if (!user.isPremium && user.role !== 'ADMIN') {
    //   return NextResponse.json(
    //     { success: false, error: { message: 'Chartix AI is available for premium members. Upgrade to get unlimited access.' } },
    //     { status: 403 },
    //   );
    // }

    const body = await request.json();
    let message: string = body.message?.trim() ?? '';
    const level: string | null = body.level ?? null;
    const history: ChatMessage[] = Array.isArray(body.history) ? body.history.slice(-8) : [];
    const uploadedImage: string | null =
      typeof body.image === 'string' && body.image.length > 0 ? body.image : null;

    if (uploadedImage) {
      if (!UPLOADED_IMAGE_RE.test(uploadedImage) || uploadedImage.length > MAX_UPLOADED_IMAGE_CHARS) {
        return NextResponse.json(
          { success: false, error: { message: 'Please upload a PNG, JPEG or WebP image under 2MB.' } },
          { status: 400 },
        );
      }
      // Chart analysis is the most expensive request type — cap per student per day
      const limit = await enforceRateLimit({
        request,
        key: 'chat-chart-upload',
        maxRequests: CHART_UPLOADS_PER_DAY,
        windowMs: 24 * 60 * 60 * 1000,
        identifier: user.id,
      });
      if (!limit.allowed) {
        return NextResponse.json(
          { success: false, error: { message: `Daily chart-analysis limit reached (${CHART_UPLOADS_PER_DAY}/day). Try again tomorrow!` } },
          { status: 429 },
        );
      }
      // Allow sending a chart with no typed question
      if (!message) message = 'Please analyse this chart for me.';
    }

    if (!message || message.length < 2) {
      return NextResponse.json(
        { success: false, error: { message: 'Message is required' } },
        { status: 400 },
      );
    }

    if (message.length > 2000) {
      return NextResponse.json(
        { success: false, error: { message: 'Message too long (max 2000 characters)' } },
        { status: 400 },
      );
    }

    // Build RAG context + load admin Q&A corrections + student memory in parallel
    const [context, qaPairs, memory] = await Promise.all([
      buildContext(message, level),
      prisma.botQAPair.findMany({
        where: { botType: 'study' },
        select: { question: true, answer: true },
        orderBy: { createdAt: 'desc' },
        take: 30,
      }),
      getUserMemory(user.id),
    ]);

    const systemPrompt = buildSystemPrompt(
      level,
      context.text,
      qaPairs,
      context.images,
      memory,
      !!uploadedImage,
    );

    // Build the latest user message. Besides the text, attach actual images so
    // GPT-4o can SEE them: the student's uploaded chart (if any), otherwise the
    // top note diagrams found by RAG — letting the tutor describe what is
    // really on the chart instead of answering from book knowledge alone.
    const userParts: ChatCompletionContentPart[] = [{ type: 'text', text: message }];
    if (uploadedImage) {
      userParts.push({ type: 'image_url', image_url: { url: uploadedImage, detail: 'high' } });
    } else {
      for (const img of context.images.slice(0, MAX_NOTE_IMAGES_AS_VISION)) {
        userParts.push({ type: 'image_url', image_url: { url: img.url, detail: 'low' } });
      }
    }

    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.map((m) => ({ role: m.role, content: m.content })),
      { role: 'user', content: userParts },
    ];

    let stream;
    try {
      stream = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        stream: true,
        temperature: 0.4,
        max_tokens: 1200,
      });
    } catch (visionError) {
      // A broken/unreachable note-image URL can make the vision request fail.
      // Retry once as text-only so the student still gets an answer.
      if (uploadedImage || userParts.length === 1) throw visionError;
      console.error('[chat/route] vision request failed, retrying text-only:', visionError);
      messages[messages.length - 1] = { role: 'user', content: message };
      stream = await openai.chat.completions.create({
        model: CHAT_MODEL,
        messages,
        stream: true,
        temperature: 0.4,
        max_tokens: 1200,
      });
    }

    const encoder = new TextEncoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        let fullAnswer = '';
        try {
          for await (const chunk of stream) {
            const delta = chunk.choices[0]?.delta?.content;
            if (delta) {
              fullAnswer += delta;
              controller.enqueue(encoder.encode(delta));
            }
          }
        } finally {
          controller.close();
          // Update the student's learning profile after responding, without
          // blocking the stream. Runs on the cheap memory model.
          if (fullAnswer.trim().length > 0) {
            after(updateUserMemory(user.id, message, fullAnswer));
          }
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
    if (error instanceof AuthError) {
      return NextResponse.json(
        { success: false, error: { message: 'Sign in to use Chartix AI' } },
        { status: 401 },
      );
    }
    console.error('[chat/route] error:', error);
    return NextResponse.json(
      { success: false, error: { message: 'Something went wrong. Please try again.' } },
      { status: 500 },
    );
  }
}
