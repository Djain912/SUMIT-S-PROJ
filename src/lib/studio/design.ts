/**
 * Chartix Studio — carousel design system.
 *
 * Three independent dimensions drive a post:
 *   PLATFORM  where it goes      -> canvas size, and whether it is slides or text
 *   AUDIENCE  who it is for      -> how the content is written (beginner vs practitioner)
 *   THEME     how it looks       -> palette; auto-picked from topic, or overridden
 *
 * Formats (deep dive, quick card, …) rotate on top of that so the feed never
 * repeats the same skeleton two days running.
 */

/* ------------------------------------------------------------------ platform */

export type PlatformKey = 'instagram' | 'linkedin' | 'twitter' | 'reddit';

export type Platform = {
  label: string;
  /** 'slides' renders a carousel; 'text' produces a written post instead. */
  output: 'slides' | 'text';
  w: number;
  h: number;
  note: string;
};

export const PLATFORMS: Record<PlatformKey, Platform> = {
  instagram: {
    label: 'Instagram', output: 'slides', w: 1080, h: 1350,
    note: '4:5 carousel — the tallest format the feed allows.',
  },
  linkedin: {
    label: 'LinkedIn', output: 'slides', w: 1080, h: 1350,
    note: '4:5 document post. Upload the PNGs as a multi-page PDF or carousel.',
  },
  twitter: {
    label: 'X / Twitter', output: 'slides', w: 1600, h: 900,
    note: '16:9 — X crops tall images hard, so slides are landscape here.',
  },
  reddit: {
    label: 'Reddit', output: 'text', w: 0, h: 0,
    note: 'Reddit punishes image carousels and rewards long text. This produces a markdown post, not slides.',
  },
};

/** Default canvas, used when nothing is selected yet. */
export const SLIDE_W = PLATFORMS.instagram.w;
export const SLIDE_H = PLATFORMS.instagram.h;

/* ------------------------------------------------------------------ audience */

export type AudienceKey = 'beginner' | 'expert';

export const AUDIENCES: Record<AudienceKey, { label: string; note: string }> = {
  beginner: {
    label: 'Beginner',
    note: 'Plain English, no jargon, one idea per slide. The 90-day series voice.',
  },
  expert: {
    label: 'Practitioner',
    note: 'Assumes CMT-level knowledge. Precise terminology, edge cases, failure modes, no hand-holding.',
  },
};

/* ------------------------------------------------------------------ themes */

export type Theme = {
  label: string;
  accent: string;
  soft: string;
  paper: string;
  ink: string;
  body: string;
  line: string;
  /** low-contrast text (slide counter, footer hint) */
  muted: string;
  dark?: boolean;
};

/** Topic-driven palettes — the friendly, editorial look. */
export const THEMES: Record<string, Theme> = {
  foundation: { label: 'Foundations', accent: '#0F5C35', soft: '#EAF5EF', paper: '#FBFCFB', ink: '#0B1F17', body: '#4A5C54', line: '#D8E7DF', muted: '#A8B2BD' },
  structure:  { label: 'Market Structure', accent: '#1B4F8C', soft: '#EAF1FA', paper: '#FBFCFE', ink: '#0C1E33', body: '#48586B', line: '#D7E3F2', muted: '#A8B2BD' },
  volume:     { label: 'Volume', accent: '#7A3E9D', soft: '#F3EBF9', paper: '#FCFBFD', ink: '#241033', body: '#584A63', line: '#E5D9EE', muted: '#A8B2BD' },
  average:    { label: 'Moving Averages', accent: '#B26A00', soft: '#FBF0DE', paper: '#FDFBF7', ink: '#33240B', body: '#61533C', line: '#EEDFC6', muted: '#A8B2BD' },
  fibonacci:  { label: 'Fibonacci', accent: '#0E6E6E', soft: '#E4F3F3', paper: '#F9FCFC', ink: '#0A2A2A', body: '#425B5B', line: '#CDE6E6', muted: '#A8B2BD' },
  momentum:   { label: 'Momentum', accent: '#B3242B', soft: '#FCEBEC', paper: '#FDFAFA', ink: '#33090C', body: '#68484A', line: '#F0D3D5', muted: '#A8B2BD' },
  risk:       { label: 'Risk', accent: '#334155', soft: '#EEF1F5', paper: '#FBFCFD', ink: '#0F172A', body: '#4B5768', line: '#DCE3EC', muted: '#A8B2BD' },

  /* --- presentation themes: pick these manually, usually with Practitioner --- */
  professional: {
    label: 'LinkedIn Professional',
    accent: '#1D4ED8', soft: '#EEF2FF', paper: '#FFFFFF', ink: '#0B1220',
    body: '#334155', line: '#E2E8F0', muted: '#94A3B8',
  },
  boardroom: {
    label: 'Boardroom (dark)',
    accent: '#C9A227', soft: '#1E2530', paper: '#0F141B', ink: '#F4F6F8',
    body: '#B7C2CE', line: '#273140', muted: '#7C8899', dark: true,
  },
  terminal: {
    label: 'Terminal (dark)',
    accent: '#25D07A', soft: '#12211A', paper: '#0A0F0D', ink: '#E9F5EF',
    body: '#9DB3A8', line: '#1E2E26', muted: '#6B8579', dark: true,
  },
  research: {
    label: 'Research Note',
    accent: '#8A6D3B', soft: '#F6F1E7', paper: '#FCFAF5', ink: '#1C1810',
    body: '#4E4636', line: '#E6DDCB', muted: '#A99C86',
  },
};

export type CategoryKey = keyof typeof THEMES;

/** Themes that are chosen deliberately rather than derived from the topic. */
export const PRESENTATION_THEMES: CategoryKey[] = [
  'professional', 'boardroom', 'terminal', 'research',
];

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

/** Which theme to use, given audience + platform, unless the user overrode it. */
export function themeKeyFor(
  day: number, topic: string,
  audience: AudienceKey, platform: PlatformKey,
  override?: CategoryKey | 'auto',
): CategoryKey {
  if (override && override !== 'auto') return override;
  if (audience === 'expert') {
    return platform === 'linkedin' ? 'professional' : 'boardroom';
  }
  return categoryFor(day, topic);
}

/* ------------------------------------------------------------------ formats */

export type FormatKey = 'deep_dive' | 'quick_card' | 'myth_buster' | 'chart_quiz' | 'notebook';

export const FORMAT_ROTATION: FormatKey[] = [
  'deep_dive', 'quick_card', 'myth_buster', 'deep_dive', 'chart_quiz', 'notebook',
];

export const FORMAT_LABELS: Record<FormatKey, { name: string; desc: string; slides: string }> = {
  deep_dive:   { name: 'Deep Dive',   desc: 'Full teaching post',       slides: '9 slides' },
  quick_card:  { name: 'Quick Card',  desc: 'One idea, fast',           slides: '4 slides' },
  myth_buster: { name: 'Myth Buster', desc: 'What people get wrong',    slides: '5 slides' },
  chart_quiz:  { name: 'Chart Quiz',  desc: 'Question, then reveal',    slides: '5 slides' },
  notebook:    { name: 'Notebook',    desc: 'Handwritten explainer',    slides: '4 slides' },
};

export function formatFor(day: number): FormatKey {
  return FORMAT_ROTATION[(day - 1) % FORMAT_ROTATION.length];
}

/** Notebook styling never suits a practitioner post or a 16:9 canvas. */
export function formatAllowed(fmt: FormatKey, audience: AudienceKey, platform: PlatformKey): boolean {
  if (fmt === 'notebook' && (audience === 'expert' || platform === 'twitter')) return false;
  if (fmt === 'deep_dive' && platform === 'twitter') return false; // 9 landscape slides is too many for X
  return true;
}

export function resolveFormat(day: number, audience: AudienceKey, platform: PlatformKey,
                              override?: FormatKey | 'auto'): FormatKey {
  if (override && override !== 'auto' && formatAllowed(override, audience, platform)) return override;
  let f = formatFor(day);
  let guard = 0;
  while (!formatAllowed(f, audience, platform) && guard < FORMAT_ROTATION.length) {
    f = FORMAT_ROTATION[(FORMAT_ROTATION.indexOf(f) + 1) % FORMAT_ROTATION.length];
    guard++;
  }
  return f;
}

/* ------------------------------------------------------------------ content */

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
  /** Only produced for Reddit (platform.output === 'text'). */
  reddit_title?: string;
  reddit_body?: string;
};

export type Slide = {
  chip: string;
  blocks: Block[];
  hint?: string;
  notebook?: boolean;
};

/** A chart the user uploaded, placed at a named anchor in the deck. */
export type ChartAnchor = 'after_intro' | 'after_explainer' | 'after_rules' | 'before_takeaway';

export const CHART_ANCHORS: Array<{ key: ChartAnchor; label: string }> = [
  { key: 'after_intro',      label: 'After the cover' },
  { key: 'after_explainer',  label: 'After the explanation' },
  { key: 'after_rules',      label: 'After the rules' },
  { key: 'before_takeaway',  label: 'Before the takeaway' },
];

export type StudioChart = {
  id: string;
  /** data: URL - kept client-side, never uploaded anywhere. */
  dataUrl: string;
  caption: string;
  anchor: ChartAnchor;
};

export type Block =
  | { kind: 'rule' }
  | { kind: 'image'; src: string; caption?: string }
  | { kind: 'title'; text: string }
  | { kind: 'heading'; text: string }
  | { kind: 'big'; text: string }
  | { kind: 'lead'; text: string }
  | { kind: 'panel'; label: string; text: string; tone?: 'accent' | 'danger' }
  | { kind: 'steps'; items: Array<{ label: string; text: string }> }
  | { kind: 'ticks'; items: string[]; bad?: boolean };

function chartSlides(charts: StudioChart[], anchor: ChartAnchor): Slide[] {
  return charts.filter((ch) => ch.anchor === anchor).map((ch) => ({
    chip: 'Chart',
    blocks: [
      { kind: 'image', src: ch.dataUrl, caption: ch.caption } as Block,
    ],
  }));
}

export function buildSlides(
  day: number, topic: string, c: StudioContent, fmt: FormatKey,
  charts: StudioChart[] = [],
): Slide[] {
  const base = buildBaseSlides(day, topic, c, fmt);
  if (charts.length === 0) return base;

  // Anchor positions differ per format; clamp to what the deck actually has.
  const at = (i: number) => Math.min(Math.max(i, 1), base.length - 1);
  const anchorIndex: Record<ChartAnchor, number> = fmt === 'deep_dive'
    ? { after_intro: 1, after_explainer: 3, after_rules: 5, before_takeaway: 7 }
    : { after_intro: 1, after_explainer: 2, after_rules: 3, before_takeaway: base.length - 1 };

  const out: Slide[] = [];
  base.forEach((s, i) => {
    out.push(s);
    for (const a of CHART_ANCHORS) {
      if (at(anchorIndex[a.key]) === i + 1) out.push(...chartSlides(charts, a.key));
    }
  });
  return out;
}

function buildBaseSlides(day: number, topic: string, c: StudioContent, fmt: FormatKey): Slide[] {
  const nb = fmt === 'notebook';

  switch (fmt) {
    case 'deep_dive':
      return [
        { chip: `Day ${day}`, hint: 'Swipe to learn', blocks: [
          { kind: 'rule' }, { kind: 'title', text: topic }, { kind: 'lead', text: c.cover_subtitle }] },
        { chip: 'What it is', blocks: [
          { kind: 'heading', text: c.definition_headline },
          { kind: 'lead', text: c.definition_body }] },
        { chip: 'The idea', blocks: [{ kind: 'big', text: c.key_insight }] },
        { chip: 'How it works', blocks: [
          { kind: 'heading', text: c.how_it_works_title },
          { kind: 'steps', items: c.steps ?? [] }] },
        { chip: 'The rules', blocks: [
          { kind: 'heading', text: c.rules_title },
          { kind: 'ticks', items: c.rules ?? [] }] },
        { chip: 'Worked example', blocks: [
          { kind: 'heading', text: c.example_title },
          { kind: 'panel', label: 'What happened', text: `${c.example_scenario} ${c.example_action}`.trim() }] },
        { chip: 'Where it fails', blocks: [
          { kind: 'heading', text: c.mistakes_title },
          { kind: 'ticks', items: c.mistakes ?? [], bad: true }] },
        { chip: 'Remember', blocks: [
          { kind: 'rule' }, { kind: 'big', text: c.takeaway }] },
        { chip: 'Chartix', hint: 'Follow for daily posts', blocks: [
          { kind: 'heading', text: 'Learn technical analysis the simple way.' },
          { kind: 'panel', label: 'Start free', text: 'Structured CMT-aligned lessons, practice questions and interactive tools — chartix.in' }] },
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
          { kind: 'lead', text: 'What most people get wrong.' }] },
        ...myths.map((m, i) => ({
          chip: `Myth ${i + 1}`,
          blocks: [
            { kind: 'panel', label: 'The mistake', text: m, tone: 'danger' } as Block,
          ],
        })),
        { chip: 'The pattern', blocks: [{ kind: 'big', text: c.key_insight }] },
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
          { kind: 'panel', label: 'Why it works', text: `${c.example_action} ${c.key_insight}`.trim() }] },
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
