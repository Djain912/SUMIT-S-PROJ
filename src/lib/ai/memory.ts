import { openai, MEMORY_MODEL } from './openai';
import { prisma } from '@/lib/db/prisma';

// Keep the stored profile small — it is injected into every chat request.
const MAX_PROFILE_CHARS = 1200;

/**
 * Load the saved learning profile for a student, or null if none yet.
 * Used to personalise the tutor's tone, depth and format per student.
 */
export async function getUserMemory(userId: string): Promise<string | null> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ profile: string }[]>(
      `SELECT profile FROM user_memory WHERE user_id = $1 LIMIT 1`,
      userId,
    );
    const profile = rows[0]?.profile?.trim();
    return profile && profile.length > 0 ? profile : null;
  } catch (e) {
    console.error('[memory] getUserMemory error:', e);
    return null;
  }
}

async function saveUserMemory(userId: string, profile: string): Promise<void> {
  const trimmed = profile.trim().slice(0, MAX_PROFILE_CHARS);
  await prisma.$executeRawUnsafe(
    `INSERT INTO user_memory (user_id, profile, updated_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (user_id)
     DO UPDATE SET profile = EXCLUDED.profile, updated_at = NOW()`,
    userId,
    trimmed,
  );
}

/**
 * Update a student's learning profile based on the latest exchange.
 * Runs on the cheap MEMORY_MODEL and is meant to be fired in the background
 * (e.g. via `after()`), so it never blocks the chat response.
 */
export async function updateUserMemory(
  userId: string,
  userMessage: string,
  assistantAnswer: string,
): Promise<void> {
  try {
    const existing = await getUserMemory(userId);

    const completion = await openai.chat.completions.create({
      model: MEMORY_MODEL,
      temperature: 0.2,
      max_tokens: 220,
      messages: [
        {
          role: 'system',
          content: `You maintain a concise learning profile of a single CMT exam student so a tutor can personalise future answers. Given the existing profile and the latest exchange, output an UPDATED profile.

Capture only durable, useful signals:
- Preferred answer style/format (e.g. likes bullet points, short answers, worked examples)
- Depth level (beginner / intermediate / advanced)
- CMT level focus (Level I / II / III)
- Topics they struggle with and topics they've grasped
- Tone/language preferences they've expressed

Rules:
- Keep it under 120 words, written as short factual notes.
- Merge with the existing profile; do not lose still-relevant facts.
- Do not include the literal question/answer text.
- Output ONLY the updated profile text, no preamble or headings.`,
        },
        {
          role: 'user',
          content: `EXISTING PROFILE:
${existing ?? '(none yet)'}

LATEST EXCHANGE:
Student asked: ${userMessage}
Tutor answered: ${assistantAnswer.slice(0, 1500)}

Updated profile:`,
        },
      ],
    });

    const updated = completion.choices[0]?.message?.content?.trim();
    if (updated && updated.length > 0) {
      await saveUserMemory(userId, updated);
    }
  } catch (e) {
    console.error('[memory] updateUserMemory error:', e);
  }
}
