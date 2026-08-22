// Polishes raw observation headlines using OpenAI — @Patterns0001 style.
// Falls back gracefully to the raw headline if the API call fails.

import OpenAI from 'openai';
import type { Observation } from './detect-observations';

const SYSTEM = `You write punchy, factual market observation headlines in the style of popular financial Twitter accounts like @Patterns0001 and @Barchart.

Rules:
- One headline only. No explanations, no bullet points.
- Start with a strong verb or a bold statement. Examples: "BREAKING:", "Gold records", "For the first time in X years"
- Include the specific number. Never vague.
- All caps for the asset name is fine when dramatic ("GOLD", "BITCOIN", "VIX").
- Maximum 12 words.
- Do NOT use hashtags, emojis, or promotional language.
- Write for a global audience — not India-only.`;

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function polishHeadline(obs: Pick<Observation, 'headline' | 'subtext' | 'contextNote'>): Promise<string> {
  try {
    const prompt = `Raw headline: "${obs.headline}"\nContext: ${obs.subtext} (${obs.contextNote})\n\nWrite the final headline:`;
    const res = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: prompt },
      ],
      max_tokens: 60,
      temperature: 0.7,
    });
    const text = res.choices[0]?.message?.content?.trim() ?? '';
    return text || obs.headline;
  } catch {
    return obs.headline;
  }
}

export async function polishAllHeadlines(observations: Observation[]): Promise<Observation[]> {
  const polished = await Promise.allSettled(
    observations.map(async (obs) => ({
      ...obs,
      headline: await polishHeadline(obs),
    })),
  );
  return polished.map((r, i) =>
    r.status === 'fulfilled' ? r.value : observations[i],
  );
}
