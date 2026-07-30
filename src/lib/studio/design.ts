/**
 * Chartix Studio — carousel design system.
 *
 * Ported from the local Python generator so the daily Instagram / LinkedIn
 * carousel can be produced inside the Chartix admin instead of on a laptop.
 *
 * Three ideas make the posts stop looking identical day after day:
 *   1. Category themes — a Volume post never shares a palette with a Fibonacci post.
 *   2. Rotating formats — the 9-slide skeleton is only one of five layouts.
 *   3. Editorial typography — Instrument Serif + Manrope (both SIL Open Font Licence).
 */

export const SLIDE_W = 1080;
export const SLIDE_H = 1350; // Instagram 4:5

export type Theme = {
  label: string;
  accent: string;
  soft: string;
  paper: string;
  ink: string;
  body: string;
  line: string;
};

export const THEMES: Record<string, Theme> = {
  foundation: { label: 'Foundations', accent: '#0F5C35', soft: '#EAF5EF', paper: '#FBFCFB', ink: '#0B1F17', body: '#4A5C54', line: '#D8E7DF' },
  structure:  { label: 'Market Structure', accent: '#1B4F8C', soft: '#EAF1FA', paper: '#FBFCFE', ink: '#0C1E33', body: '#48586B', line: '#D7E3F2' },
  volume:     { label: 'Volume', accent: '#7A3E9D', soft: '#F3EBF9', paper: '#FCFBFD', ink: '#241033', body: '#584A63', line: '#E5D9EE' },
  average:    { label: 'Moving Averages', accent: '#B26A00', soft: '#FBF0DE', paper: '#FDFBF7', ink: '#33240B', body: '#61533C', line: '#EEDFC6' },
  fibonacci:  { label: 'Fibonacci', accent: '#0E6E6E', soft: '#E4F3F3', paper: '#F9FCFC', ink: '#0A2A2A', body: '#425B5B', line: '#CDE6E6' },
  momentum:   { label: 'Momentum', accent: '#B3242B', soft: '#FCEBEC', paper: '#FDFAFA', ink: '#33090C', body: '#68484A', line: '#F0D3D5' },
  risk:       { label: 'Risk', accent: '#334155', soft: '#EEF1F5', paper: '#FBFCFD', ink: '#0F172A', body: '#4B5768', line: '#DCE3EC' },
};

export type CategoryKey = keyof typeof THEMES;

const KEYWORDS: Array<[RegExp, CategoryKey]> = [
  [/volume|obv|open interest|accumulation|distribution|vwap|money flow|force index/i, 'volume'],
  [/moving average|sma|ema|cross|golden|death/i, 'average'],
  [/fibonacci|retrace|extension|elliott/i, 'fibonacci'],
  [/rsi|macd|stochastic|momentum|oscillator|divergence|adx|dmi|cci|williams|roc/i, 'momentum'],
  [/risk|stop|position siz|money manage|drawdown|psychology|expectancy|win rate|compound/i, 'risk'],
  [/support|resistance|trend|dow|channel|breakout|pattern|doji|hammer|star|top|bottom|wedge|flag|triangle|rectangle|cup/i, 'structure'],
];

const DAY_RANGES: Array<[number, number, CategoryKey]> = [
  [1, 5, 'foundation'], [6, 14, 'structure'], [15, 21, 'volume'],
  [22, 28, 'average'], [29, 30, 'fibonacci'], [31, 45, 'momentum'],
  [46, 60, 'structure'], [61, 75, 'risk'], [76, 90, 'foundation'],
];

export function categoryFor(day: number, topic: string): CategoryKey {
  for (const [re, cat] of KEYWORDS) if (re.test(topic)) return cat;
  for (const [lo, hi, cat] of DAY_RANGES) if (day >= lo && day <= hi) return cat;
  return 'foundation';
}

export type FormatKey = 'deep_dive' | 'quick_card' | 'myth_buster' | 'chart_quiz' | 'notebook';

/** Six-day rotation. Deep dives appear twice — they carry the most teaching value. */
export const FORMAT_ROTATION: FormatKey[] = [
  'deep_dive', 'quick_card', 'myth_buster', 'deep_dive', 'chart_quiz', 'notebook',
];

export const FORMAT_LABELS: Record<FormatKey, { name: string; desc: string; slides: string }> = {
  deep_dive:   { name: 'Deep Dive',   desc: 'Full teaching post',        slides: '9 slides' },
  quick_card:  { name: 'Quick Card',  desc: 'One idea, fast',            slides: '4 slides' },
  myth_buster: { name: 'Myth Buster', desc: 'What beginners get wrong',  slides: '5 slides' },
  chart_quiz:  { name: 'Chart Quiz',  desc: 'Question, then reveal',     slides: '5 slides' },
  notebook:    { name: 'Notebook',    desc: 'Handwritten explainer',     slides: '4 slides' },
};

export function formatFor(day: number): FormatKey {
  return FORMAT_ROTATION[(day - 1) % FORMAT_ROTATION.length];
}

/** Content returned by the generator — matches the existing carousel prompt. */
export type StudioContent = {
  cover_subtitle: string;
  definition_headline: string;
  definition_body: string;
  key_insight: string;
  how_it_works_title: string;
  steps: Array<{ label: string; text: string }>;
  rules_title: string;
  rules: string[];
  example_title: string;
  example_scenario: string;
  example_action: string;
  mistakes_title: string;
  mistakes: string[];
  takeaway: string;
};

export type Slide = {
  /** Small uppercase chip, top-left */
  chip: string;
  /** Slide body, built by the renderer from these typed blocks */
  blocks: Block[];
  /** Bottom-right hint text */
  hint?: string;
  /** Notebook (handwritten) styling */
  notebook?: boolean;
};

export type Block =
  | { kind: 'rule' }
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'big'; text: string }
  | { kind: 'lead'; text: string }
  | { kind: 'panel'; label: string; text: string; tone?: 'accent' | 'danger' }
  | { kind: 'steps'; items: Array<{ label: string; text: string }> }
  | { kind: 'ticks'; items: string[]; bad?: boolean };

/** Build the slide list for a post. All five formats read the same content object. */
export function buildSlides(day: number, topic: string, c: StudioContent, fmt: FormatKey): Slide[] {
  const nb = fmt === 'notebook';

  switch (fmt) {
    case 'deep_dive':
      return [
        { chip: `Day ${day}`, hint: 'Swipe to learn', blocks: [
          { kind: 'rule' }, { kind: 'title', text: topic }, { kind: 'lead', text: c.cover_subtitle }] },
        { chip: 'What it is', blocks: [
          { kind: 'heading', text: c.definition_headline },
          { kind: 'lead', text: c.definition_body },
          { kind: 'panel', label: 'Key insight', text: c.key_insight }] },
        { chip: 'The idea', blocks: [
          { kind: 'big', text: c.key_insight }] },
        { chip: 'How it works', blocks: [
          { kind: 'heading', text: c.how_it_works_title },
          { kind: 'steps', items: c.steps ?? [] }] },
        { chip: 'The rules', blocks: [
          { kind: 'heading', text: c.rules_title },
          { kind: 'ticks', items: c.rules ?? [] }] },
        { chip: 'Real example', blocks: [
          { kind: 'heading', text: c.example_title },
          { kind: 'panel', label: 'Scenario', text: c.example_scenario },
          { kind: 'lead', text: c.example_action }] },
        { chip: 'Avoid this', blocks: [
          { kind: 'heading', text: c.mistakes_title },
          { kind: 'ticks', items: c.mistakes ?? [], bad: true }] },
        { chip: 'Remember', blocks: [
          { kind: 'rule' }, { kind: 'big', text: c.takeaway }] },
        { chip: 'Chartix', hint: 'Follow for daily posts', blocks: [
          { kind: 'heading', text: 'Learn technical analysis the simple way.' },
          { kind: 'lead', text: 'Structured CMT-aligned lessons, practice questions and interactive tools.' },
          { kind: 'panel', label: 'Start free', text: 'chartix.in' }] },
      ];

    case 'quick_card':
      return [
        { chip: `Day ${day}`, hint: 'Swipe', blocks: [
          { kind: 'rule' }, { kind: 'title', text: topic }, { kind: 'lead', text: c.cover_subtitle }] },
        { chip: 'In one line', blocks: [
          { kind: 'big', text: c.definition_headline }, { kind: 'lead', text: c.definition_body }] },
        { chip: 'Why it matters', blocks: [
          { kind: 'panel', label: 'Key insight', text: c.key_insight },
          { kind: 'ticks', items: (c.rules ?? []).slice(0, 3) }] },
        { chip: 'Remember', hint: 'Save this', blocks: [
          { kind: 'rule' }, { kind: 'big', text: c.takeaway }] },
      ];

    case 'myth_buster': {
      const myths = (c.mistakes ?? []).slice(0, 3);
      return [
        { chip: `Day ${day}`, hint: 'Swipe', blocks: [
          { kind: 'rule' }, { kind: 'title', text: topic },
          { kind: 'lead', text: 'What most beginners get wrong.' }] },
        ...myths.map((m, i) => ({
          chip: `Myth ${i + 1}`,
          blocks: [
            { kind: 'panel', label: 'The mistake', text: m, tone: 'danger' } as Block,
            { kind: 'rule' } as Block,
            { kind: 'lead', text: c.key_insight } as Block,
          ],
        })),
        { chip: 'Do this instead', hint: 'Save this', blocks: [
          { kind: 'rule' }, { kind: 'big', text: c.takeaway }] },
      ];
    }

    case 'chart_quiz':
      return [
        { chip: `Day ${day}`, hint: 'Swipe to answer', blocks: [
          { kind: 'rule' }, { kind: 'title', text: 'Can you spot it?' }, { kind: 'lead', text: topic }] },
        { chip: 'The setup', hint: 'What would you do?', blocks: [
          { kind: 'panel', label: 'Scenario', text: c.example_scenario }] },
        { chip: 'Think', blocks: [
          { kind: 'big', text: 'What is the signal here?' },
          { kind: 'lead', text: 'Take a second before you swipe.' }] },
        { chip: 'The answer', blocks: [
          { kind: 'heading', text: c.example_title },
          { kind: 'lead', text: c.example_action },
          { kind: 'panel', label: 'Why it works', text: c.key_insight }] },
        { chip: 'Remember', hint: 'Save this', blocks: [
          { kind: 'rule' }, { kind: 'big', text: c.takeaway }] },
      ];

    case 'notebook':
      return [
        { chip: `Day ${day}`, hint: 'swipe', notebook: nb, blocks: [
          { kind: 'title', text: topic }, { kind: 'lead', text: c.cover_subtitle }] },
        { chip: 'the idea', notebook: nb, blocks: [
          { kind: 'heading', text: c.definition_headline },
          { kind: 'lead', text: c.definition_body },
          { kind: 'panel', label: 'remember', text: c.key_insight }] },
        { chip: 'the rules', notebook: nb, blocks: [
          { kind: 'heading', text: c.rules_title },
          { kind: 'ticks', items: (c.rules ?? []).slice(0, 4) }] },
        { chip: 'takeaway', hint: 'save this', notebook: nb, blocks: [
          { kind: 'heading', text: c.takeaway }, { kind: 'lead', text: 'chartix.in' }] },
      ];
  }
}
