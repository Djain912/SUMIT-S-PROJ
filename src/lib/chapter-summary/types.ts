// Shared types for the Chapter Quick Revision feature (6 sections).

export type KeyConcept = {
  name: string;
  definition: string;
  whyItMatters: string;
  examAngle: string;
};

export type Formula = {
  label: string;
  expression: string;
  notes: string;
};

export type ExamTip = {
  remember: string;
  mistake: string;
};

export type ChapterSummaryContent = {
  summary: string[];
  keyConcepts: KeyConcept[];
  formulas: Formula[];
  examTips: ExamTip[];
  highYield: string[];
  oneMinute: string[];
};

export type ChapterSummary = ChapterSummaryContent & {
  chapterId: string;
  isPublished: boolean;
};

// Item types used for per-item bookmarking (must match values stored in SummaryBookmark.itemType)
export type SummaryItemType = 'summary' | 'keyConcept' | 'formula' | 'examTip' | 'highYield' | 'oneMinute';

export const EMPTY_SUMMARY: ChapterSummaryContent = {
  summary: [],
  keyConcepts: [],
  formulas: [],
  examTips: [],
  highYield: [],
  oneMinute: [],
};

// Normalize whatever the DB returns (Json columns) into a clean typed shape.
export function normalizeSummary(raw: unknown): ChapterSummaryContent {
  const r = (raw ?? {}) as Record<string, unknown>;
  const strArr = (v: unknown): string[] =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];

  return {
    summary: strArr(r.summary),
    keyConcepts: Array.isArray(r.keyConcepts)
      ? (r.keyConcepts as unknown[]).map((c) => {
          const o = (c ?? {}) as Record<string, unknown>;
          return {
            name: String(o.name ?? ''),
            definition: String(o.definition ?? ''),
            whyItMatters: String(o.whyItMatters ?? ''),
            examAngle: String(o.examAngle ?? ''),
          };
        })
      : [],
    formulas: Array.isArray(r.formulas)
      ? (r.formulas as unknown[]).map((f) => {
          const o = (f ?? {}) as Record<string, unknown>;
          return {
            label: String(o.label ?? ''),
            expression: String(o.expression ?? ''),
            notes: String(o.notes ?? ''),
          };
        })
      : [],
    examTips: Array.isArray(r.examTips)
      ? (r.examTips as unknown[]).map((t) => {
          const o = (t ?? {}) as Record<string, unknown>;
          return {
            remember: String(o.remember ?? ''),
            mistake: String(o.mistake ?? ''),
          };
        })
      : [],
    highYield: strArr(r.highYield),
    oneMinute: strArr(r.oneMinute),
  };
}
