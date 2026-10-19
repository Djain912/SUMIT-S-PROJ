// Market Desk orchestrator — shared by the daily cron and the admin
// "Generate" button. Fetch → detect → de-duplicate against recent days →
// pick a diverse set → write copy → render cards → save.

import { prisma } from '@/lib/db/prisma';
import { fetchMarketData } from './fetch-market-data';
import { detectInsights, GROUP, type Category, type Insight } from './insights';
import { renderCard } from './card-svg';
import { writeCopy } from './write-copy';
import { fetchNseData } from './nse-insights';
import type { BreadthPoint } from './breadth-insights';

const MAX_POSTS = 6;
const MAX_PER_CATEGORY = 2;
// Groups whose stories overlap too much to run twice on one day.
const SINGLE_GROUPS = new Set(['india-sectors']);

// How long a story stays "already told". Weekly-style posts get a longer rest.
const REST_DAYS: Partial<Record<Category, number>> = {
  seasonality: 20, sectors: 6, scoreboard: 6, drawdown: 10, ratio: 7,
  'sector-breadth': 6, valuation: 7, 'index-movers': 6, divergence: 5,
};

function daysBetween(a: string, b: string) {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86400_000);
}

export function applyNovelty(insights: Insight[], history: { date: string; insightKey: string | null }[], today: string) {
  const lastSeen = new Map<string, string>();
  for (const h of history) {
    if (!h.insightKey) continue;
    const prev = lastSeen.get(h.insightKey);
    if (!prev || h.date > prev) lastSeen.set(h.insightKey, h.date);
  }
  for (const ins of insights) {
    const seen = lastSeen.get(ins.key);
    if (!seen) continue;
    const ago = daysBetween(seen, today);
    const rest = REST_DAYS[ins.category] ?? 5;
    if (ago <= 2) ins.score *= 0.3;
    else if (ago <= rest) ins.score *= 0.6;
  }
  return insights.sort((a, b) => b.score - a.score);
}

export function pickDiverse(insights: Insight[]): Insight[] {
  const picked: Insight[] = [];
  const symbols = new Set<string>();
  const groupCat = new Set<string>();
  const perCat = new Map<Category, number>();
  const perGroup = new Map<string, number>();
  for (const ins of insights) {
    if (picked.length >= MAX_POSTS) break;
    const group = GROUP[ins.symbol] ?? ins.symbol;
    if (symbols.has(ins.symbol)) continue;
    if (groupCat.has(`${group}|${ins.category}`)) continue;     // S&P and Nasdaq crash = one story
    if ((perGroup.get(group) ?? 0) >= (SINGLE_GROUPS.has(group) ? 1 : 2)) continue;
    if ((perCat.get(ins.category) ?? 0) >= MAX_PER_CATEGORY) continue;
    if (ins.score < 40 && picked.length >= 4) break;
    picked.push(ins);
    symbols.add(ins.symbol);
    groupCat.add(`${group}|${ins.category}`);
    perGroup.set(group, (perGroup.get(group) ?? 0) + 1);
    perCat.set(ins.category, (perCat.get(ins.category) ?? 0) + 1);
  }
  return picked;
}

export async function runMarketDesk(date: string) {
  const { core, sectors } = await fetchMarketData();
  if (core.length < 8) throw new Error(`Only ${core.length} market series loaded — Yahoo Finance may be blocking this server.`);

  const since = new Date(Date.parse(date) - 30 * 86400_000).toISOString().slice(0, 10);
  const [flows, history, breadthRows, nse] = await Promise.all([
    prisma.fiiDiiLog.findMany({ orderBy: { date: 'asc' }, select: { date: true, fiiNet: true, diiNet: true } }).catch(() => []),
    prisma.marketObservation.findMany({ where: { date: { gte: since, lt: date } }, select: { date: true, insightKey: true } }),
    prisma.breadthDaily.findMany({ orderBy: { date: 'asc' } }).catch(() => []),
    fetchNseData(),
  ]);
  const breadth = breadthRows.map((r) => ({ ...r, sectors: (r.sectors as BreadthPoint['sectors']) ?? null }));

  const candidates = applyNovelty(detectInsights(core, sectors, flows, new Date(), { breadth, nse }), history, date);
  const chosen = pickDiverse(candidates);
  const copies = await Promise.all(chosen.map(writeCopy));

  const rows = chosen.map((ins, i) => {
    const copy = copies[i];
    const card = { ...ins.card, headline: copy.headline };
    return {
      date,
      symbol: ins.symbol,
      metricName: ins.card.kicker,
      headline: copy.headline,
      subtext: ins.card.subtitle,
      chartSvg: renderCard(card),
      sourceLine: ins.card.source,
      score: Math.round(ins.score * 10) / 10,
      chartType: ins.card.chart.kind,
      currentVal: 0,
      contextNote: JSON.stringify({ facts: ins.facts, templateTweet: ins.tweet, aiCopy: copy.ai }),
      postText: copy.tweet,
      insightKey: ins.key,
      category: ins.category,
    };
  });

  await prisma.$transaction(rows.map((data) => prisma.marketObservation.create({ data })));
  return { count: rows.length, candidates: candidates.length };
}
