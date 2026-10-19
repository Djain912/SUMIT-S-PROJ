// AI copywriter for Market Desk posts. The model only rephrases facts the
// insight engine computed; a guard rejects any output containing a number
// that isn't in those facts (or hype, hashtags, links) and falls back to the
// deterministic template, so nothing invented ever reaches a post.

import OpenAI from 'openai';
import type { Insight } from './insights';
import { xLength } from './x-length';

const SYSTEM = `You write posts for the Chartix market desk on X (Twitter), published by Sumit Jain, CMT — a Chartered Market Technician based in India.

Voice: calm, precise, data-first. A respected market historian, not a hype account. Short declarative sentences. Readers are intelligent investors in India and abroad.

Hard rules:
- Use ONLY numbers, dates and years that appear in FACTS, copied exactly as written there. Never calculate, round, convert or add a number.
- No hype words (soars, surges, plunges, tumbles, skyrockets, crashes, explodes, massive, insane, shocking), no ALL CAPS, no emojis, no hashtags, no links, no @mentions.
- No filler ("In contrast", "Notably", "Interestingly", "Meanwhile", "Additionally", "It's worth noting"). Don't repeat a fact already stated. No predictions, no advice.
- Never end with a question. Let the data make the point.

Return JSON: {"headline": string, "tweet": string}
- headline: sentence case, at most 80 characters, MUST contain the key number. Shown large on the chart image.
- tweet: at most 230 characters, two short paragraphs separated by a blank line. Paragraph 1: the striking fact with its number. Paragraph 2: the single most interesting piece of historical context from FACTS.

Style example (different data — never reuse its numbers):
{"headline": "Gold has risen 9 sessions in a row, its longest run since 2019", "tweet": "Gold has closed higher for 9 straight sessions, the longest winning streak since 2019.\n\nThe last 12 times it did this, gold was higher a month later in 8."}`;

let client: OpenAI | null = null;
function getClient() {
  if (!process.env.OPENAI_API_KEY) return null;
  client ??= new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return client;
}

const HYPE = /\b(soar\w*|plung\w*|surg\w*|tumbl\w*|skyrocket\w*|crash\w*|explod\w*|massive|insane|shocking|breaking|indicating)\b|#|https?:|@\w|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/iu;

// Filler that makes posts read like generated text.
const FILLER = /\b(in contrast|notably|interestingly|it'?s worth noting|it is worth noting|meanwhile|additionally|furthermore|moreover|on the other hand)\b/i;

function numbers(s: string): string[] {
  return (s.match(/\d[\d,]*(?:\.\d+)?/g) ?? []).map((t) => t.replace(/,/g, ''));
}


function passesGuard(text: string, allowed: Set<string>, maxLen: number): boolean {
  if (!text || HYPE.test(text) || FILLER.test(text) || xLength(text) > maxLen) return false;
  if (text === text.toUpperCase() && /[A-Z]{6,}/.test(text)) return false;
  return numbers(text).every((n) => allowed.has(n));
}

export type Copy = { headline: string; tweet: string; ai: boolean };

export async function writeCopy(ins: Insight): Promise<Copy> {
  const fallback: Copy = { headline: ins.card.headline, tweet: ins.tweet, ai: false };
  const openai = getClient();
  if (!openai) return fallback;

  const allowed = new Set([...ins.facts, ins.card.headline, ins.card.subtitle, ins.tweet].flatMap(numbers));
  try {
    const res = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.5,
      max_tokens: 300,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: `TOPIC: ${ins.card.kicker}\nFACTS:\n${ins.facts.map((f) => `- ${f}`).join('\n')}\n\nReference post (factually correct, improve the writing if you can):\n${ins.tweet}`,
        },
      ],
    });
    const raw = JSON.parse(res.choices[0]?.message?.content ?? '{}') as { headline?: unknown; tweet?: unknown };
    const headline = typeof raw.headline === 'string' ? raw.headline.trim() : '';
    const tweet = typeof raw.tweet === 'string' ? raw.tweet.trim() : '';
    const okHeadline = headline.length <= 90 && passesGuard(headline, allowed, 120);
    const okTweet = passesGuard(tweet, allowed, 275);
    if (!okHeadline && !okTweet) return fallback;
    return {
      headline: okHeadline ? headline : fallback.headline,
      tweet: okTweet ? tweet : fallback.tweet,
      ai: true,
    };
  } catch (e) {
    console.warn('[market-desk] copywriter failed, using template:', e);
    return fallback;
  }
}
