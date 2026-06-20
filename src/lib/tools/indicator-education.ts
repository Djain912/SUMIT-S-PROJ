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
  whyMatters?: string; // "Why This Matters" callout under the step
}

// Institutional / professional interpretation surfaced as emphasis cards
export interface ProInsight {
  title: string;
  body: string;
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

// 7 — Signal Explanation Layer (generic detectors run in the Lab on the
// indicator's primary value series; the copy + thresholds live here).
//   above/below      — value is currently at/beyond `level`
//   cross_above/below — value most recently crossed `level`
//   rising/falling    — the cumulative line is trending up/down
//   *_divergence      — price vs indicator divergence
export type SignalType =
  | 'above' | 'below'
  | 'cross_above' | 'cross_below'
  | 'rising' | 'falling'
  | 'bullish_divergence' | 'bearish_divergence';

export interface SignalDef {
  type: SignalType;
  level?: number; // threshold for above/below/cross_* detectors
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
  proInsights: ProInsight[];
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
      'Raw momentum (e.g. rate-of-change) is unbounded and spikes with volatility — "+8" means nothing on its own and can\'t be compared across stocks or time. RSI exists to give momentum fixed, comparable limits.',
    history:
      'Welles Wilder introduced RSI in 1978 alongside ATR, ADX and Parabolic SAR. His innovation was the smoothing of average gains and losses — it dampens the jumpiness of earlier tools and pins output to a stable 0–100 range.',
    useCase:
      'On a range-bound stock, a swing trader leans long near oversold (~30) and trims near overbought (~70) — but uses failure swings and divergence, not the raw level, to anticipate the actual turn.',
  },
  calcSteps: [
    { title: 'Measure each bar\'s change', detail: 'For every bar, record the change vs the prior close: a higher close is a "gain", a lower close a "loss" (stored positive).', whyMatters: 'RSI only ever sees closing-price changes — this is the exact moment volume and intraday range drop out of the picture.' },
    { title: 'Seed the first averages', detail: 'The first Average Gain and Average Loss are simple averages over the first n bars (default n = 14).', formula: 'First Avg Gain = Σ gains ÷ 14   ·   First Avg Loss = Σ losses ÷ 14' },
    { title: 'Apply Wilder smoothing', detail: 'Every later bar smooths the running average rather than recomputing it — this is what makes RSI stable instead of jumpy.', formula: 'Avg = ((prev Avg × 13) + current value) ÷ 14', whyMatters: 'Wilder smoothing (not a simple MA) is why RSI has "memory" — one big bar nudges it but can\'t whipsaw it. The exam tests that it is Wilder, not SMA.' },
    { title: 'Compute Relative Strength (RS)', detail: 'RS is how large the average gain is relative to the average loss.', formula: 'RS = Average Gain ÷ Average Loss' },
    { title: 'Convert to the 0–100 scale', detail: 'The final transform squeezes RS into a bounded oscillator so every reading is directly comparable.', formula: 'RSI = 100 − (100 ÷ (1 + RS))', whyMatters: 'This is what makes RSI("today") and RSI("a year ago") — or RSI on two different stocks — directly comparable. That comparability is the entire point of the indicator.' },
  ],
  proInsights: [
    { title: 'Read the range, not the line', body: 'Desk analysts care less about the absolute level and more about the band RSI respects. A name that holds 40–80 is in a confirmed uptrend; when it starts holding 20–60, the regime has flipped. The shift in the range often precedes the price trend break.' },
    { title: 'Failure swings over raw levels', body: 'Wilder\'s own preferred signal was the failure swing (RSI fails to retake a prior extreme), not the 70/30 tag. Professionals treat 70/30 as context and wait for a failure swing or divergence with structure confirmation before acting.' },
    { title: 'Period is a regime choice', body: 'Shorter periods (≈9) suit active range-trading; the standard 14 suits swing horizons; longer (≈21–25) filters noise for position work. Pros pick the period to match the holding period — they do not curve-fit it to recent price.' },
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
    { type: 'above', level: 70, name: 'Overbought (RSI ≥ 70)', why: 'Average gains have far outpaced average losses, pushing RS — and therefore RSI — to a high extreme.', reliability: 'Moderate in ranges; weak in strong uptrends, where RSI can stay overbought for extended stretches. Best used with price confirmation.' },
    { type: 'below', level: 30, name: 'Oversold (RSI ≤ 30)', why: 'Average losses have far outpaced average gains, dragging RSI to a low extreme.', reliability: 'Moderate in ranges; weak in downtrends. A failure swing off oversold is more reliable than the raw level.' },
    { type: 'cross_above', level: 50, name: 'Bullish centerline cross (above 50)', why: 'Average gains have overtaken average losses — momentum has flipped from net-down to net-up.', reliability: 'A solid trend/momentum filter, especially to confirm the direction of a fresh move. Fewer false signals than the 70/30 extremes.' },
    { type: 'cross_below', level: 50, name: 'Bearish centerline cross (below 50)', why: 'Average losses have overtaken average gains — momentum has flipped from net-up to net-down.', reliability: 'A solid momentum filter; pairs well with a moving-average trend filter.' },
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

// ════════════════════════════════════════════════════════════════════════
// The remaining indicators. Formulas are taken verbatim from the verified
// calculation layer (src/lib/tools/indicators.ts + the tool META) — never invented.
// ════════════════════════════════════════════════════════════════════════

const MACD: IndicatorEducation = {
  key: 'macd', name: 'MACD (Moving Average Convergence Divergence)',
  tagline: 'A trend-following momentum tool that tracks the gap between a fast and a slow EMA of price.',
  status: 'published',
  snapshot: {
    category: 'Trend-following momentum (unbounded, zero-centered)',
    creator: 'Gerald Appel (late 1970s)',
    difficulty: 'Beginner',
    formula: 'MACD = Fast EMA − Slow EMA   ·   Signal = EMA of MACD   ·   Histogram = MACD − Signal',
    primaryPurpose: 'Reveal momentum shifts and trend direction through the relationship of two EMAs.',
    marketType: 'Best in trending markets; whipsaws in tight ranges.',
  },
  whyExists: {
    problem: 'A single moving average tells you direction but not whether momentum is accelerating or fading. Traders needed one tool that combines trend and momentum.',
    history: 'Gerald Appel built MACD in the late 1970s by subtracting two EMAs (default 12 and 26) and adding a signal line (9). The histogram was added later to visualise the gap.',
    useCase: 'A trend trader buys when the MACD line crosses above its signal line while above zero, and watches the histogram shrink as an early warning that momentum is fading.',
  },
  calcSteps: [
    { title: 'Compute fast & slow EMAs', detail: 'Take a fast EMA (12) and a slow EMA (26) of the close.', formula: 'k = 2 ÷ (n + 1)   ·   EMA = Close × k + prev EMA × (1 − k)' },
    { title: 'MACD line = fast − slow', detail: 'Subtract the slow EMA from the fast EMA.', formula: 'MACD = Fast EMA − Slow EMA', whyMatters: 'When the fast EMA pulls away from the slow EMA, momentum is accelerating; when they converge, it is fading. The MACD line IS that distance.' },
    { title: 'Signal line', detail: 'Smooth the MACD line with a 9-period EMA.', formula: 'Signal = EMA(MACD, 9)' },
    { title: 'Histogram', detail: 'The histogram is the gap between MACD and its signal — it flips before the lines cross.', formula: 'Histogram = MACD − Signal', whyMatters: 'The histogram peaks/troughs before crossovers, giving the earliest read on momentum turning.' },
  ],
  proInsights: [
    { title: 'Zero line = trend, crosses = timing', body: 'Pros read two things separately: which side of zero MACD is on (trend bias) and signal-line crosses (entry timing). A cross above the signal while still below zero is a weaker, counter-trend signal.' },
    { title: 'It is an absolute number', body: 'Because MACD is in price units, you cannot compare it across stocks of different prices — that is exactly what PPO fixes. On a single chart, though, its scale is fine.' },
  ],
  howItThinks: {
    measures: ['The distance between a fast and slow EMA (momentum).', 'Whether that distance is widening or narrowing (acceleration).', 'Trend bias via its position relative to the zero line.'],
    ignores: ['Volume.', 'Absolute price level — values are not comparable between stocks.', 'Volatility regime; it lags in fast reversals because EMAs lag.'],
  },
  marketEnvironment: {
    best: ['Sustained trends, where crossovers and zero-line position align.', 'Daily/weekly charts of liquid instruments.', 'Spotting momentum divergence near the end of a trend.'],
    worst: ['Choppy, sideways markets — frequent false crossovers.', 'Sharp V-reversals, where EMA lag delays the signal.'],
    failures: ['Trading every signal-line cross in a range.', 'Ignoring the zero line and taking counter-trend crosses as full signals.'],
  },
  interpretation: {
    bands: [
      { max: 0, label: 'Below zero — bearish bias', tone: 'bear', message: 'The fast EMA is below the slow EMA: the recent trend is down. Momentum favours sellers until MACD reclaims zero.' },
      { min: 0, label: 'Above zero — bullish bias', tone: 'bull', message: 'The fast EMA is above the slow EMA: the recent trend is up. Momentum favours buyers while MACD holds above zero.' },
    ],
    note: 'The zero line is the trend filter; the signal-line cross is the trigger. Pros prefer crosses that agree with the side of zero MACD sits on.',
  },
  signals: [
    { type: 'cross_above', level: 0, name: 'Bullish zero-line cross', why: 'The fast EMA has risen above the slow EMA — the trend has turned up.', reliability: 'Strong as a trend filter; lags the actual low because EMAs are averages.' },
    { type: 'cross_below', level: 0, name: 'Bearish zero-line cross', why: 'The fast EMA has fallen below the slow EMA — the trend has turned down.', reliability: 'Strong as a trend filter; lags the actual high.' },
    { type: 'bearish_divergence', name: 'Bearish divergence', why: 'Price makes a higher high while MACD makes a lower high — momentum behind the advance is weakening.', reliability: 'A respected early reversal warning at trend ends; confirm with price.' },
    { type: 'bullish_divergence', name: 'Bullish divergence', why: 'Price makes a lower low while MACD makes a higher low — selling force is fading.', reliability: 'A respected early reversal warning; confirm with price.' },
  ],
  related: {
    sameCategory: [{ key: 'ppo', name: 'PPO' }, { key: 'roc', name: 'Rate of Change' }, { key: 'rsi', name: 'RSI' }],
    complementary: [
      { key: 'rsi', name: 'RSI', reason: 'Bounded momentum — flags overbought/oversold that MACD cannot.' },
      { key: 'obv', name: 'On-Balance Volume', reason: 'Adds the volume confirmation MACD ignores.' },
    ],
  },
  comparisons: [
    { otherKey: 'ppo', otherName: 'PPO', formulaDiff: 'PPO divides the EMA gap by the slow EMA and ×100; MACD leaves it in price units.', useCaseDiff: 'Use PPO to compare momentum across stocks or long histories; MACD is fine on a single chart.' },
    { otherKey: 'rsi', otherName: 'RSI', formulaDiff: 'MACD is an unbounded EMA difference; RSI is a bounded 0–100 gain/loss ratio.', useCaseDiff: 'MACD for trend/momentum shifts; RSI for overbought/oversold in ranges.' },
  ],
  mistakes: {
    beginner: ['Treating every signal-line cross as a trade, ignoring the zero line.', 'Expecting MACD to call tops/bottoms — it lags.', 'Comparing MACD values between two different-priced stocks.'],
    professional: ['Filter crosses by the side of zero MACD is on.', 'Use the histogram for early momentum reads, not just the crossover.', 'Pair with a volatility or volume tool to avoid range whipsaws.'],
  },
  cmtCorner: {
    keyFormulas: ['MACD = 12-EMA − 26-EMA', 'Signal = 9-EMA of MACD', 'Histogram = MACD − Signal'],
    testedConcepts: ['Default parameters 12, 26, 9.', 'Gerald Appel is the creator.', 'MACD is unbounded; PPO normalises it.', 'Histogram leads the crossover.'],
    traps: ['Confusing the MACD line with the signal line.', 'Assuming MACD is bounded.', 'Thinking the histogram is a separate input rather than MACD − Signal.'],
  },
  practice: {
    quiz: [
      { q: 'The standard MACD parameters are:', options: ['10, 20, 5', '12, 26, 9', '14, 28, 7', '9, 21, 4'], answer: 1, explanation: 'Default MACD uses a 12-period fast EMA, 26-period slow EMA, and a 9-period signal line.' },
      { q: 'The MACD histogram equals:', options: ['Fast EMA − Slow EMA', 'MACD − Signal line', 'Signal − MACD', 'EMA of the MACD'], answer: 1, explanation: 'The histogram is MACD minus its signal line, so it crosses zero exactly when the two lines cross.' },
      { q: 'MACD above its zero line means:', options: ['The fast EMA is above the slow EMA', 'The stock is overbought', 'Volume is rising', 'A sell signal'], answer: 0, explanation: 'MACD above zero means fast EMA > slow EMA — an uptrend bias. MACD says nothing about volume or overbought levels.' },
    ],
    exercises: ['Find a zero-line cross on the chart and note how many bars it lagged the actual price low.', 'Spot where the histogram shrank before a crossover.'],
  },
  aiTutor: { intro: 'Ask the Chartix Scholar anything about MACD — construction, signals, or how it is tested.', suggestedQuestions: ['Explain MACD simply.', 'What is the difference between MACD and PPO?', 'How do I read the MACD histogram?', 'Why does MACD lag?'] },
};

const PPO: IndicatorEducation = {
  key: 'ppo', name: 'Percentage Price Oscillator (PPO)',
  tagline: 'A normalized MACD shown in percent, so momentum is comparable across any price level.',
  status: 'published',
  snapshot: {
    category: 'Trend-following momentum (unbounded %, zero-centered)',
    creator: 'A normalized variant of Gerald Appel\'s MACD',
    difficulty: 'Intermediate',
    formula: 'PPO = ((Fast EMA − Slow EMA) ÷ Slow EMA) × 100   ·   Signal = EMA of PPO',
    primaryPurpose: 'Measure the same momentum as MACD but as a percentage, comparable across stocks and time.',
    marketType: 'Trending markets; also for cross-asset momentum ranking.',
  },
  whyExists: {
    problem: 'MACD is in price units, so a ₹100 stock and a ₹5,000 stock produce values that cannot be compared. PPO normalises the gap into a percentage.',
    history: 'PPO is a direct refinement of Appel\'s MACD — same EMAs, but the difference is divided by the slow EMA and expressed as a percent.',
    useCase: 'A portfolio manager ranks an entire watchlist by PPO to surface the strongest momentum names regardless of share price.',
  },
  calcSteps: [
    { title: 'Fast & slow EMAs', detail: 'Compute the fast (12) and slow (26) EMAs of the close.' },
    { title: 'Normalise the gap', detail: 'Divide the EMA difference by the slow EMA and ×100.', formula: 'PPO = ((Fast EMA − Slow EMA) ÷ Slow EMA) × 100', whyMatters: 'Dividing by the slow EMA is the whole point — it turns the gap into a percentage so two differently-priced stocks become comparable.' },
    { title: 'Signal & histogram', detail: 'Signal = 9-EMA of PPO; histogram = PPO − Signal.', formula: 'Signal = EMA(PPO, 9)' },
  ],
  proInsights: [
    { title: 'Built for ranking', body: 'PPO\'s superpower is cross-sectional comparison: rank a universe by PPO to find momentum leaders. MACD cannot do this.' },
    { title: 'Same signals as MACD', body: 'Zero-line crosses, signal crosses and divergence read identically to MACD — only the scale changed.' },
  ],
  howItThinks: {
    measures: ['EMA momentum as a percentage of price.', 'Trend bias (side of zero) and acceleration.', 'Comparable momentum across instruments and long histories.'],
    ignores: ['Volume.', 'Volatility regime.', 'Absolute price moves — only the relative gap matters.'],
  },
  marketEnvironment: {
    best: ['Comparing momentum across many stocks.', 'Long backtests where a stock\'s price changed many-fold.', 'Trending conditions.'],
    worst: ['Tight ranges (whipsaws, like MACD).', 'Very low-priced/illiquid names where the slow EMA is unstable.'],
    failures: ['Reading PPO levels as overbought/oversold — it is unbounded.', 'Counter-trend crosses in a range.'],
  },
  interpretation: {
    bands: [
      { max: 0, label: 'Below zero — bearish bias', tone: 'bear', message: 'Fast EMA is below slow EMA: downward momentum, expressed as a negative percentage.' },
      { min: 0, label: 'Above zero — bullish bias', tone: 'bull', message: 'Fast EMA is above slow EMA: upward momentum, expressed as a positive percentage.' },
    ],
    note: 'Because PPO is a %, the same reading is comparable across stocks — that is its key advantage over MACD.',
  },
  signals: [
    { type: 'cross_above', level: 0, name: 'Bullish zero-line cross', why: 'Fast EMA crossed above slow EMA — upward momentum turned positive.', reliability: 'Solid trend filter; lags like all EMA tools.' },
    { type: 'cross_below', level: 0, name: 'Bearish zero-line cross', why: 'Fast EMA crossed below slow EMA — momentum turned negative.', reliability: 'Solid trend filter; lags.' },
    { type: 'bearish_divergence', name: 'Bearish divergence', why: 'Price higher high, PPO lower high — momentum weakening.', reliability: 'Early warning; confirm with price.' },
    { type: 'bullish_divergence', name: 'Bullish divergence', why: 'Price lower low, PPO higher low — selling fading.', reliability: 'Early warning; confirm with price.' },
  ],
  related: {
    sameCategory: [{ key: 'macd', name: 'MACD' }, { key: 'roc', name: 'Rate of Change' }, { key: 'rsi', name: 'RSI' }],
    complementary: [{ key: 'rsi', name: 'RSI', reason: 'Adds bounded overbought/oversold context.' }, { key: 'rvol', name: 'Relative Volume', reason: 'Confirms whether a momentum move has participation.' }],
  },
  comparisons: [
    { otherKey: 'macd', otherName: 'MACD', formulaDiff: 'PPO divides the EMA gap by the slow EMA (×100); MACD does not.', useCaseDiff: 'PPO for cross-stock comparison and long histories; MACD for a single chart.' },
  ],
  mistakes: {
    beginner: ['Treating PPO levels as overbought/oversold.', 'Assuming it differs from MACD in signals — it does not.'],
    professional: ['Use PPO specifically when comparing instruments or over long price ranges.', 'Filter crosses by the zero line, as with MACD.'],
  },
  cmtCorner: {
    keyFormulas: ['PPO = ((Fast EMA − Slow EMA) ÷ Slow EMA) × 100', 'Signal = 9-EMA of PPO'],
    testedConcepts: ['PPO normalises MACD into a percentage.', 'Why % framing enables cross-stock comparison.', 'Same signal set as MACD.'],
    traps: ['Thinking PPO is bounded.', 'Confusing PPO with the Price Oscillator (which is unnormalised, like MACD).'],
  },
  practice: {
    quiz: [
      { q: 'PPO improves on MACD primarily by:', options: ['Adding volume', 'Expressing momentum as a percentage', 'Bounding it 0–100', 'Removing the signal line'], answer: 1, explanation: 'PPO divides the EMA gap by the slow EMA and ×100, making it a percentage that is comparable across stocks.' },
      { q: 'Compared with MACD, PPO\'s signals are:', options: ['Completely different', 'Essentially the same (zero/signal crosses, divergence)', 'Bounded at 70/30', 'Volume-based'], answer: 1, explanation: 'Only the scaling changed; the signal logic is identical to MACD.' },
    ],
    exercises: ['Compare PPO of two different-priced stocks and note that the values are directly comparable.', 'Find a PPO zero-line cross and compare it to MACD on the same bars.'],
  },
  aiTutor: { intro: 'Ask about PPO — why it normalises MACD and when to prefer it.', suggestedQuestions: ['Why use PPO instead of MACD?', 'Is PPO bounded?', 'How do I rank stocks with PPO?'] },
};

const ROC: IndicatorEducation = {
  key: 'roc', name: 'Rate of Change (ROC)',
  tagline: 'The purest momentum measure: the percentage change in price over a chosen lookback.',
  status: 'published',
  snapshot: {
    category: 'Momentum (unbounded %, zero-centered)',
    creator: 'A classic momentum measure in technical analysis',
    difficulty: 'Beginner',
    formula: 'ROC = ((Close today − Close n bars ago) ÷ Close n bars ago) × 100',
    primaryPurpose: 'Measure the speed of price change as a percentage over n bars.',
    marketType: 'Useful in any market for momentum and divergence; noisy in chop.',
  },
  whyExists: {
    problem: 'Traders needed a single number for "how fast is price moving" that is comparable across stocks — a raw point change is not.',
    history: 'Rate of Change is one of the oldest momentum concepts: simply today\'s price versus the price n bars ago, expressed as a percent.',
    useCase: 'A rotation strategy ranks a watchlist by 12-week ROC each week to hold the strongest momentum names and drop the weakest.',
  },
  calcSteps: [
    { title: 'Pick a lookback n', detail: 'Choose how many bars back to compare (the slider).' },
    { title: 'Compute the % change', detail: 'Compare today\'s close to the close n bars ago.', formula: 'ROC = ((Close − Close n ago) ÷ Close n ago) × 100', whyMatters: 'Dividing by the old close makes ROC a percentage — the actual, comparable rate of change, not a raw point move.' },
  ],
  proInsights: [
    { title: 'Momentum, not trend', body: 'ROC rising means price is accelerating; ROC can fall while price still rises (decelerating). Pros watch the change in ROC, not just its sign.' },
    { title: 'Great for ranking', body: 'Because it is a clean percentage, ROC is a favourite for cross-sectional momentum ranking and relative-strength rotation.' },
  ],
  howItThinks: {
    measures: ['The percentage price change over exactly n bars.', 'Momentum direction (sign) and speed (magnitude).'],
    ignores: ['Everything between today and n bars ago (it only sees two points).', 'Volume.', 'Volatility.'],
  },
  marketEnvironment: {
    best: ['Momentum ranking and rotation.', 'Divergence spotting near trend extremes.', 'Breakout confirmation (a ROC surge).'],
    worst: ['Choppy ranges — ROC oscillates noisily around zero.', 'Around the lookback window edge, a single old data point can distort it.'],
    failures: ['Reading a high ROC as "too high" — it is unbounded.', 'Acting on every zero cross in a sideways market.'],
  },
  interpretation: {
    bands: [
      { max: 0, label: 'Negative momentum', tone: 'bear', message: 'Price is lower than it was n bars ago — momentum is to the downside.' },
      { min: 0, label: 'Positive momentum', tone: 'bull', message: 'Price is higher than it was n bars ago — momentum is to the upside. Watch whether ROC is rising (accelerating) or falling (slowing).' },
    ],
    note: 'ROC is the actual % change, so the value is meaningful — but it is unbounded, so judge "high/low" against the asset\'s own history.',
  },
  signals: [
    { type: 'cross_above', level: 0, name: 'Bullish zero-line cross', why: 'Price has risen above its level of n bars ago — momentum flipped positive.', reliability: 'Useful in trends; noisy in ranges.' },
    { type: 'cross_below', level: 0, name: 'Bearish zero-line cross', why: 'Price fell below its level of n bars ago — momentum flipped negative.', reliability: 'Useful in trends; noisy in ranges.' },
    { type: 'bearish_divergence', name: 'Bearish divergence', why: 'Price higher high, ROC lower high — the new high came on slower momentum.', reliability: 'Early warning; confirm with price.' },
    { type: 'bullish_divergence', name: 'Bullish divergence', why: 'Price lower low, ROC higher low — downside momentum easing.', reliability: 'Early warning; confirm with price.' },
  ],
  related: {
    sameCategory: [{ key: 'macd', name: 'MACD' }, { key: 'ppo', name: 'PPO' }, { key: 'rsi', name: 'RSI' }],
    complementary: [{ key: 'rsi', name: 'RSI', reason: 'Bounded momentum to complement ROC\'s unbounded reading.' }, { key: 'sma', name: 'Moving Average', reason: 'Adds trend context to raw momentum.' }],
  },
  comparisons: [
    { otherKey: 'rsi', otherName: 'RSI', formulaDiff: 'ROC is a raw % change between two points; RSI is a smoothed gain/loss ratio bounded 0–100.', useCaseDiff: 'ROC for clean momentum/ranking; RSI for overbought/oversold conditions.' },
    { otherKey: 'macd', otherName: 'MACD', formulaDiff: 'ROC uses two raw price points; MACD uses two EMAs.', useCaseDiff: 'MACD is smoother and trend-oriented; ROC is rawer and faster.' },
  ],
  mistakes: {
    beginner: ['Treating high ROC as an automatic reversal.', 'Forgetting it only looks at two points, ignoring the path between.'],
    professional: ['Watch the rate of change OF ROC (acceleration), not just its level.', 'Use it for relative-strength ranking where its % nature shines.'],
  },
  cmtCorner: {
    keyFormulas: ['ROC = ((Close − Close n ago) ÷ Close n ago) × 100'],
    testedConcepts: ['ROC is unbounded and zero-centered.', 'It is a pure momentum (rate) measure.', 'Difference between momentum (ROC) and a smoothed oscillator (RSI).'],
    traps: ['Assuming ROC is bounded.', 'Confusing "Momentum" (price − price n ago) with "ROC" (the % version).'],
  },
  practice: {
    quiz: [
      { q: 'ROC measures:', options: ['Volume flow', 'The % price change over n bars', 'Volatility', 'Trend strength'], answer: 1, explanation: 'ROC is the percentage change between today\'s close and the close n bars ago.' },
      { q: 'A key limitation of ROC is that it:', options: ['Uses volume', 'Is bounded 0–100', 'Only looks at two data points, ignoring the path between', 'Cannot be charted'], answer: 2, explanation: 'ROC compares only today and n bars ago — whatever happened in between is invisible to it.' },
    ],
    exercises: ['Rank a few stocks by ROC and identify the momentum leader.', 'Find a ROC/price divergence near a turning point.'],
  },
  aiTutor: { intro: 'Ask about ROC — momentum, ranking, and divergence.', suggestedQuestions: ['What does ROC actually measure?', 'How is ROC different from RSI?', 'How do I use ROC for momentum ranking?'] },
};

const STOCHASTICS: IndicatorEducation = {
  key: 'stochastics', name: 'Stochastic Oscillator (%K / %D)',
  tagline: 'Locates the close within the recent high–low range to gauge momentum and exhaustion.',
  status: 'published',
  snapshot: {
    category: 'Momentum oscillator (bounded 0–100)',
    creator: 'George C. Lane (1950s)',
    difficulty: 'Beginner',
    formula: '%K = (Close − Lowest Low n) ÷ (Highest High n − Lowest Low n) × 100   ·   %D = 3-bar average of %K',
    primaryPurpose: 'Show where the close sits in its recent range to flag overbought/oversold and momentum turns.',
    marketType: 'Excellent in ranges; needs care in strong trends.',
  },
  whyExists: {
    problem: 'In a range, closes near the top signal strength and near the bottom signal weakness — traders wanted to quantify exactly where the close finished within the range.',
    history: 'George Lane popularised the Stochastic Oscillator in the 1950s. The name refers to the position of the close relative to its range, not randomness.',
    useCase: 'In a sideways market a trader fades %K turns from above 80 and below 20, using the %K/%D cross for timing.',
  },
  calcSteps: [
    { title: 'Find the range', detail: 'Over the last n bars, find the highest high and lowest low.' },
    { title: 'Locate the close', detail: 'Express the close as a % of where it sits in that range.', formula: '%K = (Close − Lowest Low) ÷ (Highest High − Lowest Low) × 100', whyMatters: 'Closing near the top of the range (%K→100) shows buyers in control; near the bottom (%K→0) shows sellers. That position IS the signal.' },
    { title: 'Smooth into %D', detail: '%D is a 3-bar moving average of %K — the signal line.', formula: '%D = SMA(%K, 3)' },
  ],
  proInsights: [
    { title: 'Faster and noisier than RSI', body: 'Stochastics reacts quicker than RSI, so it gives more signals — and more false ones. Pros use it in confirmed ranges and demand the %K/%D cross plus a level.' },
    { title: 'Crosses over raw levels', body: 'A %K/%D cross coming out of an extreme is more actionable than the bare 80/20 tag, which can persist in a trend.' },
  ],
  howItThinks: {
    measures: ['The close\'s position within the recent high–low range.', 'Short-term momentum and exhaustion.', 'It uses the high and low, not just the close.'],
    ignores: ['Volume.', 'The size of the range (only relative position matters).', 'Trend — it can pin to an extreme in a strong move.'],
  },
  marketEnvironment: {
    best: ['Range-bound markets where 80/20 mark the edges.', 'Timing pullback entries in an established trend.', 'Divergence at tops and bottoms.'],
    worst: ['Strong trends — %K pins near 80 (up) or 20 (down) and stays there.', 'Thin, gappy names where the range distorts.'],
    failures: ['Shorting every tag of 80 in an uptrend.', 'Trading %K/%D crosses against a powerful trend.'],
  },
  interpretation: {
    bands: [
      { max: 20, label: 'Oversold', tone: 'bull', message: '%K is at or below 20 — the close is near the bottom of its recent range. In a range this often precedes a bounce; in a downtrend it can simply confirm weakness.' },
      { min: 20, max: 50, label: 'Lower half — bearish bias', tone: 'bear', message: 'The close is sitting in the lower half of its range; sellers have the edge.' },
      { min: 50, max: 80, label: 'Upper half — bullish bias', tone: 'bull', message: 'The close is in the upper half of its range; buyers have the edge.' },
      { min: 80, label: 'Overbought', tone: 'caution', message: '%K is at or above 80 — the close is near the top of its range. In a range this often precedes a pullback; in a strong uptrend it confirms strength.' },
    ],
    note: 'Like RSI, 80/20 are conditions, not commands. In trends, treat a pinned extreme as strength, and wait for a %K/%D cross to act.',
  },
  signals: [
    { type: 'above', level: 80, name: 'Overbought (%K ≥ 80)', why: 'The close is near the top of its n-bar range.', reliability: 'Good in ranges; weak in uptrends where it can stay pinned.' },
    { type: 'below', level: 20, name: 'Oversold (%K ≤ 20)', why: 'The close is near the bottom of its n-bar range.', reliability: 'Good in ranges; weak in downtrends.' },
    { type: 'cross_above', level: 50, name: 'Bullish midline cross', why: 'The close moved into the upper half of its range — momentum turning up.', reliability: 'A reasonable momentum filter; noisier than RSI\'s.' },
    { type: 'bearish_divergence', name: 'Bearish divergence', why: 'Price higher high, %K lower high — the new high closed weaker within its range.', reliability: 'Useful exhaustion warning; confirm with price.' },
    { type: 'bullish_divergence', name: 'Bullish divergence', why: 'Price lower low, %K higher low — selling exhaustion.', reliability: 'Useful exhaustion warning; confirm with price.' },
  ],
  related: {
    sameCategory: [{ key: 'rsi', name: 'RSI' }, { key: 'mfi', name: 'Money Flow Index' }, { key: 'roc', name: 'Rate of Change' }],
    complementary: [{ key: 'rsi', name: 'RSI', reason: 'Smoother momentum to filter Stochastics\' noise.' }, { key: 'bb', name: 'Bollinger Bands®', reason: 'Volatility context for range edges.' }],
  },
  comparisons: [
    { otherKey: 'rsi', otherName: 'RSI', formulaDiff: 'Stochastics uses range position (high–low); RSI uses average gains vs losses.', useCaseDiff: 'Stochastics is faster/noisier and shines in tight ranges; RSI is smoother for cleaner momentum reads.' },
  ],
  mistakes: {
    beginner: ['Treating 80/20 as automatic sell/buy.', 'Using it as a trend tool — it is a range tool.', 'Ignoring the %K/%D cross and trading the bare level.'],
    professional: ['Demand a %K/%D cross out of an extreme, in the direction of the larger trend.', 'Shift to 90/10 or use slow stochastics to cut noise in trends.'],
  },
  cmtCorner: {
    keyFormulas: ['%K = (Close − Lowest Low) ÷ (Highest High − Lowest Low) × 100', '%D = 3-bar SMA of %K'],
    testedConcepts: ['George Lane is the creator.', 'Fast vs slow stochastics (extra smoothing).', '%K is the raw line, %D the signal.', 'Range-position basis vs RSI\'s gain/loss basis.'],
    traps: ['Confusing %K and %D.', 'Thinking "stochastic" implies randomness.', 'Assuming it uses only the close (it uses high and low too).'],
  },
  practice: {
    quiz: [
      { q: 'The Stochastic %K measures:', options: ['Average gains vs losses', 'Where the close sits within the recent high–low range', 'Volume flow', 'EMA difference'], answer: 1, explanation: '%K locates the close as a percentage of the high–low range over the lookback.' },
      { q: '%D is:', options: ['The raw oscillator', 'A 3-bar moving average of %K (the signal line)', 'The highest high', 'Volume-weighted %K'], answer: 1, explanation: '%D is the 3-period SMA of %K and acts as the signal line.' },
      { q: 'Stochastics is most reliable in:', options: ['Strong trends', 'Range-bound markets', 'Low-volume gaps', 'IPOs'], answer: 1, explanation: 'In ranges, 80/20 reliably mark the edges; in strong trends %K pins to an extreme.' },
    ],
    exercises: ['Find a %K/%D cross emerging from below 20.', 'Spot a place where %K stayed above 80 while price kept rising.'],
  },
  aiTutor: { intro: 'Ask about the Stochastic Oscillator — %K, %D, and range trading.', suggestedQuestions: ['Explain %K and %D simply.', 'How is Stochastics different from RSI?', 'Why does Stochastics fail in trends?'] },
};

const MFI: IndicatorEducation = {
  key: 'mfi', name: 'Money Flow Index (MFI)',
  tagline: 'A volume-weighted RSI — momentum that counts how much money moved, not just price.',
  status: 'published',
  snapshot: {
    category: 'Volume-weighted momentum oscillator (bounded 0–100)',
    creator: 'Gene Quong & Avrum Soudack',
    difficulty: 'Intermediate',
    formula: 'Typical Price = (H+L+C) ÷ 3   ·   MFI = 100 − 100 ÷ (1 + Positive Flow ÷ Negative Flow over n)',
    primaryPurpose: 'Measure buying vs selling pressure like RSI, but weighted by volume.',
    marketType: 'Liquid markets where volume is meaningful; ranges and divergence.',
  },
  whyExists: {
    problem: 'RSI ignores volume, so a momentum spike on thin volume looks identical to one with real participation. MFI brings volume into the momentum read.',
    history: 'Quong and Soudack designed MFI as a volume-weighted version of RSI, using typical price × volume as the "money flow".',
    useCase: 'On a liquid stock, a trader trusts an MFI oversold bounce more than a plain RSI one because it confirms money actually flowed in.',
  },
  calcSteps: [
    { title: 'Typical price', detail: 'Average the high, low, and close.', formula: 'Typical Price = (High + Low + Close) ÷ 3' },
    { title: 'Raw money flow', detail: 'Multiply typical price by volume.', formula: 'Raw Money Flow = Typical Price × Volume', whyMatters: 'This is the step that injects volume — big-volume days move MFI far more than quiet days, unlike RSI.' },
    { title: 'Split positive vs negative', detail: 'Sum money flow on up-days and down-days over n bars.' },
    { title: 'Convert to 0–100', detail: 'Form the ratio and apply the RSI-style transform.', formula: 'MFI = 100 − 100 ÷ (1 + Positive Flow ÷ Negative Flow)' },
  ],
  proInsights: [
    { title: 'Divergence is its edge', body: 'MFI divergence is highly regarded because it shows momentum AND money leaving — a price high on falling MFI means the move lacks funding.' },
    { title: 'Thresholds run wider', body: 'MFI commonly uses 80/20 (vs RSI 70/30) because volume weighting makes it more extreme.' },
  ],
  howItThinks: {
    measures: ['Buying vs selling pressure weighted by volume.', 'Momentum on a bounded 0–100 scale.', 'Whether big moves had participation behind them.'],
    ignores: ['Pure price-only momentum (it always factors volume).', 'Trend direction.', 'Gaps beyond the typical-price calculation.'],
  },
  marketEnvironment: {
    best: ['Liquid instruments with reliable volume.', 'Spotting volume-backed exhaustion via divergence.', 'Range conditions for 80/20 reversals.'],
    worst: ['Thin/illiquid names where volume is erratic.', 'Strong trends — like RSI it can stay extreme.'],
    failures: ['Trusting MFI extremes on low-volume stocks.', 'Fading every 80 tag in a strong uptrend.'],
  },
  interpretation: {
    bands: [
      { max: 20, label: 'Oversold', tone: 'bull', message: 'MFI ≤ 20 — selling pressure (volume-weighted) is at an extreme. In a range this often precedes a bounce.' },
      { min: 20, max: 50, label: 'Net selling pressure', tone: 'bear', message: 'Below the 50 midline — more money has flowed out than in.' },
      { min: 50, max: 80, label: 'Net buying pressure', tone: 'bull', message: 'Above the 50 midline — more money has flowed in than out.' },
      { min: 80, label: 'Overbought', tone: 'caution', message: 'MFI ≥ 80 — buying pressure is at an extreme. In a range this often precedes a pullback; in a strong trend it confirms strength.' },
    ],
    note: 'MFI uses 80/20 by convention. A divergence between price and MFI is its most respected signal because it reveals money leaving.',
  },
  signals: [
    { type: 'above', level: 80, name: 'Overbought (MFI ≥ 80)', why: 'Volume-weighted buying pressure is at an extreme.', reliability: 'Good in ranges; weak in strong uptrends.' },
    { type: 'below', level: 20, name: 'Oversold (MFI ≤ 20)', why: 'Volume-weighted selling pressure is at an extreme.', reliability: 'Good in ranges; weak in downtrends.' },
    { type: 'bearish_divergence', name: 'Bearish divergence', why: 'Price higher high, MFI lower high — the new high came on lighter money flow.', reliability: 'High-regard exhaustion signal; confirm with price.' },
    { type: 'bullish_divergence', name: 'Bullish divergence', why: 'Price lower low, MFI higher low — selling money is drying up.', reliability: 'High-regard exhaustion signal; confirm with price.' },
  ],
  related: {
    sameCategory: [{ key: 'rsi', name: 'RSI' }, { key: 'stochastics', name: 'Stochastics' }],
    complementary: [{ key: 'obv', name: 'On-Balance Volume', reason: 'Cumulative volume flow to corroborate MFI.' }, { key: 'cmf', name: 'Chaikin Money Flow', reason: 'Another volume-pressure read using range position.' }],
  },
  comparisons: [
    { otherKey: 'rsi', otherName: 'RSI', formulaDiff: 'MFI weights each move by volume (typical price × volume); RSI uses price changes only.', useCaseDiff: 'Use MFI when participation matters; RSI for pure price momentum.' },
    { otherKey: 'cmf', otherName: 'Chaikin Money Flow', formulaDiff: 'MFI uses typical price up/down flow with an RSI transform; CMF uses the close\'s position in the range.', useCaseDiff: 'Both gauge money flow; MFI is a bounded oscillator, CMF a ±ratio around zero.' },
  ],
  mistakes: {
    beginner: ['Treating it as identical to RSI (it adds volume).', 'Using it on illiquid names where volume is noise.', 'Fading every 80/20 tag in a trend.'],
    professional: ['Lean on MFI divergence for volume-backed exhaustion.', 'Verify volume quality before trusting extremes.'],
  },
  cmtCorner: {
    keyFormulas: ['Typical Price = (H + L + C) ÷ 3', 'Raw Money Flow = Typical Price × Volume', 'MFI = 100 − 100 ÷ (1 + Positive/Negative Flow)'],
    testedConcepts: ['MFI is a volume-weighted RSI.', 'Uses typical price, not close.', 'Conventional 80/20 levels.', 'Divergence is its signature signal.'],
    traps: ['Saying MFI ignores volume (it is the opposite).', 'Confusing MFI with Chaikin Money Flow.', 'Forgetting it uses typical price (H+L+C)/3.'],
  },
  practice: {
    quiz: [
      { q: 'MFI differs from RSI mainly because it:', options: ['Is unbounded', 'Weights moves by volume', 'Uses EMAs', 'Ignores price'], answer: 1, explanation: 'MFI is essentially a volume-weighted RSI, using typical price × volume as money flow.' },
      { q: 'MFI uses which price input?', options: ['Close only', 'Open only', 'Typical price (H+L+C)/3', 'VWAP'], answer: 2, explanation: 'Money flow is built from the typical price, the average of high, low and close.' },
      { q: 'MFI\'s most respected signal is:', options: ['The 50 cross', 'Price/MFI divergence', 'A gap', 'A golden cross'], answer: 1, explanation: 'Because MFI includes volume, divergence reveals when a price move lacks money behind it.' },
    ],
    exercises: ['Compare MFI and RSI on the same chart and note where volume made them diverge.', 'Find an MFI divergence before a turn.'],
  },
  aiTutor: { intro: 'Ask about the Money Flow Index — volume-weighted momentum.', suggestedQuestions: ['How is MFI different from RSI?', 'What is typical price?', 'Why is MFI divergence important?'] },
};

const DMI: IndicatorEducation = {
  key: 'dmi', name: 'Directional Movement Index (+DI, −DI, ADX)',
  tagline: 'Separates trend direction (+DI vs −DI) from trend strength (ADX).',
  status: 'published',
  snapshot: {
    category: 'Trend strength & direction (ADX 0–100)',
    creator: 'J. Welles Wilder Jr. (1978)',
    difficulty: 'Advanced',
    formula: 'TR = max(H−L, |H−prevC|, |L−prevC|)   ·   +DI = +DM14 ÷ TR14 × 100   ·   DX = |+DI−−DI| ÷ (+DI+−DI) × 100   ·   ADX = Wilder avg of DX',
    primaryPurpose: 'Tell you whether a trend exists, how strong it is (ADX), and which way (+DI/−DI).',
    marketType: 'A trend filter for every market; ADX itself is direction-agnostic.',
  },
  whyExists: {
    problem: 'Most indicators assume a trend exists. Traders needed a way to first answer "is there a trend at all, and how strong?" before applying trend tactics.',
    history: 'Wilder introduced the DMI system in 1978. +DI/−DI capture directional movement; ADX (the smoothed DX) measures strength regardless of direction.',
    useCase: 'A systematic trader only takes trend-following entries when ADX > 25 and rising, and switches to range tactics when ADX < 20.',
  },
  calcSteps: [
    { title: 'True Range', detail: 'Capture the full move including gaps.', formula: 'TR = max(H−L, |H−prevC|, |L−prevC|)' },
    { title: 'Directional movement', detail: '+DM/−DM = the part of today\'s range that lies outside yesterday\'s.', whyMatters: 'DM isolates directional pressure — how much price extended beyond the prior bar, up versus down.' },
    { title: 'Smooth into +DI / −DI', detail: 'Wilder-smooth TR, +DM, −DM, then form the DI lines.', formula: '+DI = +DM14 ÷ TR14 × 100   ·   −DI = −DM14 ÷ TR14 × 100' },
    { title: 'DX then ADX', detail: 'DX measures the spread between the DI lines; ADX smooths DX.', formula: 'DX = |+DI − −DI| ÷ (+DI + −DI) × 100   ·   ADX = Wilder avg of DX', whyMatters: 'ADX rises when one DI dominates the other — i.e. when a trend is strong — regardless of up or down.' },
  ],
  proInsights: [
    { title: 'ADX is direction-blind', body: 'A high ADX means a strong trend — up OR down. Direction comes only from which DI is on top. Pros never read ADX alone as bullish.' },
    { title: 'Rising vs falling ADX', body: 'The slope matters more than the level: a rising ADX = strengthening trend; a falling ADX (even if >25) = a trend losing steam.' },
  ],
  howItThinks: {
    measures: ['Trend strength (ADX), independent of direction.', 'Directional pressure up vs down (+DI/−DI).', 'Gaps, via True Range.'],
    ignores: ['Price level and volume.', 'Direction within ADX itself.', 'Fast reversals (it is heavily smoothed and lags).'],
  },
  marketEnvironment: {
    best: ['Deciding whether to use trend-following or range tactics.', 'Confirming a trend is strong enough to ride.', 'Filtering out choppy, low-ADX whipsaw conditions.'],
    worst: ['Fast reversals — ADX lags badly.', 'Very short timeframes where smoothing dominates.'],
    failures: ['Reading rising ADX as bullish (it can be a strong downtrend).', 'Entering late because ADX confirms strength only after the move is mature.'],
  },
  interpretation: {
    bands: [
      { max: 20, label: 'No / weak trend', tone: 'neutral', message: 'ADX below 20 — little directional conviction. Range-trading tactics suit this environment better than trend-following.' },
      { min: 20, max: 25, label: 'Trend building', tone: 'neutral', message: 'ADX between 20 and 25 — a trend may be forming but is not yet confirmed.' },
      { min: 25, max: 50, label: 'Strong trend', tone: 'bull', message: 'ADX above 25 — a strong trend is in force. Check +DI vs −DI for direction; trend-following tactics are favoured.' },
      { min: 50, label: 'Very strong trend', tone: 'caution', message: 'ADX above 50 — an exceptionally strong trend, but such extremes often precede consolidation. Manage risk on extended moves.' },
    ],
    note: 'ADX measures strength only. Always read +DI vs −DI for direction, and weigh the ADX slope, not just its level.',
  },
  signals: [
    { type: 'cross_above', level: 25, name: 'Trend strengthens (ADX > 25)', why: 'The gap between +DI and −DI has widened enough that one side clearly dominates.', reliability: 'A reliable "trend is now tradable" filter; it lags the trend\'s start.' },
    { type: 'rising', name: 'ADX rising (strengthening)', why: 'DX has been climbing — the prevailing trend is gaining strength.', reliability: 'Good for staying in a trend; says nothing about direction.' },
    { type: 'falling', name: 'ADX falling (weakening)', why: 'DX has been declining — the trend is losing momentum or entering a range.', reliability: 'A useful heads-up to tighten stops; not a reversal signal by itself.' },
  ],
  related: {
    sameCategory: [{ key: 'macd', name: 'MACD' }, { key: 'sma', name: 'Moving Average' }],
    complementary: [{ key: 'rsi', name: 'RSI', reason: 'Once ADX confirms a trend, RSI levels are reinterpreted (e.g. 40–80 band).' }, { key: 'bb', name: 'Bollinger Bands®', reason: 'Volatility context alongside trend strength.' }],
  },
  comparisons: [
    { otherKey: 'macd', otherName: 'MACD', formulaDiff: 'DMI/ADX is built from directional movement and True Range; MACD from two EMAs.', useCaseDiff: 'ADX says IF a trend is strong; MACD says which way momentum is shifting. They pair well.' },
  ],
  mistakes: {
    beginner: ['Reading a high/rising ADX as bullish.', 'Using ADX for direction instead of +DI/−DI.', 'Expecting ADX to call tops and bottoms.'],
    professional: ['Use ADX as a regime switch (trend vs range), not an entry trigger.', 'Weigh the ADX slope; pair direction from the DI lines.'],
  },
  cmtCorner: {
    keyFormulas: ['TR = max(H−L, |H−prevC|, |L−prevC|)', '+DI = +DM14 ÷ TR14 × 100', 'DX = |+DI − −DI| ÷ (+DI + −DI) × 100', 'ADX = Wilder average of DX'],
    testedConcepts: ['Wilder is the creator (1978).', 'ADX measures strength, not direction.', 'ADX > 25 ≈ strong trend.', 'ADX uses Wilder smoothing and True Range.'],
    traps: ['Saying ADX shows direction.', 'Confusing +DI/−DI crosses (direction) with ADX (strength).', 'Forgetting True Range accounts for gaps.'],
  },
  practice: {
    quiz: [
      { q: 'The ADX measures:', options: ['Trend direction', 'Trend strength regardless of direction', 'Volume', 'Overbought levels'], answer: 1, explanation: 'ADX quantifies how strong a trend is; direction comes from +DI vs −DI.' },
      { q: 'An ADX reading above 25 generally indicates:', options: ['A strong trend', 'An uptrend specifically', 'Low volatility', 'A reversal'], answer: 0, explanation: 'ADX > 25 signals a strong trend — up or down. You must check the DI lines for direction.' },
      { q: 'Who developed the DMI/ADX?', options: ['John Bollinger', 'J. Welles Wilder', 'George Lane', 'Marc Chaikin'], answer: 1, explanation: 'Wilder introduced the DMI system in his 1978 book, alongside RSI and ATR.' },
    ],
    exercises: ['Find where ADX crossed above 25 and check which DI was on top.', 'Spot a falling ADX while price kept drifting — a weakening trend.'],
  },
  aiTutor: { intro: 'Ask about DMI and ADX — trend strength versus direction.', suggestedQuestions: ['What does ADX actually measure?', 'How do +DI and −DI work?', 'What ADX level means a strong trend?'] },
};

const RVOL: IndicatorEducation = {
  key: 'rvol', name: 'Relative Volume (RVOL)',
  tagline: 'How today\'s volume compares to normal — the participation gauge behind every move.',
  status: 'published',
  snapshot: {
    category: 'Volume analysis (ratio, centered on 1.0)',
    creator: 'A standard volume-analysis measure',
    difficulty: 'Beginner',
    formula: 'Average Volume = SMA of Volume over n bars   ·   RVOL = Today\'s Volume ÷ Average Volume',
    primaryPurpose: 'Show whether participation is unusually high or low versus the recent norm.',
    marketType: 'Any market; essential for breakout and "in-play" confirmation.',
  },
  whyExists: {
    problem: 'Raw volume is hard to judge — is 2 million shares a lot? Only relative to normal. RVOL turns volume into a comparable multiple.',
    history: 'Relative Volume is a standard scanning measure: today\'s volume divided by the average over a lookback, where 1.0 means "exactly normal".',
    useCase: 'A day-trader\'s scanner only flags setups with RVOL above 2, ensuring there is enough participation for the move to follow through.',
  },
  calcSteps: [
    { title: 'Average volume', detail: 'Take the SMA of volume over the lookback n.', formula: 'Avg Volume = SMA(Volume, n)' },
    { title: 'Form the ratio', detail: 'Divide today\'s volume by the average.', formula: 'RVOL = Volume ÷ Avg Volume', whyMatters: 'The 1.0 line is everything: above it means above-average participation, below it means thin. A breakout on RVOL 3 is far more credible than on RVOL 0.5.' },
  ],
  proInsights: [
    { title: 'Confirmation, not direction', body: 'RVOL never says up or down — it says how much conviction is behind whatever price is doing. Pros use it to validate breakouts and reject thin moves.' },
    { title: 'Climax clue', body: 'An extreme RVOL spike after a long run can mark exhaustion (a buying/selling climax), not just strength.' },
  ],
  howItThinks: {
    measures: ['Today\'s participation versus the recent average.', 'How unusual the current volume is.'],
    ignores: ['Price direction entirely.', 'Where the close finished.', 'Why volume is elevated.'],
  },
  marketEnvironment: {
    best: ['Confirming breakouts and breakdowns.', 'Finding "stocks in play" pre-market.', 'Validating reversals with a participation surge.'],
    worst: ['Quiet, low-volume sessions where everything reads near 1.', 'Around holidays/half-days when averages distort.'],
    failures: ['Acting on a breakout with RVOL below 1 (no participation).', 'Mistaking a one-off news spike for a sustainable trend.'],
  },
  interpretation: {
    bands: [
      { max: 0.5, label: 'Very low participation', tone: 'bear', message: 'RVOL below 0.5 — volume is well under normal. Price moves here are low-conviction and less reliable.' },
      { min: 0.5, max: 1, label: 'Below average', tone: 'neutral', message: 'RVOL between 0.5 and 1 — participation is below the recent norm.' },
      { min: 1, max: 2, label: 'Above average', tone: 'bull', message: 'RVOL between 1 and 2 — above-average participation, which confirms the credibility of price moves.' },
      { min: 2, label: 'Elevated / possibly climactic', tone: 'caution', message: 'RVOL above 2 — significantly elevated volume. High conviction, but extreme spikes after a long run can mark a climax.' },
    ],
    note: 'RVOL is a confirmation tool: it makes breakouts and reversals more (or less) trustworthy, but never gives a direction on its own.',
  },
  signals: [
    { type: 'above', level: 2, name: 'Elevated volume (RVOL ≥ 2)', why: 'Today\'s volume is at least twice the recent average — a high-conviction or climactic session.', reliability: 'Strong confirmation when it aligns with a price event; on its own it is just participation.' },
    { type: 'above', level: 1, name: 'Above-average participation (RVOL ≥ 1)', why: 'Volume is above the recent norm.', reliability: 'Useful breakout filter; the higher the better.' },
    { type: 'below', level: 0.5, name: 'Thin participation (RVOL ≤ 0.5)', why: 'Volume is well below normal — moves lack backing.', reliability: 'A good reason to distrust a breakout or fade.' },
  ],
  related: {
    sameCategory: [{ key: 'obv', name: 'On-Balance Volume' }, { key: 'adl', name: 'Accumulation/Distribution' }, { key: 'cmf', name: 'Chaikin Money Flow' }],
    complementary: [{ key: 'bb', name: 'Bollinger Bands®', reason: 'A squeeze breakout plus high RVOL is a classic high-conviction combo.' }, { key: 'macd', name: 'MACD', reason: 'Volume validates an MACD breakout signal.' }],
  },
  comparisons: [
    { otherKey: 'obv', otherName: 'On-Balance Volume', formulaDiff: 'RVOL compares today\'s volume to its average; OBV accumulates volume by up/down day.', useCaseDiff: 'RVOL gauges participation right now; OBV tracks cumulative flow over time.' },
  ],
  mistakes: {
    beginner: ['Reading RVOL as a direction signal.', 'Trusting breakouts on sub-1 RVOL.', 'Ignoring that averages distort around holidays.'],
    professional: ['Require elevated RVOL to validate breakouts.', 'Treat extreme spikes after long runs as possible climaxes, not just strength.'],
  },
  cmtCorner: {
    keyFormulas: ['Avg Volume = SMA(Volume, n)', 'RVOL = Volume ÷ Avg Volume'],
    testedConcepts: ['1.0 = average; >1 above, <1 below.', 'RVOL confirms, it does not direct.', 'Volume confirmation of breakouts is a core TA principle.'],
    traps: ['Treating RVOL as directional.', 'Confusing relative volume with relative strength.'],
  },
  practice: {
    quiz: [
      { q: 'An RVOL of 2.0 means:', options: ['Price doubled', 'Volume is twice the recent average', 'RSI is 2', 'Two up days'], answer: 1, explanation: 'RVOL is today\'s volume divided by the average, so 2.0 means double the normal participation.' },
      { q: 'RVOL is best used to:', options: ['Predict direction', 'Confirm the conviction behind a move', 'Time exact tops', 'Measure volatility'], answer: 1, explanation: 'RVOL validates whether a price move has participation behind it; it gives no direction itself.' },
    ],
    exercises: ['Find a breakout bar and check its RVOL.', 'Spot a thin (sub-1 RVOL) move and note how it failed to follow through.'],
  },
  aiTutor: { intro: 'Ask about Relative Volume — participation and breakout confirmation.', suggestedQuestions: ['What does RVOL of 1.0 mean?', 'How do I use RVOL for breakouts?', 'Does RVOL show direction?'] },
};

const OBV: IndicatorEducation = {
  key: 'obv', name: 'On-Balance Volume (OBV)',
  tagline: 'A running volume tally that adds on up days and subtracts on down days — the original volume indicator.',
  status: 'published',
  snapshot: {
    category: 'Cumulative volume flow (unbounded)',
    creator: 'Joe Granville (1963)',
    difficulty: 'Beginner',
    formula: 'If Close > prev: OBV = prev OBV + Volume · If Close < prev: OBV = prev OBV − Volume · else unchanged',
    primaryPurpose: 'Track whether volume is flowing in (buying) or out (selling) over time.',
    marketType: 'Any market; best for confirmation and divergence.',
  },
  whyExists: {
    problem: 'Price tells you what happened; traders wanted to know whether volume — the conviction behind it — was confirming or diverging.',
    history: 'Joe Granville introduced OBV in 1963 on the premise that volume precedes price. It was the first widely used cumulative volume indicator.',
    useCase: 'During a flat base, OBV quietly rises — hinting accumulation — and the stock later breaks out, confirming the early volume clue.',
  },
  calcSteps: [
    { title: 'Seed', detail: 'Start OBV at the first bar\'s volume.' },
    { title: 'Add or subtract by day', detail: 'On an up close add volume; on a down close subtract it; if unchanged, hold.', formula: 'OBV = prev OBV ± Volume (sign = today\'s close vs prev close)', whyMatters: 'OBV doesn\'t care HOW MUCH price moved — a 0.1% up day adds the same volume as a 5% up day. Only the direction of the close matters.' },
    { title: 'Read the trend', detail: 'The absolute number is meaningless — only the direction (rising/falling) and divergence from price matter.' },
  ],
  proInsights: [
    { title: 'Slope and divergence, not level', body: 'OBV\'s raw value is arbitrary (it depends on the start point). Pros only read its trend and whether it confirms or diverges from price.' },
    { title: 'Leading clue in bases', body: 'OBV often turns up during accumulation before price breaks out — Granville\'s "volume precedes price" idea.' },
  ],
  howItThinks: {
    measures: ['Cumulative direction of volume flow.', 'Whether buying or selling pressure dominates over time.', 'Confirmation/divergence versus price.'],
    ignores: ['The SIZE of each price move (treats a tiny up-day like a big one).', 'Where the close finished within the range.', 'Absolute price level.'],
  },
  marketEnvironment: {
    best: ['Confirming breakouts with rising OBV.', 'Spotting accumulation/distribution divergence.', 'Trending, liquid names.'],
    worst: ['Choppy, doji-heavy markets where up/down flips add noise.', 'Gappy stocks where a small close difference assigns full volume one way.'],
    failures: ['Reading the raw OBV number as meaningful.', 'Ignoring that one marginal close decides the whole bar\'s volume sign.'],
  },
  interpretation: {
    bands: [
      { max: 0, label: 'Distribution (OBV falling)', tone: 'bear', message: 'OBV\'s recent 10-bar change is negative — volume is flowing out on down days. Selling pressure dominates; watch for price to follow.' },
      { min: 0, label: 'Accumulation (OBV rising)', tone: 'bull', message: 'OBV\'s recent 10-bar change is positive — volume is flowing in on up days. Buying pressure dominates and supports higher prices.' },
    ],
    note: 'Only OBV\'s direction and its divergence from price carry meaning — never the absolute value.',
  },
  signals: [
    { type: 'rising', name: 'OBV rising (accumulation)', why: 'Volume is accumulating on up days — buyers are in control of flow.', reliability: 'Good trend confirmation, especially backing a breakout.' },
    { type: 'falling', name: 'OBV falling (distribution)', why: 'Volume is flowing out on down days — sellers control flow.', reliability: 'Good confirmation of weakness.' },
    { type: 'bearish_divergence', name: 'Bearish divergence', why: 'Price makes a higher high but OBV does not — the breakout lacks volume support.', reliability: 'A classic warning; very useful when it precedes a failed breakout.' },
    { type: 'bullish_divergence', name: 'Bullish divergence', why: 'Price makes a lower low but OBV does not — selling pressure is not confirming.', reliability: 'A classic early-bottom clue; confirm with price.' },
  ],
  related: {
    sameCategory: [{ key: 'adl', name: 'Accumulation/Distribution' }, { key: 'cmf', name: 'Chaikin Money Flow' }, { key: 'rvol', name: 'Relative Volume' }],
    complementary: [{ key: 'rsi', name: 'RSI', reason: 'Adds bounded momentum to OBV\'s volume read.' }, { key: 'macd', name: 'MACD', reason: 'OBV confirms whether an MACD trend has volume behind it.' }],
  },
  comparisons: [
    { otherKey: 'adl', otherName: 'Accumulation/Distribution', formulaDiff: 'OBV adds/subtracts ALL of a day\'s volume by close direction; ADL weights volume by where the close sat in the range.', useCaseDiff: 'ADL is more nuanced intrabar; OBV is simpler and reacts to the close direction only.' },
    { otherKey: 'cmf', otherName: 'Chaikin Money Flow', formulaDiff: 'OBV is a cumulative running total; CMF is a bounded windowed ratio.', useCaseDiff: 'OBV for long-run flow trend; CMF for a bounded recent pressure read.' },
  ],
  mistakes: {
    beginner: ['Interpreting the raw OBV number.', 'Forgetting a tiny close difference assigns the whole bar\'s volume.', 'Using it as a standalone signal.'],
    professional: ['Focus on OBV slope and divergence.', 'Pair with price structure to confirm breakouts.'],
  },
  cmtCorner: {
    keyFormulas: ['Up close: OBV = prev OBV + Volume', 'Down close: OBV = prev OBV − Volume', 'Unchanged: OBV = prev OBV'],
    testedConcepts: ['Joe Granville is the creator (1963).', '"Volume precedes price" premise.', 'Only OBV\'s trend/divergence matters, not its level.', 'OBV uses full volume by close direction.'],
    traps: ['Confusing OBV with ADL (range-weighted).', 'Reading the absolute OBV value.', 'Thinking OBV weights by the size of the price move.'],
  },
  practice: {
    quiz: [
      { q: 'OBV adds a day\'s volume when:', options: ['The high is higher', 'The close is above the previous close', 'Volume rises', 'RSI > 50'], answer: 1, explanation: 'OBV adds the full volume on an up close and subtracts it on a down close.' },
      { q: 'What matters when reading OBV?', options: ['Its absolute value', 'Its trend and divergence from price', 'Its distance from 100', 'Its standard deviation'], answer: 1, explanation: 'OBV\'s raw level is arbitrary; only its direction and divergence carry meaning.' },
      { q: 'Who created OBV?', options: ['Marc Chaikin', 'Joe Granville', 'Welles Wilder', 'John Bollinger'], answer: 1, explanation: 'Joe Granville introduced OBV in 1963 — the original cumulative volume indicator.' },
    ],
    exercises: ['Find a spot where OBV rose before price broke out.', 'Spot a price high that OBV failed to confirm.'],
  },
  aiTutor: { intro: 'Ask about On-Balance Volume — cumulative volume flow.', suggestedQuestions: ['How is OBV calculated?', 'Why does the OBV number not matter?', 'How is OBV different from the A/D line?'] },
};

const ADL: IndicatorEducation = {
  key: 'adl', name: 'Accumulation / Distribution Line (ADL)',
  tagline: 'A running volume total weighted by where each close finished in its range.',
  status: 'published',
  snapshot: {
    category: 'Cumulative volume flow (unbounded)',
    creator: 'Marc Chaikin',
    difficulty: 'Intermediate',
    formula: 'Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low)   ·   ADL = previous ADL + Multiplier × Volume',
    primaryPurpose: 'Gauge buying vs selling pressure by weighting each day\'s volume by the close\'s range position.',
    marketType: 'Any market; confirmation and divergence.',
  },
  whyExists: {
    problem: 'OBV assigns a whole day\'s volume by the close direction alone — but a close near the high is more bullish than one barely up. Chaikin wanted to weight volume by where the close finished.',
    history: 'Marc Chaikin refined volume analysis with a money-flow multiplier that scores each bar from −1 (close at low) to +1 (close at high), then accumulates it.',
    useCase: 'Price chops sideways while the ADL grinds higher — a sign of stealth accumulation ahead of a breakout.',
  },
  calcSteps: [
    { title: 'Money-flow multiplier', detail: 'Score where the close sat in the range, from −1 to +1.', formula: 'Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low)', whyMatters: 'This is the key refinement over OBV — a close at the high scores +1, at the low −1, at the middle 0, so volume is weighted by conviction within the bar.' },
    { title: 'Money-flow volume', detail: 'Multiply the multiplier by the bar\'s volume.', formula: 'MFV = Multiplier × Volume' },
    { title: 'Accumulate', detail: 'Keep a running total.', formula: 'ADL = previous ADL + MFV' },
  ],
  proInsights: [
    { title: 'Range position is the edge', body: 'Because ADL weights by where the close finished, it catches days where price rose but closed weakly (distribution into strength) that OBV would miss.' },
    { title: 'Trend and divergence only', body: 'Like OBV, the ADL level is arbitrary; pros read its slope and its divergence from price.' },
  ],
  howItThinks: {
    measures: ['Volume weighted by the close\'s position in the range.', 'Cumulative buying vs selling pressure.', 'Confirmation/divergence with price.'],
    ignores: ['Gaps between bars (it ignores where the bar opened relative to the prior close).', 'Absolute price level.', 'The ADL\'s own raw value.'],
  },
  marketEnvironment: {
    best: ['Detecting stealth accumulation/distribution.', 'Confirming breakouts with a volume-flow surge.', 'Divergence at trend extremes.'],
    worst: ['Gappy stocks — the multiplier ignores overnight gaps, distorting flow.', 'Very low-volume names.'],
    failures: ['Reading the raw ADL number.', 'Trusting it on gappy instruments where the gap is ignored.'],
  },
  interpretation: {
    bands: [
      { max: 0, label: 'Distribution (ADL falling)', tone: 'bear', message: 'The ADL\'s recent 10-bar change is negative — closes are finishing low in their ranges on volume. Selling pressure dominates.' },
      { min: 0, label: 'Accumulation (ADL rising)', tone: 'bull', message: 'The ADL\'s recent 10-bar change is positive — closes are finishing high in their ranges on volume. Buying pressure dominates.' },
    ],
    note: 'Read the ADL\'s direction and its divergence from price — the absolute value is meaningless.',
  },
  signals: [
    { type: 'rising', name: 'ADL rising (accumulation)', why: 'Closes are finishing strong in their ranges with volume — net buying.', reliability: 'Good confirmation of an advance.' },
    { type: 'falling', name: 'ADL falling (distribution)', why: 'Closes are finishing weak in their ranges with volume — net selling.', reliability: 'Good confirmation of weakness.' },
    { type: 'bearish_divergence', name: 'Bearish divergence', why: 'Price higher high while ADL does not confirm — distribution into strength.', reliability: 'A valued warning; confirm with price.' },
    { type: 'bullish_divergence', name: 'Bullish divergence', why: 'Price lower low while ADL holds up — accumulation into weakness.', reliability: 'A valued early-bottom clue; confirm with price.' },
  ],
  related: {
    sameCategory: [{ key: 'obv', name: 'On-Balance Volume' }, { key: 'cmf', name: 'Chaikin Money Flow' }, { key: 'rvol', name: 'Relative Volume' }],
    complementary: [{ key: 'rsi', name: 'RSI', reason: 'Bounded momentum alongside ADL\'s flow.' }, { key: 'macd', name: 'MACD', reason: 'Confirms whether a trend has volume flow behind it.' }],
  },
  comparisons: [
    { otherKey: 'obv', otherName: 'On-Balance Volume', formulaDiff: 'ADL weights volume by the close\'s range position (−1..+1); OBV assigns full volume by close direction.', useCaseDiff: 'ADL is more nuanced within the bar; OBV is simpler and gap-sensitive via the close.' },
    { otherKey: 'cmf', otherName: 'Chaikin Money Flow', formulaDiff: 'ADL is a cumulative running total of money-flow volume; CMF is that money flow summed over n and divided by volume (bounded).', useCaseDiff: 'ADL for long-run flow trend; CMF for a bounded recent reading.' },
  ],
  mistakes: {
    beginner: ['Reading the raw ADL number.', 'Forgetting it ignores gaps between bars.', 'Using it standalone.'],
    professional: ['Read slope and divergence; weight range-position closes.', 'Be cautious on gappy names where the multiplier misses overnight moves.'],
  },
  cmtCorner: {
    keyFormulas: ['Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low)', 'MFV = Multiplier × Volume', 'ADL = previous ADL + MFV'],
    testedConcepts: ['Marc Chaikin developed it.', 'The money-flow multiplier ranges −1 to +1.', 'ADL ignores gaps (unlike OBV\'s close-to-close logic).', 'Only trend/divergence matter.'],
    traps: ['Confusing ADL with OBV.', 'Confusing the ADL (cumulative) with CMF (bounded ratio).', 'Forgetting the gap blind spot.'],
  },
  practice: {
    quiz: [
      { q: 'The A/D money-flow multiplier is +1 when:', options: ['Volume doubles', 'The close is at the high of the bar', 'The close is at the low', 'Price gaps up'], answer: 1, explanation: 'Multiplier = ((Close−Low)−(High−Close))/(High−Low); it equals +1 when the close is at the high.' },
      { q: 'A key difference between ADL and OBV is that ADL:', options: ['Is bounded 0–100', 'Weights volume by the close\'s range position', 'Ignores volume', 'Uses EMAs'], answer: 1, explanation: 'ADL scores each bar by where the close finished in its range; OBV assigns full volume by close direction.' },
    ],
    exercises: ['Find a flat price stretch where ADL rose (accumulation).', 'Spot an ADL/price divergence.'],
  },
  aiTutor: { intro: 'Ask about the Accumulation/Distribution Line — range-weighted volume flow.', suggestedQuestions: ['How is the A/D line calculated?', 'How is ADL different from OBV?', 'What is the money-flow multiplier?'] },
};

const CMF: IndicatorEducation = {
  key: 'cmf', name: 'Chaikin Money Flow (CMF)',
  tagline: 'A bounded read of buying vs selling pressure: money-flow volume summed over a window.',
  status: 'published',
  snapshot: {
    category: 'Volume-pressure oscillator (bounded ≈ −1 to +1)',
    creator: 'Marc Chaikin',
    difficulty: 'Intermediate',
    formula: 'Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low)   ·   MFV = Multiplier × Volume   ·   CMF = Σ(MFV, n) ÷ Σ(Volume, n)',
    primaryPurpose: 'Show net buying vs selling pressure as a bounded ratio around zero.',
    marketType: 'Any liquid market; confirmation and pressure shifts.',
  },
  whyExists: {
    problem: 'The A/D line is a cumulative, unbounded number — hard to compare over time. Chaikin wanted a bounded, mean-reverting version that reads net pressure over a recent window.',
    history: 'Marc Chaikin took his money-flow multiplier and, instead of accumulating forever, summed it over n bars and divided by volume — producing a value that oscillates around zero.',
    useCase: 'A trader confirms an uptrend only while CMF holds above zero, and treats a drop below zero as a warning that selling pressure has taken over.',
  },
  calcSteps: [
    { title: 'Money-flow multiplier', detail: 'Score the close\'s range position (−1 to +1).', formula: 'Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low)' },
    { title: 'Money-flow volume', detail: 'Weight the bar\'s volume by that multiplier.', formula: 'MFV = Multiplier × Volume' },
    { title: 'Window ratio', detail: 'Sum MFV and volume over n bars and divide.', formula: 'CMF = Σ(MFV, n) ÷ Σ(Volume, n)', whyMatters: 'Dividing by total volume normalises the reading and bounds it — that is what makes CMF comparable over time, unlike the cumulative A/D line.' },
  ],
  proInsights: [
    { title: 'Zero line is the pivot', body: 'Sustained CMF above zero = accumulation; below = distribution. The ±0.25 zones flag strong pressure. Pros watch the zero cross as a pressure-regime change.' },
    { title: 'Bounded cousin of ADL', body: 'Same multiplier as the A/D line, but windowed and normalised — so CMF mean-reverts while ADL trends forever.' },
  ],
  howItThinks: {
    measures: ['Net buying vs selling pressure over the last n bars.', 'Volume weighted by close range-position.', 'A bounded, comparable pressure reading.'],
    ignores: ['Gaps between bars (the multiplier ignores them).', 'Absolute price level.', 'Pure price momentum.'],
  },
  marketEnvironment: {
    best: ['Confirming trends via persistent above/below-zero readings.', 'Detecting pressure shifts at the zero line.', 'Divergence with price.'],
    worst: ['Gappy stocks (gap blind spot).', 'Very low-volume names where the ratio is unstable.'],
    failures: ['Reading tiny zero-line wiggles as signals.', 'Trusting it on gap-driven instruments.'],
  },
  interpretation: {
    bands: [
      { max: -0.25, label: 'Strong selling pressure', tone: 'bear', message: 'CMF below −0.25 — heavy distribution: closes finishing low in their ranges on volume.' },
      { min: -0.25, max: -0.05, label: 'Mild selling pressure', tone: 'bear', message: 'CMF modestly below zero — net selling, but not extreme.' },
      { min: -0.05, max: 0.05, label: 'Balanced / neutral', tone: 'neutral', message: 'CMF near zero — buying and selling pressure are roughly balanced; no clear edge.' },
      { min: 0.05, max: 0.25, label: 'Mild buying pressure', tone: 'bull', message: 'CMF modestly above zero — net buying, but not extreme.' },
      { min: 0.25, label: 'Strong buying pressure', tone: 'bull', message: 'CMF above +0.25 — heavy accumulation: closes finishing high in their ranges on volume.' },
    ],
    note: 'The zero line separates accumulation from distribution; ±0.25 marks strong pressure. Watch for persistence, not single-bar flickers.',
  },
  signals: [
    { type: 'above', level: 0.25, name: 'Strong buying (CMF ≥ 0.25)', why: 'Money-flow volume is strongly positive over the window.', reliability: 'Good confirmation of an advance; persistence matters.' },
    { type: 'below', level: -0.25, name: 'Strong selling (CMF ≤ −0.25)', why: 'Money-flow volume is strongly negative over the window.', reliability: 'Good confirmation of weakness.' },
    { type: 'cross_above', level: 0, name: 'Bullish zero cross', why: 'Net flow shifted from distribution to accumulation.', reliability: 'A meaningful pressure-regime change; avoid acting on tiny flickers.' },
    { type: 'cross_below', level: 0, name: 'Bearish zero cross', why: 'Net flow shifted from accumulation to distribution.', reliability: 'A meaningful pressure-regime change.' },
  ],
  related: {
    sameCategory: [{ key: 'adl', name: 'Accumulation/Distribution' }, { key: 'obv', name: 'On-Balance Volume' }, { key: 'mfi', name: 'Money Flow Index' }],
    complementary: [{ key: 'rsi', name: 'RSI', reason: 'Bounded momentum alongside bounded volume pressure.' }, { key: 'macd', name: 'MACD', reason: 'Confirms trend has flow support.' }],
  },
  comparisons: [
    { otherKey: 'adl', otherName: 'Accumulation/Distribution', formulaDiff: 'CMF sums money-flow volume over n and divides by volume (bounded); ADL accumulates it forever (unbounded).', useCaseDiff: 'CMF for a bounded recent pressure read; ADL for the long-run flow trend.' },
    { otherKey: 'mfi', otherName: 'Money Flow Index', formulaDiff: 'CMF uses the close\'s range position; MFI uses typical-price up/down flow with an RSI transform.', useCaseDiff: 'Both are bounded volume tools; MFI behaves like an oscillator (0–100), CMF swings around zero.' },
  ],
  mistakes: {
    beginner: ['Reacting to tiny zero-line wiggles.', 'Confusing CMF with the cumulative A/D line.', 'Using it on gappy names.'],
    professional: ['Demand persistence above/below zero, not single bars.', 'Use ±0.25 to grade pressure strength.'],
  },
  cmtCorner: {
    keyFormulas: ['Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low)', 'CMF = Σ(MFV, n) ÷ Σ(Volume, n)'],
    testedConcepts: ['Marc Chaikin developed it.', 'CMF is a bounded, windowed version of the A/D line.', 'Zero line = accumulation vs distribution.', 'Same gap blind spot as ADL.'],
    traps: ['Confusing CMF (bounded ratio) with ADL (cumulative).', 'Confusing CMF with MFI.', 'Over-reading near-zero values.'],
  },
  practice: {
    quiz: [
      { q: 'CMF differs from the A/D line because it:', options: ['Ignores volume', 'Is a bounded ratio over a window (not a cumulative total)', 'Uses EMAs', 'Is unbounded'], answer: 1, explanation: 'CMF sums money-flow volume over n bars and divides by volume, producing a bounded value around zero; ADL accumulates forever.' },
      { q: 'A CMF reading above +0.25 indicates:', options: ['Strong selling', 'Strong buying pressure', 'Low volatility', 'An uptrend in price only'], answer: 1, explanation: 'CMF above +0.25 signals strong accumulation — closes finishing high in their ranges on volume.' },
    ],
    exercises: ['Find a CMF zero-line cross and check price behaviour after.', 'Spot a price/CMF divergence.'],
  },
  aiTutor: { intro: 'Ask about Chaikin Money Flow — bounded volume pressure.', suggestedQuestions: ['How is CMF different from the A/D line?', 'What does the CMF zero line mean?', 'How is CMF different from MFI?'] },
};

// ── Moving averages share structure; each highlights its distinct weighting ──
const SMA: IndicatorEducation = {
  key: 'sma', name: 'Simple Moving Average (SMA)',
  tagline: 'The plain average of the last n closes — the foundation of all moving averages.',
  status: 'published',
  snapshot: {
    category: 'Trend (overlay)', creator: 'A foundational technical-analysis tool', difficulty: 'Beginner',
    formula: 'SMA = (C1 + C2 + ... + Cn) ÷ n',
    primaryPurpose: 'Smooth price to reveal the underlying trend and provide dynamic support/resistance.',
    marketType: 'Trending markets; the 50- and 200-day are institutional reference lines.',
  },
  whyExists: {
    problem: 'Raw price is noisy. Traders needed a simple way to see the underlying direction beneath the day-to-day wiggle.',
    history: 'The simple moving average is the oldest smoothing tool in technical analysis — a rolling equal-weight average of recent closes.',
    useCase: 'A long-term investor only buys when price is above the 200-day SMA, keeping on the right side of the primary trend.',
  },
  calcSteps: [
    { title: 'Pick a period n', detail: 'E.g. 20, 50 or 200 bars.' },
    { title: 'Average the closes', detail: 'Add the last n closes and divide by n.', formula: 'SMA = (C1 + ... + Cn) ÷ n' },
    { title: 'Slide forward', detail: 'Each new bar drops the oldest close and adds the newest.', whyMatters: 'Every bar in the window has EQUAL weight — that simplicity is the SMA\'s strength, and the reason it lags fast moves more than weighted averages.' },
  ],
  proInsights: [
    { title: 'The 50/200 are self-fulfilling', body: 'So many institutions watch the 50- and 200-day SMAs that they act as real support/resistance — their power is partly reflexive.' },
    { title: 'Equal weight = more lag', body: 'Because old and new bars count the same, the SMA reacts slower than EMA/LWMA. Pros choose SMA when they want stability over speed.' },
  ],
  howItThinks: {
    measures: ['The average price level over n bars.', 'Trend direction (price vs MA, and MA slope).'],
    ignores: ['Volume.', 'The order of prices within the window.', 'Recency — all bars weigh the same.'],
  },
  marketEnvironment: {
    best: ['Trending markets as a direction filter.', 'Dynamic support/resistance (50/200-day).', 'Crossover systems (e.g. 50 over 200).'],
    worst: ['Sideways markets — repeated false crossovers.', 'Sharp reversals, where its lag is costly.'],
    failures: ['Whipsaws from MA crosses in a range.', 'Late entries/exits because of lag.'],
  },
  interpretation: {
    bands: [
      { max: -5, label: 'Far below the MA (extended down)', tone: 'bull', message: 'Price is well below its SMA — a downtrend, but also stretched, so a mean-reversion bounce toward the MA is possible.' },
      { min: -5, max: 0, label: 'Below the MA (downtrend bias)', tone: 'bear', message: 'Price is under its SMA — the trend bias is down.' },
      { min: 0, max: 5, label: 'Above the MA (uptrend bias)', tone: 'bull', message: 'Price is above its SMA — the trend bias is up.' },
      { min: 5, label: 'Far above the MA (extended up)', tone: 'caution', message: 'Price is well above its SMA — a strong uptrend, but stretched; a pullback toward the MA is possible.' },
    ],
    note: 'Here the live value is price\'s % distance from the SMA. Crossing zero = price crossing its average — a classic trend-change cue.',
  },
  signals: [
    { type: 'cross_above', level: 0, name: 'Price reclaims the MA', why: 'Price has crossed from below to above its moving average — a bullish trend cue.', reliability: 'Decent trend signal; prone to whipsaw in ranges.' },
    { type: 'cross_below', level: 0, name: 'Price loses the MA', why: 'Price has crossed from above to below its moving average — a bearish trend cue.', reliability: 'Decent trend signal; whipsaws in ranges.' },
  ],
  related: {
    sameCategory: [{ key: 'ema', name: 'EMA' }, { key: 'lwma', name: 'LWMA' }, { key: 'wilderma', name: 'Wilder MA' }, { key: 'distma', name: 'Distance from MA' }],
    complementary: [{ key: 'dmi', name: 'ADX', reason: 'Tells you whether the trend the SMA shows is strong enough to trade.' }, { key: 'bb', name: 'Bollinger Bands®', reason: 'Built on an SMA, adding a volatility envelope.' }],
  },
  comparisons: [
    { otherKey: 'ema', otherName: 'EMA', formulaDiff: 'SMA weights all n bars equally; EMA weights recent bars more via k = 2/(n+1).', useCaseDiff: 'EMA reacts faster (earlier signals, more noise); SMA is smoother and steadier.' },
    { otherKey: 'lwma', otherName: 'LWMA', formulaDiff: 'SMA is equal-weight; LWMA weights linearly (newest = n, oldest = 1).', useCaseDiff: 'LWMA responds faster than SMA without EMA\'s exponential tail.' },
  ],
  mistakes: {
    beginner: ['Expecting MA crosses to work in ranges.', 'Using one MA period for every timeframe.', 'Forgetting the SMA lags by design.'],
    professional: ['Match the MA period to the holding horizon.', 'Use the 50/200 as context, combined with a strength filter like ADX.'],
  },
  cmtCorner: {
    keyFormulas: ['SMA = (C1 + C2 + ... + Cn) ÷ n'],
    testedConcepts: ['SMA is equal-weighted.', 'Golden Cross / Death Cross (50 vs 200).', 'MAs lag; longer = smoother + slower.', 'SMA is the basis of Bollinger Bands.'],
    traps: ['Confusing SMA with EMA weighting.', 'Assuming MAs predict (they lag).', 'Mixing up Golden/Death cross direction.'],
  },
  practice: {
    quiz: [
      { q: 'In an SMA, the most recent close is weighted:', options: ['More than older closes', 'The same as every other close', 'Less than older closes', 'By volume'], answer: 1, explanation: 'The SMA is an equal-weight average — every bar in the window counts the same.' },
      { q: 'A "Golden Cross" is:', options: ['Price crossing the 200-day', 'The 50-day SMA crossing above the 200-day', 'RSI crossing 50', 'Two EMAs touching'], answer: 1, explanation: 'The Golden Cross is the 50-day SMA crossing above the 200-day — a long-term bullish signal.' },
    ],
    exercises: ['Compare a 50- and 200-day SMA and find a crossover.', 'Note how far price stretched above the SMA before reverting.'],
  },
  aiTutor: { intro: 'Ask about the Simple Moving Average — trend, support, and crossovers.', suggestedQuestions: ['How is an SMA calculated?', 'What is the Golden Cross?', 'SMA vs EMA — which should I use?'] },
};

const EMA: IndicatorEducation = {
  key: 'ema', name: 'Exponential Moving Average (EMA)',
  tagline: 'A moving average that weights recent closes more heavily, so it turns faster than the SMA.',
  status: 'published',
  snapshot: {
    category: 'Trend (overlay)', creator: 'A foundational technical-analysis tool', difficulty: 'Beginner',
    formula: 'k = 2 ÷ (n + 1)   ·   EMA = (Close × k) + (Previous EMA × (1 − k))',
    primaryPurpose: 'Track the trend with more weight on recent price, for a faster response than SMA.',
    marketType: 'Trending and faster-moving markets; the engine inside MACD/PPO.',
  },
  whyExists: {
    problem: 'The SMA treats a month-old close the same as today\'s, so it lags. Traders wanted an average that emphasises recent action.',
    history: 'The exponential moving average applies a smoothing multiplier so weight decays geometrically into the past — never zero, but quickly negligible.',
    useCase: 'An active trader uses 9/21 EMAs intraday to catch trend changes earlier than the SMA would allow.',
  },
  calcSteps: [
    { title: 'Smoothing multiplier', detail: 'Compute k from the period.', formula: 'k = 2 ÷ (n + 1)', whyMatters: 'k sets how fast the EMA reacts: shorter n → larger k → more weight on today\'s close → quicker turns.' },
    { title: 'Seed', detail: 'Start the EMA at the first close (or an SMA seed).' },
    { title: 'Recurse', detail: 'Blend today\'s close with the prior EMA.', formula: 'EMA = Close × k + Previous EMA × (1 − k)' },
  ],
  proInsights: [
    { title: 'Speed cuts both ways', body: 'EMA turns earlier than SMA on real reversals — and also on false ones. Pros accept more noise for earlier signals.' },
    { title: 'It is everywhere', body: 'MACD, PPO and many systems are built from EMAs — understanding the EMA explains how those tools behave.' },
  ],
  howItThinks: {
    measures: ['The trend with emphasis on recent closes.', 'Direction (price vs EMA and EMA slope).'],
    ignores: ['Volume.', 'Old data beyond a few periods (weight decays).', 'The exact path — only weighted closes.'],
  },
  marketEnvironment: {
    best: ['Faster timeframes and active trading.', 'Dynamic support in trends (e.g. 20-EMA pullbacks).', 'As the building block of MACD/PPO.'],
    worst: ['Ranges — even more whipsaw-prone than SMA due to speed.', 'Erratic, gappy names.'],
    failures: ['Chasing every EMA cross in chop.', 'Over-trusting an early signal that reverses.'],
  },
  interpretation: {
    bands: [
      { max: -5, label: 'Far below the EMA (extended down)', tone: 'bull', message: 'Price is well below its EMA — downtrend, but stretched; a bounce toward the EMA is possible.' },
      { min: -5, max: 0, label: 'Below the EMA (downtrend bias)', tone: 'bear', message: 'Price is under its EMA — bias down.' },
      { min: 0, max: 5, label: 'Above the EMA (uptrend bias)', tone: 'bull', message: 'Price is above its EMA — bias up.' },
      { min: 5, label: 'Far above the EMA (extended up)', tone: 'caution', message: 'Price is well above its EMA — strong but stretched; watch for a pullback.' },
    ],
    note: 'Live value = price\'s % distance from the EMA. The EMA reacts faster than an SMA of the same period, so crosses come earlier.',
  },
  signals: [
    { type: 'cross_above', level: 0, name: 'Price reclaims the EMA', why: 'Price crossed above its EMA — bullish, and earlier than an SMA would show.', reliability: 'Faster than SMA; more whipsaw in ranges.' },
    { type: 'cross_below', level: 0, name: 'Price loses the EMA', why: 'Price crossed below its EMA — bearish.', reliability: 'Faster than SMA; more whipsaw.' },
  ],
  related: {
    sameCategory: [{ key: 'sma', name: 'SMA' }, { key: 'lwma', name: 'LWMA' }, { key: 'wilderma', name: 'Wilder MA' }, { key: 'distma', name: 'Distance from MA' }],
    complementary: [{ key: 'macd', name: 'MACD', reason: 'MACD is literally the difference of two EMAs.' }, { key: 'dmi', name: 'ADX', reason: 'Confirms the EMA trend is strong enough to follow.' }],
  },
  comparisons: [
    { otherKey: 'sma', otherName: 'SMA', formulaDiff: 'EMA weights recent closes more (k = 2/(n+1)); SMA weights all equally.', useCaseDiff: 'EMA = earlier signals + more noise; SMA = smoother + slower.' },
    { otherKey: 'wilderma', otherName: 'Wilder MA', formulaDiff: 'EMA uses k = 2/(n+1); Wilder uses k = 1/n (slower).', useCaseDiff: 'Wilder is smoother/slower and is the smoothing inside RSI/ADX/ATR.' },
  ],
  mistakes: {
    beginner: ['Assuming faster is always better.', 'Using EMA crosses in ranges.', 'Ignoring that EMA still lags.'],
    professional: ['Match EMA speed to timeframe; accept noise for earlier signals.', 'Use EMA pullbacks as entries within a confirmed trend.'],
  },
  cmtCorner: {
    keyFormulas: ['k = 2 ÷ (n + 1)', 'EMA = Close × k + Previous EMA × (1 − k)'],
    testedConcepts: ['EMA weights recent data more; weight decays geometrically.', 'k = 2/(n+1) (vs Wilder\'s 1/n).', 'EMA is the basis of MACD/PPO.', 'Shorter period → faster reaction.'],
    traps: ['Confusing EMA\'s k with Wilder\'s k.', 'Thinking EMA fully drops old data (it never reaches zero).', 'Assuming EMA leads price (it still lags).'],
  },
  practice: {
    quiz: [
      { q: 'The EMA smoothing multiplier is:', options: ['1 ÷ n', '2 ÷ (n + 1)', 'n ÷ (n+1)', 'n × 2'], answer: 1, explanation: 'EMA uses k = 2/(n+1); Wilder\'s MA uses k = 1/n.' },
      { q: 'Compared with an SMA of the same period, an EMA:', options: ['Lags more', 'Reacts faster to recent prices', 'Ignores recent prices', 'Is identical'], answer: 1, explanation: 'The EMA weights recent closes more heavily, so it turns earlier than the equal-weight SMA.' },
    ],
    exercises: ['Overlay a 20-SMA and 20-EMA and see which turns first.', 'Find a 20-EMA pullback entry in a trend.'],
  },
  aiTutor: { intro: 'Ask about the EMA — weighting, speed, and its role in MACD.', suggestedQuestions: ['How is an EMA different from an SMA?', 'What does the multiplier k do?', 'Why is the EMA used inside MACD?'] },
};

const LWMA: IndicatorEducation = {
  key: 'lwma', name: 'Linearly Weighted Moving Average (LWMA)',
  tagline: 'Weights closes linearly — newest gets weight n, oldest gets 1 — for a fast-but-controlled average.',
  status: 'published',
  snapshot: {
    category: 'Trend (overlay)', creator: 'A weighted-average variant in technical analysis', difficulty: 'Intermediate',
    formula: 'LWMA = (C1×1 + C2×2 + ... + Cn×n) ÷ (1 + 2 + ... + n),  Cn = most recent close',
    primaryPurpose: 'Smooth price with a linear recency taper — faster than SMA, without EMA\'s exponential tail.',
    marketType: 'Trending markets; faster systems that want controlled responsiveness.',
  },
  whyExists: {
    problem: 'Traders wanted more weight on recent data than the SMA gives, but a simpler, fully-decaying weighting than the EMA\'s infinite tail.',
    history: 'The LWMA assigns linearly increasing weights across the window, so the newest close matters most and the oldest least, dropping out cleanly when it leaves the window.',
    useCase: 'A system designer uses a fast/slow LWMA crossover to react quickly to trend changes while filtering more noise than raw price.',
  },
  calcSteps: [
    { title: 'Assign linear weights', detail: 'Oldest close → weight 1, next → 2, up to today → weight n.', whyMatters: 'Linear weighting is the defining trait: recency increases steadily, unlike SMA (flat) or EMA (exponential).' },
    { title: 'Weighted sum', detail: 'Multiply each close by its weight and add them up.' },
    { title: 'Divide by total weight', detail: 'Normalise by the sum of weights.', formula: 'Σ weights = n × (n + 1) ÷ 2' },
  ],
  proInsights: [
    { title: 'Between SMA and EMA', body: 'LWMA responds faster than SMA but lacks EMA\'s long memory tail — useful when you want speed without an old-data echo.' },
    { title: 'Clean window exit', body: 'Unlike EMA, the oldest bar leaves the LWMA entirely once outside the window — no lingering influence.' },
  ],
  howItThinks: {
    measures: ['A recency-weighted average price.', 'Trend direction (price vs LWMA and its slope).'],
    ignores: ['Volume.', 'Data older than the window (fully dropped).', 'Non-linear recency effects.'],
  },
  marketEnvironment: {
    best: ['Faster trend systems wanting controlled responsiveness.', 'Smoothing choppy intraday data.', 'Crossover strategies.'],
    worst: ['Ranges (whipsaw, like all MAs).', 'Illiquid, gappy names.'],
    failures: ['Treating it as exotic — it behaves like a faster SMA.', 'MA crosses in sideways markets.'],
  },
  interpretation: {
    bands: [
      { max: -5, label: 'Far below the LWMA (extended down)', tone: 'bull', message: 'Price is well below its LWMA — downtrend but stretched; bounce possible.' },
      { min: -5, max: 0, label: 'Below the LWMA (downtrend bias)', tone: 'bear', message: 'Price is under its LWMA — bias down.' },
      { min: 0, max: 5, label: 'Above the LWMA (uptrend bias)', tone: 'bull', message: 'Price is above its LWMA — bias up.' },
      { min: 5, label: 'Far above the LWMA (extended up)', tone: 'caution', message: 'Price is well above its LWMA — strong but stretched.' },
    ],
    note: 'Live value = price\'s % distance from the LWMA. The key differentiator vs other MAs is its linear (not flat or exponential) weighting.',
  },
  signals: [
    { type: 'cross_above', level: 0, name: 'Price reclaims the LWMA', why: 'Price crossed above its LWMA — bullish trend cue.', reliability: 'Faster than SMA; whipsaws in ranges.' },
    { type: 'cross_below', level: 0, name: 'Price loses the LWMA', why: 'Price crossed below its LWMA — bearish trend cue.', reliability: 'Faster than SMA; whipsaws in ranges.' },
  ],
  related: {
    sameCategory: [{ key: 'sma', name: 'SMA' }, { key: 'ema', name: 'EMA' }, { key: 'wilderma', name: 'Wilder MA' }, { key: 'distma', name: 'Distance from MA' }],
    complementary: [{ key: 'dmi', name: 'ADX', reason: 'Confirms whether the LWMA trend is strong.' }, { key: 'macd', name: 'MACD', reason: 'Compare a momentum read against the MA trend.' }],
  },
  comparisons: [
    { otherKey: 'sma', otherName: 'SMA', formulaDiff: 'LWMA weights linearly; SMA weights all equally.', useCaseDiff: 'LWMA reacts faster than SMA to recent change.' },
    { otherKey: 'ema', otherName: 'EMA', formulaDiff: 'LWMA weights drop to zero at the window edge; EMA weights decay forever.', useCaseDiff: 'LWMA has no old-data tail; EMA retains a fading memory of all past data.' },
  ],
  mistakes: {
    beginner: ['Overcomplicating it — it is a faster SMA.', 'MA crosses in ranges.', 'Mixing up its weighting with EMA\'s.'],
    professional: ['Use it when you want SMA-style clean window exit but more recency weight.', 'Match period to horizon.'],
  },
  cmtCorner: {
    keyFormulas: ['LWMA = Σ(Close × weight) ÷ Σ weights', 'Σ weights = n × (n + 1) ÷ 2'],
    testedConcepts: ['LWMA uses linearly increasing weights (newest = n).', 'It is in the CMT curriculum as a weighting variant.', 'Faster than SMA, no EMA tail.'],
    traps: ['Confusing linear with exponential weighting.', 'Assuming the oldest bar lingers (it drops out fully).'],
  },
  practice: {
    quiz: [
      { q: 'In an LWMA, the most recent close gets weight:', options: ['1', 'n (the highest)', 'Equal to all others', '2/(n+1)'], answer: 1, explanation: 'Weights rise linearly from 1 (oldest) to n (newest), so the most recent close carries the most weight.' },
      { q: 'LWMA weighting is:', options: ['Flat (equal)', 'Linear', 'Exponential', 'Volume-based'], answer: 1, explanation: 'LWMA increases weights linearly — distinct from the SMA (flat) and EMA (exponential).' },
    ],
    exercises: ['Compare SMA, EMA and LWMA of the same period and rank their responsiveness.', 'Find an LWMA crossover.'],
  },
  aiTutor: { intro: 'Ask about the LWMA — linear weighting versus SMA and EMA.', suggestedQuestions: ['How does LWMA weighting work?', 'LWMA vs EMA?', 'When would I use an LWMA?'] },
};

const WILDERMA: IndicatorEducation = {
  key: 'wilderma', name: 'Wilder Moving Average (WSMA / RMA)',
  tagline: 'Wilder\'s slow, stable smoothing (k = 1/n) — the engine inside RSI, ADX and ATR.',
  status: 'published',
  snapshot: {
    category: 'Trend / smoothing (overlay)', creator: 'J. Welles Wilder Jr. (1978)', difficulty: 'Advanced',
    formula: 'WSMA = (Previous WSMA × (n−1) + Current Close) ÷ n   ·   Seed = SMA of first n bars',
    primaryPurpose: 'Provide a smooth, stable average; it is the smoothing used inside Wilder\'s own indicators.',
    marketType: 'Position trading and as the internal smoother of RSI/ADX/ATR.',
  },
  whyExists: {
    problem: 'Wilder needed a smoothing method for his indicators (RSI, ADX, ATR) that was stable and computationally simple on 1978-era tools.',
    history: 'Wilder defined a smoothing with k = 1/n — slower than the EMA\'s 2/(n+1). A Wilder MA of period n behaves like an EMA of (2n−1).',
    useCase: 'A position trader uses a Wilder MA to ride long trends with fewer false signals, accepting later turns for greater stability.',
  },
  calcSteps: [
    { title: 'Seed with an SMA', detail: 'The first value is the SMA of the first n bars.' },
    { title: 'Apply Wilder smoothing', detail: 'Blend the prior value with the new close using k = 1/n.', formula: 'WSMA = (Previous WSMA × (n−1) + Current Close) ÷ n', whyMatters: 'k = 1/n is smaller than the EMA\'s 2/(n+1), so Wilder smoothing reacts slower and steadier — by design, to reduce false signals in his indicators.' },
    { title: 'Note the equivalence', detail: 'A Wilder MA of n ≈ an EMA of (2n − 1), so Wilder 14 ≈ EMA 27.' },
  ],
  proInsights: [
    { title: 'You already use it', body: 'RSI, ADX/DMI and ATR are all built on Wilder smoothing — understanding it explains why those indicators are smooth and lag the way they do.' },
    { title: 'Stability over speed', body: 'Its slower k means fewer whipsaws, suiting position traders and volatility-based (ATR) stops.' },
  ],
  howItThinks: {
    measures: ['A heavily smoothed average price.', 'Long-trend direction with high stability.'],
    ignores: ['Volume.', 'Short-term swings (smoothed away).', 'Recency as aggressively as the EMA does.'],
  },
  marketEnvironment: {
    best: ['Position trading long trends.', 'As the internal smoother for RSI/ADX/ATR.', 'Reducing whipsaw vs faster MAs.'],
    worst: ['Fast reversals (lags more than EMA).', 'Short timeframes where its slowness dominates.'],
    failures: ['Expecting timely reversal signals.', 'Forgetting the SMA seed makes early bars approximate.'],
  },
  interpretation: {
    bands: [
      { max: -5, label: 'Far below the Wilder MA (extended down)', tone: 'bull', message: 'Price is well below its Wilder MA — downtrend, stretched; bounce possible.' },
      { min: -5, max: 0, label: 'Below the Wilder MA (downtrend bias)', tone: 'bear', message: 'Price is under its Wilder MA — bias down.' },
      { min: 0, max: 5, label: 'Above the Wilder MA (uptrend bias)', tone: 'bull', message: 'Price is above its Wilder MA — bias up.' },
      { min: 5, label: 'Far above the Wilder MA (extended up)', tone: 'caution', message: 'Price is well above its Wilder MA — strong but stretched.' },
    ],
    note: 'Live value = price\'s % distance from the Wilder MA. It is the slowest of the common MAs (k = 1/n), so it lags the most but whipsaws the least.',
  },
  signals: [
    { type: 'cross_above', level: 0, name: 'Price reclaims the Wilder MA', why: 'Price crossed above the (slow) Wilder MA — a high-conviction, late trend cue.', reliability: 'Few false signals, but late.' },
    { type: 'cross_below', level: 0, name: 'Price loses the Wilder MA', why: 'Price crossed below the Wilder MA — a high-conviction, late bearish cue.', reliability: 'Few false signals, but late.' },
  ],
  related: {
    sameCategory: [{ key: 'sma', name: 'SMA' }, { key: 'ema', name: 'EMA' }, { key: 'lwma', name: 'LWMA' }, { key: 'distma', name: 'Distance from MA' }],
    complementary: [{ key: 'rsi', name: 'RSI', reason: 'RSI is built on Wilder smoothing.' }, { key: 'dmi', name: 'ADX', reason: 'ADX also uses Wilder smoothing internally.' }],
  },
  comparisons: [
    { otherKey: 'ema', otherName: 'EMA', formulaDiff: 'Wilder uses k = 1/n; EMA uses k = 2/(n+1) (larger, faster).', useCaseDiff: 'Wilder is slower/steadier; EMA reacts sooner. Wilder n ≈ EMA (2n−1).' },
    { otherKey: 'sma', otherName: 'SMA', formulaDiff: 'Wilder is a recursive smoothing; SMA is a flat window average.', useCaseDiff: 'Wilder has memory of all past data (decaying); SMA only the window.' },
  ],
  mistakes: {
    beginner: ['Confusing Wilder\'s k with the EMA\'s.', 'Expecting fast signals.', 'Ignoring the SMA seed.'],
    professional: ['Use Wilder smoothing when stability matters (position trades, ATR stops).', 'Remember Wilder n ≈ EMA (2n−1) when comparing.'],
  },
  cmtCorner: {
    keyFormulas: ['WSMA = (Previous WSMA × (n−1) + Current Close) ÷ n', 'k = 1/n', 'Wilder n ≈ EMA (2n − 1)'],
    testedConcepts: ['Wilder is the creator.', 'k = 1/n (vs EMA 2/(n+1)).', 'It smooths RSI, ADX and ATR.', 'Equivalence to EMA(2n−1).'],
    traps: ['Mixing up Wilder and EMA multipliers.', 'Forgetting RSI/ADX/ATR use Wilder smoothing.', 'Ignoring the SMA seed.'],
  },
  practice: {
    quiz: [
      { q: 'Wilder smoothing uses a multiplier of:', options: ['2 ÷ (n+1)', '1 ÷ n', 'n ÷ 2', 'n × (n+1)/2'], answer: 1, explanation: 'Wilder\'s k = 1/n, which is smaller (slower) than the EMA\'s 2/(n+1).' },
      { q: 'A Wilder MA of period 14 is approximately equal to an EMA of period:', options: ['7', '14', '27', '100'], answer: 2, explanation: 'Wilder n ≈ EMA (2n−1), so Wilder 14 ≈ EMA 27.' },
      { q: 'Which indicators use Wilder smoothing internally?', options: ['Bollinger Bands', 'RSI, ADX and ATR', 'OBV', 'Stochastics'], answer: 1, explanation: 'Wilder designed RSI, the DMI/ADX system and ATR — all use his smoothing.' },
    ],
    exercises: ['Compare a Wilder 14 and EMA 27 — note how close they track.', 'Observe how few times price crossed the Wilder MA versus a fast EMA.'],
  },
  aiTutor: { intro: 'Ask about Wilder\'s moving average — the smoothing behind RSI, ADX and ATR.', suggestedQuestions: ['How is Wilder smoothing different from EMA?', 'Why does RSI use Wilder smoothing?', 'What is the EMA equivalent of a Wilder MA?'] },
};

const DISTMA: IndicatorEducation = {
  key: 'distma', name: 'Distance from MA (%)',
  tagline: 'How far price has stretched from its moving average, in percent — a mean-reversion gauge.',
  status: 'published',
  snapshot: {
    category: 'Mean-reversion / trend extension (oscillator)', creator: 'A derived mean-reversion measure', difficulty: 'Intermediate',
    formula: 'Distance (%) = (Close − SMA) ÷ SMA × 100',
    primaryPurpose: 'Measure how overextended price is relative to its moving-average trend.',
    marketType: 'Mean-reverting and range conditions; overextension within trends.',
  },
  whyExists: {
    problem: 'A moving average shows the trend but not HOW FAR price has run from it. Traders wanted to quantify overextension for mean-reversion setups.',
    history: 'Distance from MA expresses the gap between price and its SMA as a percentage, turning the moving average into an oscillator around zero.',
    useCase: 'When a stock stretches to an unusually large % above its 20-day SMA, a mean-reversion trader fades the move back toward the average.',
  },
  calcSteps: [
    { title: 'Compute the SMA', detail: 'Take the SMA of the close over n bars.' },
    { title: 'Measure the gap', detail: 'Subtract the SMA from the close, divide by the SMA, ×100.', formula: 'Distance (%) = (Close − SMA) ÷ SMA × 100', whyMatters: 'Framing the gap as a percentage makes overextension comparable across stocks and over time — a raw point gap is not.' },
  ],
  proInsights: [
    { title: '"Large" is asset-specific', body: 'A 5% stretch is extreme for a blue-chip but normal for a small-cap. Pros compare the reading to the asset\'s OWN historical extremes, not a fixed number.' },
    { title: 'Zero cross = trend change', body: 'Crossing zero means price crossed its MA — the same trend signal an MA cross gives, framed as an oscillator.' },
  ],
  howItThinks: {
    measures: ['How stretched price is from its SMA, as a %.', 'Mean-reversion potential.', 'Trend side (sign of the distance).'],
    ignores: ['Volume.', 'Trend strength.', 'What "extreme" means without historical context.'],
  },
  marketEnvironment: {
    best: ['Mean-reversion setups after sharp moves.', 'Flagging overextension within a trend.', 'Comparing stretch across stocks.'],
    worst: ['Strong trends, where price can stay extended for a long time.', 'Assets with no stable "normal" distance.'],
    failures: ['Fading extension in a powerful trend too early.', 'Using a fixed % threshold across different assets.'],
  },
  interpretation: {
    bands: [
      { max: -5, label: 'Stretched below the MA', tone: 'bull', message: 'Price is far below its SMA — oversold/extended down. A mean-reversion bounce toward the average is possible (gauge "far" against this asset\'s history).' },
      { min: -5, max: 0, label: 'Below the MA', tone: 'bear', message: 'Price is modestly below its SMA — downtrend bias, not yet stretched.' },
      { min: 0, max: 5, label: 'Above the MA', tone: 'bull', message: 'Price is modestly above its SMA — uptrend bias, not yet stretched.' },
      { min: 5, label: 'Stretched above the MA', tone: 'caution', message: 'Price is far above its SMA — overbought/extended up. A pullback toward the average is possible.' },
    ],
    note: 'What counts as "stretched" varies by asset — compare to its own historical extremes rather than a fixed percentage.',
  },
  signals: [
    { type: 'cross_above', level: 0, name: 'Price crosses above its MA', why: 'Distance turned positive — price reclaimed its average (trend turning up).', reliability: 'Same as an MA cross; whipsaws in ranges.' },
    { type: 'cross_below', level: 0, name: 'Price crosses below its MA', why: 'Distance turned negative — price lost its average (trend turning down).', reliability: 'Same as an MA cross; whipsaws in ranges.' },
  ],
  related: {
    sameCategory: [{ key: 'sma', name: 'SMA' }, { key: 'bb', name: 'Bollinger Bands®' }, { key: 'rsi', name: 'RSI' }],
    complementary: [{ key: 'rsi', name: 'RSI', reason: 'Another mean-reversion gauge to corroborate extremes.' }, { key: 'bb', name: 'Bollinger Bands®', reason: 'Volatility-scaled version of distance from the MA.' }],
  },
  comparisons: [
    { otherKey: 'bb', otherName: 'Bollinger Bands®', formulaDiff: 'Distance is a fixed % from the SMA; Bollinger %B scales the gap by standard deviation.', useCaseDiff: 'Bands adapt to volatility; raw distance does not, so bands are more robust across regimes.' },
  ],
  mistakes: {
    beginner: ['Using one fixed % threshold for every asset.', 'Fading extension in strong trends.', 'Ignoring volatility context.'],
    professional: ['Calibrate "extreme" to each asset\'s history.', 'Prefer volatility-scaled measures (Bollinger %B) when regimes shift.'],
  },
  cmtCorner: {
    keyFormulas: ['Distance (%) = (Close − SMA) ÷ SMA × 100'],
    testedConcepts: ['It converts an MA into a mean-reversion oscillator.', 'Zero cross = price crossing its MA.', '"Extreme" is asset-specific.'],
    traps: ['Assuming a universal overbought %.', 'Confusing it with Bollinger %B (which is volatility-scaled).'],
  },
  practice: {
    quiz: [
      { q: 'Distance from MA crossing zero means:', options: ['Volatility spiked', 'Price crossed its moving average', 'RSI hit 50', 'Volume doubled'], answer: 1, explanation: 'A zero reading means close = SMA, so crossing zero is price crossing its MA.' },
      { q: 'What counts as a "large" distance from the MA:', options: ['Is always 10%', 'Depends on the specific asset\'s history', 'Is fixed at 2 standard deviations', 'Is the same for all stocks'], answer: 1, explanation: 'Extension is asset-specific — compare to that instrument\'s own historical extremes.' },
    ],
    exercises: ['Find the largest distance reading on the chart and see whether price mean-reverted.', 'Compare distance with Bollinger %B at the same point.'],
  },
  aiTutor: { intro: 'Ask about Distance from MA — measuring overextension.', suggestedQuestions: ['How does Distance from MA work?', 'How is it different from Bollinger %B?', 'What is a "large" distance?'] },
};

const BB: IndicatorEducation = {
  key: 'bb', name: 'Bollinger Bands®',
  tagline: 'A moving-average envelope that widens and tightens with volatility, showing relative high/low.',
  status: 'published',
  snapshot: {
    category: 'Volatility envelope (overlay)', creator: 'John Bollinger (1980s)', difficulty: 'Intermediate',
    formula: 'Middle = 20-SMA   ·   Upper = Middle + (2 × 20-period std dev)   ·   Lower = Middle − (2 × 20-period std dev)',
    primaryPurpose: 'Show whether price is high or low on a relative basis, and whether volatility is expanding or contracting.',
    marketType: 'All markets; especially squeeze/expansion volatility cycles.',
  },
  whyExists: {
    problem: 'Fixed-width envelopes ignore that volatility changes. Bollinger wanted bands that set their own width automatically from current volatility.',
    history: 'John Bollinger created the bands in the 1980s, using standard deviation so the envelope expands in volatile markets and contracts in quiet ones.',
    useCase: 'A trader watches a "squeeze" (bands pinching) as a sign that volatility is coiling, and prepares for the expansion move that often follows.',
  },
  calcSteps: [
    { title: 'Middle band (SMA)', detail: 'A 20-period SMA of the close.', formula: 'Middle = SMA(Close, 20)' },
    { title: 'Standard deviation', detail: 'Compute the standard deviation of those same 20 closes.', whyMatters: 'Standard deviation IS the volatility measure — it is what makes the bands breathe. Squaring deviations makes them expand fast in trends and pull in tight during calm.' },
    { title: 'Upper & lower bands', detail: 'Add/subtract 2 standard deviations from the middle.', formula: 'Upper/Lower = Middle ± (2 × std dev)' },
  ],
  proInsights: [
    { title: 'A band tag is not a signal', body: 'Price touching the upper band means "relatively high," NOT "sell." In a strong trend price can "walk the band." This is the single most common Bollinger mistake.' },
    { title: 'Squeeze precedes expansion', body: 'Pros trade the volatility cycle: a tight squeeze (low volatility) often precedes a large directional move (the expansion), with %B and bandwidth as the gauges.' },
    { title: 'Fat tails', body: 'Bollinger noted ~90% of action stays inside the 2σ bands — fewer than the ~95% a normal distribution implies, because markets are fat-tailed.' },
  ],
  howItThinks: {
    measures: ['Relative price level (where price sits between the bands, via %B).', 'Volatility expansion/contraction (bandwidth).', 'Mean and dispersion of recent closes.'],
    ignores: ['Volume.', 'Trend direction by itself (it is an envelope, not a trend signal).', 'Whether a band tag is bullish or bearish.'],
  },
  marketEnvironment: {
    best: ['Reading volatility cycles (squeeze → expansion).', 'Judging relative high/low within a range.', 'Combining with momentum for band-tag context.'],
    worst: ['Used alone as a reversal system (band tags mislead in trends).', 'Very illiquid names with erratic volatility.'],
    failures: ['Selling every upper-band touch in an uptrend ("walking the band").', 'Treating the bands as a standalone trading system.'],
  },
  interpretation: {
    bands: [
      { max: 0, label: 'Below the lower band', tone: 'bull', message: '%B below 0 — price closed beneath the lower band: a strong down-thrust or a stretched, mean-reversion candidate. Not an automatic buy.' },
      { min: 0, max: 20, label: 'Near the lower band', tone: 'bull', message: '%B in the lower fifth — price is relatively low within its bands.' },
      { min: 20, max: 80, label: 'Within the bands', tone: 'neutral', message: '%B between 20 and 80 — price is in the normal middle zone; no relative extreme.' },
      { min: 80, max: 100, label: 'Near the upper band', tone: 'caution', message: '%B in the upper fifth — price is relatively high within its bands.' },
      { min: 100, label: 'Above the upper band', tone: 'caution', message: '%B above 100 — price closed above the upper band: a strong up-thrust or a stretched condition. In a trend price can "walk the band," so this is not an automatic sell.' },
    ],
    note: 'The live value is %B — where the close sits between the bands (0 = lower, 100 = upper). A band tag signals "relatively high/low," never an automatic reversal.',
  },
  signals: [
    { type: 'above', level: 100, name: 'Close above upper band', why: '%B > 100 — the close pierced the upper band, a strong upside thrust.', reliability: 'In ranges, a stretch; in trends, price can keep walking the band. Needs momentum context.' },
    { type: 'below', level: 0, name: 'Close below lower band', why: '%B < 0 — the close pierced the lower band, a strong downside thrust.', reliability: 'In ranges, a stretch; in downtrends it can persist.' },
    { type: 'cross_above', level: 50, name: 'Crosses above the middle band', why: '%B crossed 50 — price moved above its 20-SMA mean.', reliability: 'A mild trend cue; the middle band acts as dynamic support/resistance.' },
    { type: 'cross_below', level: 50, name: 'Crosses below the middle band', why: '%B crossed below 50 — price moved below its 20-SMA mean.', reliability: 'A mild trend cue.' },
  ],
  related: {
    sameCategory: [{ key: 'distma', name: 'Distance from MA' }, { key: 'sma', name: 'SMA' }],
    complementary: [{ key: 'rsi', name: 'RSI', reason: 'A band tag plus an RSI extreme is a higher-conviction stretch.' }, { key: 'dmi', name: 'ADX', reason: 'ADX tells you whether a band-walk is a strong trend or a range edge.' }, { key: 'rvol', name: 'Relative Volume', reason: 'A squeeze breakout on high RVOL is the classic high-conviction setup.' }],
  },
  comparisons: [
    { otherKey: 'distma', otherName: 'Distance from MA', formulaDiff: 'Bollinger scales the gap by standard deviation (volatility); Distance from MA is a raw %.', useCaseDiff: 'Bands adapt to volatility regimes; raw distance is simpler but less robust when volatility shifts.' },
    { otherKey: 'sma', otherName: 'SMA', formulaDiff: 'The middle band IS a 20-SMA; the bands add a ±2σ volatility envelope around it.', useCaseDiff: 'The SMA gives trend; the bands add relative high/low and volatility context.' },
  ],
  mistakes: {
    beginner: ['Selling every upper-band tag / buying every lower-band tag.', 'Treating the bands as a standalone system.', 'Assuming 95% of price stays inside (it is ~90% — fat tails).'],
    professional: ['Use band tags as "relatively high/low," confirmed by momentum.', 'Trade the volatility cycle (squeeze → expansion) with %B and bandwidth.'],
  },
  cmtCorner: {
    keyFormulas: ['Middle = 20-SMA', 'Upper = Middle + 2σ', 'Lower = Middle − 2σ', '%B = (Close − Lower) ÷ (Upper − Lower)'],
    testedConcepts: ['John Bollinger is the creator.', 'Bands use standard deviation (volatility-adaptive).', 'The Squeeze and the Bulge.', 'A band tag = relative high/low, not a signal.', '~90% of action inside the bands (fat tails).'],
    traps: ['Saying a band tag is a buy/sell signal.', 'Assuming a normal-distribution 95%.', 'Forgetting the middle band is a simple MA.'],
  },
  practice: {
    quiz: [
      { q: 'The Bollinger Band width is set by:', options: ['A fixed percentage', 'Standard deviation of price (volatility)', 'Volume', 'The RSI'], answer: 1, explanation: 'Bands sit ±2 standard deviations from the middle SMA, so they widen and narrow with volatility.' },
      { q: 'Price touching the upper band means:', options: ['Definitely sell', 'Price is relatively high — not an automatic signal', 'Volatility is zero', 'A guaranteed reversal'], answer: 1, explanation: 'A tag means "relatively high." In strong trends price can walk the band, so it is not a sell signal on its own.' },
      { q: 'A "squeeze" refers to:', options: ['Bands widening', 'Bands narrowing (low volatility)', 'Price above the upper band', 'High volume'], answer: 1, explanation: 'A squeeze is the bands pinching in during low volatility, which often precedes an expansion move.' },
    ],
    exercises: ['Find a squeeze on the chart and see what followed.', 'Spot where price "walked" the upper band during a trend.'],
  },
  aiTutor: { intro: 'Ask about Bollinger Bands® — volatility, the squeeze, and band tags.', suggestedQuestions: ['How are Bollinger Bands calculated?', 'Why is touching the upper band not a sell signal?', 'What is a Bollinger squeeze?'] },
};

export const INDICATOR_EDUCATION: Partial<Record<IndicatorKey, IndicatorEducation>> = {
  rsi: RSI, macd: MACD, ppo: PPO, roc: ROC, stochastics: STOCHASTICS, mfi: MFI,
  dmi: DMI, rvol: RVOL, obv: OBV, adl: ADL, cmf: CMF,
  sma: SMA, ema: EMA, lwma: LWMA, wilderma: WILDERMA, distma: DISTMA, bb: BB,
};

export function getEducation(key: IndicatorKey): IndicatorEducation | null {
  const e = INDICATOR_EDUCATION[key];
  return e && e.status === 'published' ? e : null;
}
