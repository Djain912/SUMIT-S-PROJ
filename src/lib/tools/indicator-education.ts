// ════════════════════════════════════════════════════════════════════════
// Indicator Lab — universal educational content model.
//
// Every indicator page is driven by one IndicatorEducation record covering the
// 13 teaching modules. RSI is the hand-authored gold standard and the style
// guide for all other indicators. Other indicators are added as drafts (via the
// admin generate→review→publish workflow) and only shown once status==='published'.
// ════════════════════════════════════════════════════════════════════════

import type { IndicatorKey } from '@/components/tools/indicator-tool';

export type Difficulty = 'Beginner' | 'Intermediate' | 'Advanced';
export type Tone = 'bull' | 'bear' | 'neutral' | 'caution';

// 1 — Indicator Snapshot
export interface Snapshot {
  category: string;
  creator: string;
  difficulty: Difficulty;
  formula: string;
  primaryPurpose: string;
  marketType: string;
}

// 2 — Why This Indicator Exists
export interface WhyExists {
  problem: string;
  history: string;
  useCase: string;
}

// 3 — Interactive Calculation Breakdown (narrative; numbers come from the live compute fn)
export interface CalcStep {
  title: string;
  detail: string;
  formula?: string;
}

// 4 — How This Indicator Thinks
export interface HowItThinks {
  measures: string[];
  ignores: string[];
}

// 5 — Market Environment Analysis
export interface MarketEnvironment {
  best: string[];
  worst: string[];
  failures: string[];
}

// 6 — Dynamic Interpretation Engine (data-driven bands; the Lab picks the band for the live value)
export interface InterpretationBand {
  min?: number; // inclusive lower bound
  max?: number; // inclusive upper bound
  label: string;
  tone: Tone;
  message: string;
}

// 7 — Signal Explanation Layer (detectors run in the Lab; copy lives here)
export type SignalType =
  | 'overbought' | 'oversold'
  | 'centerline_up' | 'centerline_down'
  | 'bullish_divergence' | 'bearish_divergence';

export interface SignalDef {
  type: SignalType;
  name: string;
  why: string;
  reliability: string;
}

// 8 — Related Indicator Framework
export interface RelatedFramework {
  sameCategory: { key: IndicatorKey; name: string }[];
  complementary: { key: IndicatorKey; name: string; reason: string }[];
}

// 9 — Compare Indicators Module
export interface Comparison {
  otherKey: IndicatorKey;
  otherName: string;
  formulaDiff: string;
  useCaseDiff: string;
}

// 10 — Common Mistakes
export interface Mistakes {
  beginner: string[];
  professional: string[];
}

// 11 — CMT Exam Corner
export interface CmtCorner {
  keyFormulas: string[];
  testedConcepts: string[];
  traps: string[];
}

// 12 — Interactive Practice Mode
export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number; // index into options
  explanation: string;
}
export interface PracticeMode {
  quiz: QuizQuestion[];
  exercises: string[];
}

// 13 — AI Tutor Integration
export interface AiTutor {
  intro: string;
  suggestedQuestions: string[];
}

export interface IndicatorEducation {
  key: IndicatorKey;
  name: string;
  tagline: string;
  status: 'published' | 'draft';
  snapshot: Snapshot;
  whyExists: WhyExists;
  calcSteps: CalcStep[];
  howItThinks: HowItThinks;
  marketEnvironment: MarketEnvironment;
  interpretation: { bands: InterpretationBand[]; note: string };
  signals: SignalDef[];
  related: RelatedFramework;
  comparisons: Comparison[];
  mistakes: Mistakes;
  cmtCorner: CmtCorner;
  practice: PracticeMode;
  aiTutor: AiTutor;
}

// ════════════════════════════════════════════════════════════════════════
// RSI — gold-standard, hand-authored. Style guide for every other indicator.
// ════════════════════════════════════════════════════════════════════════

const RSI: IndicatorEducation = {
  key: 'rsi',
  name: 'Relative Strength Index (RSI)',
  tagline: 'A bounded momentum oscillator that grades the speed of up-moves against down-moves on a 0–100 scale.',
  status: 'published',
  snapshot: {
    category: 'Momentum oscillator (bounded 0–100)',
    creator: 'J. Welles Wilder Jr. — New Concepts in Technical Trading Systems (1978)',
    difficulty: 'Beginner',
    formula: 'RS = Average Gain ÷ Average Loss   ·   RSI = 100 − (100 ÷ (1 + RS))',
    primaryPurpose: 'Measure the strength and speed of price momentum, and flag overbought / oversold conditions.',
    marketType: 'Most reliable in range-bound markets; needs adjusted thresholds in strong trends.',
  },
  whyExists: {
    problem:
      'Raw momentum measures (like simple rate-of-change) are unbounded and spike with volatility, so a reading of "+8" means nothing without context and can\'t be compared across stocks or time. Traders needed a momentum gauge with fixed, comparable limits.',
    history:
      'Welles Wilder introduced RSI in 1978 alongside ATR, ADX and Parabolic SAR. His key innovation was the Wilder smoothing of average gains and losses, which dampens the wild swings of earlier momentum tools and pins the output to a stable 0–100 range. RSI became one of the most widely used oscillators in technical analysis.',
    useCase:
      'A swing trader watching a range-bound stock uses RSI to time entries: buy interest near oversold (≈30) and trim near overbought (≈70), while using failure swings and divergence to anticipate turns before price confirms.',
  },
  calcSteps: [
    { title: 'Measure each bar\'s change', detail: 'For every bar, record the change vs the prior close. A higher close is a "gain"; a lower close is a "loss" (stored as a positive number). Unchanged = 0 on both.' },
    { title: 'Seed the first averages', detail: 'The very first Average Gain and Average Loss are simple averages of the gains and losses over the first n bars (default n = 14).', formula: 'First Avg Gain = Σ gains ÷ 14   ·   First Avg Loss = Σ losses ÷ 14' },
    { title: 'Apply Wilder smoothing', detail: 'Every bar after that smooths the running average — this is what makes RSI stable instead of jumpy.', formula: 'Avg = ((prev Avg × 13) + current value) ÷ 14' },
    { title: 'Compute Relative Strength (RS)', detail: 'RS is simply how big the average gain is relative to the average loss.', formula: 'RS = Average Gain ÷ Average Loss' },
    { title: 'Convert to the 0–100 scale', detail: 'The final transform squeezes RS into a bounded oscillator so every reading is directly comparable.', formula: 'RSI = 100 − (100 ÷ (1 + RS))' },
  ],
  howItThinks: {
    measures: [
      'The ratio of average up-move size to average down-move size over the lookback.',
      'Relative momentum — whether buyers or sellers have been winning, and by how much.',
      'Persistence of pressure, because Wilder smoothing carries past bars forward.',
    ],
    ignores: [
      'Volume entirely — a 5% rally on huge volume and on thin volume look identical to RSI.',
      'Trend direction and price level — RSI can sit "overbought" for weeks in a strong uptrend.',
      'The size of the move in absolute terms — only the gain-vs-loss ratio matters, not the rupee/point amount.',
      'Gaps and intraday range — it is built on closes only.',
    ],
  },
  marketEnvironment: {
    best: [
      'Range-bound / sideways markets, where 70 and 30 reliably mark the edges of the range.',
      'Liquid instruments with clean two-sided price action.',
      'Spotting momentum divergence ahead of a tired trend reversing.',
    ],
    worst: [
      'Strong, persistent trends — RSI gets "stuck" overbought (uptrend) or oversold (downtrend) and the classic 70/30 signals fail.',
      'Thin or gappy instruments where single bars distort the averages.',
    ],
    failures: [
      'Shorting every tag of 70 in a bull run — RSI can ride 70–80 for a long time while price keeps rising.',
      'Buying every tag of 30 in a downtrend — "oversold" can become "more oversold".',
      'Trading divergence with no price confirmation — divergence can persist far longer than a position can survive.',
    ],
  },
  interpretation: {
    bands: [
      { max: 30, label: 'Oversold', tone: 'bull', message: 'RSI is at or below 30 — down-moves have dominated and price is stretched to the downside. In a range this often precedes a bounce; in a downtrend treat it as strength of the trend, not an automatic buy.' },
      { min: 30, max: 45, label: 'Weak / bearish bias', tone: 'bear', message: 'RSI is below the 50 midline — losses are outweighing gains. Momentum favours sellers, but it is not yet an extreme.' },
      { min: 45, max: 55, label: 'Neutral', tone: 'neutral', message: 'RSI is hovering around the 50 midline — gains and losses are roughly balanced and there is no momentum edge. Wait for a decisive move away from 50.' },
      { min: 55, max: 70, label: 'Strong / bullish bias', tone: 'bull', message: 'RSI is above the 50 midline — gains are outweighing losses and buyers are in control. Healthy uptrends frequently oscillate between 40 and 80.' },
      { min: 70, label: 'Overbought', tone: 'caution', message: 'RSI is at or above 70 — up-moves have dominated and price is stretched to the upside. In a range this often precedes a pullback; in a strong uptrend it can simply confirm trend strength.' },
    ],
    note: 'Thresholds are conditions, not commands. In strong trends shift the lens to 80/40 (uptrend) or 60/20 (downtrend) rather than the textbook 70/30.',
  },
  signals: [
    { type: 'overbought', name: 'Overbought (RSI ≥ 70)', why: 'Average gains have far outpaced average losses, pushing RS — and therefore RSI — to a high extreme.', reliability: 'Moderate in ranges; weak in strong uptrends, where RSI can stay overbought for extended stretches. Best used with price confirmation.' },
    { type: 'oversold', name: 'Oversold (RSI ≤ 30)', why: 'Average losses have far outpaced average gains, dragging RSI to a low extreme.', reliability: 'Moderate in ranges; weak in downtrends. A failure swing off oversold is more reliable than the raw level.' },
    { type: 'centerline_up', name: 'Bullish centerline cross (above 50)', why: 'Average gains have overtaken average losses — momentum has flipped from net-down to net-up.', reliability: 'A solid trend/momentum filter, especially to confirm the direction of a fresh move. Fewer false signals than the 70/30 extremes.' },
    { type: 'centerline_down', name: 'Bearish centerline cross (below 50)', why: 'Average losses have overtaken average gains — momentum has flipped from net-up to net-down.', reliability: 'A solid momentum filter; pairs well with a moving-average trend filter.' },
    { type: 'bearish_divergence', name: 'Bearish divergence', why: 'Price prints a higher high but RSI prints a lower high — the new price high was made on weaker momentum.', reliability: 'A respected early-warning signal at the END of uptrends, but it can persist; always wait for price to confirm with a break of structure.' },
    { type: 'bullish_divergence', name: 'Bullish divergence', why: 'Price prints a lower low but RSI prints a higher low — the new price low was made on less downside force.', reliability: 'A respected early-warning signal at the END of downtrends; confirm with a price break before acting.' },
  ],
  related: {
    sameCategory: [
      { key: 'stochastics', name: 'Stochastics' },
      { key: 'mfi', name: 'Money Flow Index' },
      { key: 'roc', name: 'Rate of Change' },
      { key: 'ppo', name: 'PPO' },
    ],
    complementary: [
      { key: 'macd', name: 'MACD', reason: 'Trend-following momentum — confirms whether an RSI signal aligns with the broader momentum trend.' },
      { key: 'bb', name: 'Bollinger Bands®', reason: 'Volatility context — an RSI extreme that coincides with a band tag is a higher-conviction stretch.' },
      { key: 'obv', name: 'On-Balance Volume', reason: 'Adds the volume dimension RSI ignores — confirms whether momentum has participation behind it.' },
    ],
  },
  comparisons: [
    { otherKey: 'stochastics', otherName: 'Stochastics', formulaDiff: 'RSI uses the ratio of average gains to losses; Stochastics uses where the close sits within the recent high–low range.', useCaseDiff: 'Stochastics is faster and more sensitive (more signals, more noise); RSI is smoother and steadier. Stochastics shines in tight ranges, RSI for cleaner momentum reads.' },
    { otherKey: 'mfi', otherName: 'Money Flow Index', formulaDiff: 'MFI is essentially a volume-weighted RSI — it multiplies each move by volume before forming the ratio.', useCaseDiff: 'Use MFI when you want momentum filtered by participation; use RSI for pure price momentum.' },
    { otherKey: 'macd', otherName: 'MACD', formulaDiff: 'RSI is a bounded 0–100 oscillator from a gain/loss ratio; MACD is an unbounded difference of two EMAs.', useCaseDiff: 'RSI excels at overbought/oversold in ranges; MACD excels at trend and momentum shifts. Many traders pair them.' },
  ],
  mistakes: {
    beginner: [
      'Treating 70 as "sell now" and 30 as "buy now" — they are conditions, not signals.',
      'Using RSI to fight a strong trend by shorting every overbought tag.',
      'Forgetting RSI ignores volume — a momentum spike may have no participation behind it.',
      'Changing the period until it "looks right" (curve-fitting) instead of understanding why.',
    ],
    professional: [
      'Shift thresholds to the regime: 80/40 in uptrends, 60/20 in downtrends, rather than fixed 70/30.',
      'Weight failure swings and divergence over the raw level, and demand price confirmation.',
      'Use the 50 centerline as a trend/momentum filter, not just the extremes.',
      'Combine RSI with a trend filter (e.g. a moving average or MACD) so signals are taken with the trend, not against it.',
    ],
  },
  cmtCorner: {
    keyFormulas: [
      'RS = Average Gain ÷ Average Loss',
      'RSI = 100 − (100 ÷ (1 + RS))',
      'Wilder smoothing: Avg = ((prev Avg × (n−1)) + current) ÷ n  (default n = 14)',
    ],
    testedConcepts: [
      'Wilder is the creator; default period is 14.',
      'RSI is bounded 0–100; 50 is the midline.',
      'Difference between RSI (gain/loss ratio) and Stochastics (range position).',
      'Failure swings (Wilder\'s own preferred signal) and divergence.',
      'Why fixed 70/30 levels fail in trends and how thresholds adapt.',
    ],
    traps: [
      'Confusing "Relative Strength Index" (one security\'s momentum) with "relative strength" (ratio of two securities). The exam tests this.',
      'Assuming overbought = immediate reversal — in a strong trend it confirms strength.',
      'Mixing up which oscillator uses volume: MFI does, RSI does not.',
      'Forgetting RSI uses Wilder smoothing, not a simple moving average, for the gain/loss averages.',
    ],
  },
  practice: {
    quiz: [
      { q: 'Who developed the RSI and in what year?', options: ['John Bollinger, 1980', 'J. Welles Wilder Jr., 1978', 'George Lane, 1957', 'Gerald Appel, 1979'], answer: 1, explanation: 'Wilder introduced RSI in his 1978 book New Concepts in Technical Trading Systems, alongside ATR, ADX and Parabolic SAR.' },
      { q: 'In a strong, persistent uptrend, an RSI reading of 75 most likely indicates:', options: ['An immediate sell signal', 'That the trend is strong and momentum is healthy', 'That RSI is broken and should be ignored', 'A guaranteed reversal within one bar'], answer: 1, explanation: 'In strong uptrends RSI can stay overbought for long stretches. A high reading confirms strength; the classic 70/30 reversal logic applies best in ranges.' },
      { q: 'What does a bearish divergence on RSI describe?', options: ['Price lower low, RSI higher low', 'Price higher high, RSI lower high', 'RSI crossing above 50', 'RSI and price both making new highs'], answer: 1, explanation: 'Bearish divergence = price makes a higher high but RSI makes a lower high, signalling the new high was made on weaker momentum.' },
      { q: 'Which input does RSI completely ignore?', options: ['Closing price', 'The lookback period', 'Volume', 'Average gains'], answer: 2, explanation: 'RSI is built purely from closing-price changes (gains vs losses). Volume plays no role — that is the key difference from the Money Flow Index.' },
      { q: 'The RSI centerline that separates net-bullish from net-bearish momentum is:', options: ['30', '50', '70', '100'], answer: 1, explanation: 'Above 50, average gains exceed average losses (bullish bias); below 50 the reverse. The 50 line is a useful trend/momentum filter.' },
    ],
    exercises: [
      'Drag the period slider between 7 and 21 and watch how a shorter lookback makes RSI noisier (more 70/30 tags) and a longer one smoother.',
      'Find a spot on the chart where RSI tagged 70 but price kept rising — explain why the "overbought = sell" rule failed there.',
      'Identify any divergence between the price peaks and the RSI peaks, then check whether price confirmed it afterward.',
    ],
  },
  aiTutor: {
    intro: 'Ask the Chartix Scholar anything about RSI — how it is built, how to read the current chart, or how it is tested on the CMT exam.',
    suggestedQuestions: [
      'Explain RSI to me like I am a complete beginner.',
      'Why does RSI fail in strong trends, and how do pros adjust?',
      'What is the difference between RSI and the Stochastic oscillator?',
      'How is RSI tested on the CMT Level I exam?',
    ],
  },
};

export const INDICATOR_EDUCATION: Partial<Record<IndicatorKey, IndicatorEducation>> = {
  rsi: RSI,
};

export function getEducation(key: IndicatorKey): IndicatorEducation | null {
  const e = INDICATOR_EDUCATION[key];
  return e && e.status === 'published' ? e : null;
}
