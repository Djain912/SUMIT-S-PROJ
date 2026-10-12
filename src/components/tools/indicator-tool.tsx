'use client';

import { useMemo, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AAPL_SAMPLE } from '@/lib/tools/sample-data';
import { computeRoc, computeMacd, computeRsi, computeStochastics, computeAdl, computeMfi, computePpo, computeDmi, computeObv, computeCmf, computeRvol, computeSma, computeEma, computeLwma, computeWilderMa, computeDistMa, computeBollinger } from '@/lib/tools/indicators';
import { PanelChart } from '@/components/tools/panel-chart';
import { OverlayChart } from '@/components/tools/overlay-chart';

export type IndicatorKey = 'roc' | 'macd' | 'rsi' | 'stochastics' | 'adl' | 'mfi' | 'ppo' | 'dmi' | 'obv' | 'cmf' | 'rvol' | 'sma' | 'ema' | 'lwma' | 'wilderma' | 'distma' | 'bb';
export const MA_KEYS: IndicatorKey[] = ['sma', 'ema', 'lwma', 'wilderma', 'distma', 'bb'];

const EMERALD = '#047857';
const BLUE = '#2563eb';
const AMBER = '#d97706';
const RED = '#dc2626';
const PURPLE = '#7c3aed';

type Meta = {
  name: string; blurb: string; formula: string;
  measures: string; construction: string[]; reading: string[];
};
const META: Record<IndicatorKey, Meta> = {
  roc: {
    name: 'Rate of Change (ROC)',
    blurb: 'ROC shows how much price has changed, in percent, compared with a set number of bars ago.',
    formula: 'ROC = ((Close today − Close n bars ago) ÷ Close n bars ago) × 100',
    measures: 'ROC measures momentum — the percentage change in price over a chosen lookback period.',
    construction: [
      'Choose a lookback period n (the slider above).',
      'Take today\'s close and the close n bars ago.',
      'Subtract them, divide by the old close, and multiply by 100 to get a %.',
      'Plot that value as a line and repeat for every bar.',
    ],
    reading: [
      'Crossing above the 0 line = price is now higher than it was n bars ago (upward momentum).',
      'A rising ROC = momentum accelerating; a falling ROC = momentum slowing.',
      'It is unbounded, but the value is meaningful — it is the actual % change.',
    ],
  },
  macd: {
    name: 'MACD',
    blurb: 'MACD measures momentum as the gap between a fast and a slow moving average of price.',
    formula: 'MACD = Fast EMA − Slow EMA   ·   Signal = EMA of MACD   ·   Histogram = MACD − Signal',
    measures: 'MACD measures momentum as the distance between a fast EMA and a slow EMA of the close.',
    construction: [
      'Compute a fast EMA and a slow EMA of the closing price.',
      'MACD line = fast EMA − slow EMA.',
      'Signal line = an EMA of the MACD line.',
      'Histogram = MACD line − Signal line.',
    ],
    reading: [
      'MACD above 0 = the fast EMA is above the slow EMA (uptrend bias).',
      'MACD crossing above its Signal line = momentum turning up (histogram flips positive).',
      'A widening histogram = accelerating momentum; a shrinking one = decelerating.',
    ],
  },
  rsi: {
    name: 'Relative Strength Index (RSI)',
    blurb: 'RSI compares average gains to average losses to show momentum on a fixed 0–100 scale.',
    formula: 'RS = Average Gain ÷ Average Loss   ·   RSI = 100 − (100 ÷ (1 + RS))',
    measures: 'RSI measures momentum by comparing the average size of up moves to down moves, on a 0–100 scale.',
    construction: [
      'For each bar, record the gain (if price rose) or the loss (if it fell).',
      'Average the gains and the losses over the period using Wilder smoothing.',
      'RS = average gain ÷ average loss.',
      'RSI = 100 − 100 ÷ (1 + RS).',
    ],
    reading: [
      '70 and above = overbought (relatively high); 30 and below = oversold (relatively low).',
      '50 is the midline — above 50 gains dominate, below 50 losses dominate.',
      'These are conditions, not automatic buy or sell signals.',
    ],
  },
  stochastics: {
    name: 'Stochastics (Fast %K / %D)',
    blurb: 'Stochastics shows where the close sits within the recent high-to-low range.',
    formula: '%K = (Close − Lowest Low n) ÷ (Highest High n − Lowest Low n) × 100   ·   %D = 3-bar average of %K',
    measures: 'Stochastics measures momentum by the position of the close within the high-low range over the lookback.',
    construction: [
      'Find the lowest low and highest high over the last n bars.',
      '%K = (Close − lowest low) ÷ (highest high − lowest low) × 100.',
      '%D = the 3-bar average of %K (the signal line).',
      '%D Slow = the 3-bar average of %D (used by the slow stochastic).',
    ],
    reading: [
      'Above 80 = overbought; below 20 = oversold (relatively high / low).',
      '%K crossing %D can flag a momentum shift.',
      'Bounded 0–100; it uses the high and low, not just the close.',
    ],
  },
  adl: {
    name: 'Accumulation / Distribution Line (ADL)',
    blurb: 'A running volume total that adds more on strong closes and subtracts on weak closes.',
    formula: 'Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low)   ·   ADL = previous ADL + Multiplier × Volume',
    measures: 'ADL gauges buying vs selling pressure by weighting each day\'s volume by where the close finished in its range.',
    construction: [
      'Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low), a value between −1 and +1.',
      'Adjusted Volume = Multiplier × Volume.',
      'ADL = previous ADL + Adjusted Volume (a cumulative running total).',
    ],
    reading: [
      'Rising ADL = accumulation (buying); falling ADL = distribution (selling).',
      'It is an unbounded index — watch its trend, not the raw value.',
      'Price up but ADL down (or vice-versa) is a divergence worth noting.',
    ],
  },
  mfi: {
    name: 'Money Flow Index (MFI)',
    blurb: 'A volume-weighted RSI on a fixed 0–100 scale.',
    formula: 'Typical Price = (H+L+C) ÷ 3   ·   MFI = 100 − 100 ÷ (1 + Positive Flow ÷ Negative Flow over n)',
    measures: 'MFI measures buying vs selling pressure like RSI, but weights each move by its volume.',
    construction: [
      'Typical Price = (High + Low + Close) ÷ 3.',
      'Raw Money Flow = Typical Price × Volume.',
      'Over n bars, sum the flows on up days and on down days.',
      'MFI = 100 − 100 ÷ (1 + positive-flow sum ÷ negative-flow sum).',
    ],
    reading: [
      '70 and above = overbought; 30 and below = oversold.',
      'Because it uses volume, high-volume moves count more than in plain RSI.',
      'A divergence from price hints at weakening pressure.',
    ],
  },
  ppo: {
    name: 'Percentage Price Oscillator (PPO)',
    blurb: 'A normalized MACD shown in percent, so it is comparable across any price level.',
    formula: 'PPO = ((Fast EMA − Slow EMA) ÷ Slow EMA) × 100   ·   Signal = EMA of PPO',
    measures: 'PPO measures the same momentum as MACD, but as a percentage — comparable across stocks and over long ranges.',
    construction: [
      'Compute the fast EMA and slow EMA of the close.',
      'PPO = (fast EMA − slow EMA) ÷ slow EMA × 100.',
      'Signal = an EMA of the PPO.',
      'Histogram = PPO − Signal.',
    ],
    reading: [
      'Above 0 = fast EMA is above slow EMA (uptrend bias).',
      'PPO crossing its Signal line = momentum turning.',
      'Being a %, it compares fairly between different-priced stocks.',
    ],
  },
  dmi: {
    name: 'Directional Movement Index (+DI, −DI, ADX)',
    blurb: 'Shows trend direction with the two DI lines and trend strength with the ADX.',
    formula: 'TR = max(H−L, |H−prevC|, |L−prevC|)   ·   +DI = +DM14÷TR14×100   ·   DX = |+DI−−DI|÷(+DI+−DI)×100   ·   ADX = Wilder avg of DX',
    measures: 'The DMI separates trend direction (+DI vs −DI) from trend strength (ADX).',
    construction: [
      'True Range = max(High−Low, |High−prevClose|, |Low−prevClose|).',
      '+DM / −DM = the part of today\'s range that lies outside yesterday\'s range.',
      'Wilder-smooth TR, +DM, −DM over n, then +DI = +DM14÷TR14×100 and −DI = −DM14÷TR14×100.',
      'DX = |+DI − −DI| ÷ (+DI + −DI) × 100; ADX = the Wilder average of DX.',
    ],
    reading: [
      '+DI above −DI = uptrend; −DI above +DI = downtrend.',
      'ADX above 25 and rising = a strong trend (up OR down — ADX is direction-agnostic).',
      'A falling ADX = the trend is weakening.',
    ],
  },
  rvol: {
    name: 'Relative Volume (RVOL)',
    blurb: 'RVOL compares today\'s volume to the average volume over a lookback period, showing whether participation is unusually high or low.',
    formula: 'Average Volume = SMA of Volume over n bars   ·   RVOL = Today\'s Volume ÷ Average Volume',
    measures: 'RVOL measures how today\'s volume compares to normal. A reading of 1.0 means average; 2.0 means twice the average volume.',
    construction: [
      'Calculate the Simple Moving Average (SMA) of volume over the lookback period n.',
      'Divide today\'s volume by that average: RVOL = Volume ÷ Avg Volume.',
      'A value of 1.0 is exactly average; above 1.0 is above average, below 1.0 is below average.',
      'The reference line at 1.0 is the key level — everything is measured relative to it.',
    ],
    reading: [
      'RVOL above 1.0 = above-average participation (confirms price moves, breakouts, reversals).',
      'RVOL above 2.0 = significantly elevated volume — high conviction move or climax.',
      'RVOL below 0.5 = very low participation — price moves on thin volume are less reliable.',
      'RVOL is most powerful as a confirming indicator: a breakout on high RVOL is far more credible than one on low volume.',
    ],
  },
  sma: {
    name: 'Simple Moving Average (SMA)',
    blurb: 'The SMA is the plain average of the closing price over n bars — the foundation of all moving averages.',
    formula: 'SMA = (C1 + C2 + ... + Cn) ÷ n',
    measures: 'The SMA smooths price data by equally averaging the last n closes. It removes short-term noise to reveal the underlying trend.',
    construction: [
      'Choose a period n (e.g. 20 bars).',
      'Add the closing prices of the last n bars together.',
      'Divide by n to get the average.',
      'Each day, drop the oldest close and add the newest — the average "slides" forward.',
    ],
    reading: [
      'Price above SMA = uptrend; price below SMA = downtrend.',
      'A shorter SMA (e.g. 10) reacts faster; a longer SMA (e.g. 200) is smoother and slower.',
      'SMA crossovers (e.g. 10 crossing 50) are classic trend-change signals.',
      'All n bars have equal weight — that is both its strength (simplicity) and weakness (lags on fast moves).',
    ],
  },
  ema: {
    name: 'Exponential Moving Average (EMA)',
    blurb: 'EMA weights recent closes more heavily than older ones using a smoothing multiplier, so it reacts faster than the SMA.',
    formula: 'k = 2 ÷ (n + 1)   ·   EMA = (Close × k) + (Previous EMA × (1 − k))',
    measures: 'EMA measures the trend with more emphasis on recent price action, making it more responsive than SMA to new data.',
    construction: [
      'Calculate the smoothing multiplier k = 2 ÷ (period + 1).',
      'Seed the first EMA value as the first closing price.',
      'Each subsequent EMA = (Current Close × k) + (Previous EMA × (1 − k)).',
      'Because k is always < 1, older data decays geometrically — never reaching zero but becoming negligible.',
    ],
    reading: [
      'EMA reacts faster than SMA of the same period — it turns earlier on reversals.',
      'Widely used in MACD (difference between two EMAs) and Bollinger Bands.',
      'Shorter period = higher k = more weight on today\'s close = faster reaction.',
      'Crossovers of a short EMA above/below a long EMA signal trend changes.',
    ],
  },
  lwma: {
    name: 'Linearly Weighted Moving Average (LWMA)',
    blurb: 'LWMA assigns linearly increasing weights — the most recent close gets weight n, the oldest gets weight 1.',
    formula: 'LWMA = (C1×1 + C2×2 + ... + Cn×n) ÷ (1 + 2 + ... + n)   where Cn is the most recent close',
    measures: 'LWMA smooths price with a linear (not exponential) taper — more responsive than SMA but less extreme than EMA.',
    construction: [
      'Assign weight 1 to the oldest close in the window, weight 2 to the next, up to weight n for today\'s close.',
      'Multiply each close by its weight and sum the products.',
      'Divide by the sum of all weights: n × (n+1) ÷ 2.',
      'This gives the most recent data more influence without the exponential decay of EMA.',
    ],
    reading: [
      'Responds faster than SMA but slower than EMA to price changes.',
      'Less commonly used than SMA/EMA but tested in the CMT curriculum.',
      'Like all MAs, price above LWMA = uptrend; below = downtrend.',
      'The key differentiator: weights increase linearly, not exponentially.',
    ],
  },
  wilderma: {
    name: 'Wilder Moving Average (WSMA)',
    blurb: 'Wilder\'s smoothing uses k = 1/n (vs EMA\'s 2/(n+1)), making it slower and smoother. Used inside RSI, ADX, and ATR.',
    formula: 'WSMA = (Previous WSMA × (n−1) + Current Close) ÷ n   ·   Seed = SMA of first n bars',
    measures: 'Wilder MA is a slower, smoother version of EMA. Because k = 1/n is smaller than EMA\'s k = 2/(n+1), it lags more but is very stable.',
    construction: [
      'Seed: calculate the SMA of the first n bars as the starting value.',
      'Smoothing factor k = 1 ÷ n (compare: EMA uses k = 2 ÷ (n+1)).',
      'WSMA = Previous WSMA × (n−1)/n + Current Close × (1/n).',
      'Equivalent to an EMA with period (2n−1) — so Wilder 14 ≈ EMA 27.',
    ],
    reading: [
      'Wilder 14 is used internally in RSI, ADX/DMI, and ATR — it is the standard smoothing for those indicators.',
      'Slower to turn than EMA — signals trend changes later but with fewer false signals.',
      'A Wilder MA of period n is equivalent to an EMA of period (2n − 1).',
      'Seed value matters — the SMA seed means early bars are approximate.',
    ],
  },
  distma: {
    name: 'Distance from MA (%)',
    blurb: 'Shows how far price is from its Simple Moving Average, expressed as a percentage. Identifies overbought/oversold stretches.',
    formula: 'Distance (%) = (Close − SMA) ÷ SMA × 100',
    measures: 'Distance from MA measures how stretched or compressed price is relative to its moving average trend — useful for mean-reversion setups.',
    construction: [
      'Calculate the SMA of the closing price over n bars.',
      'Subtract the SMA from the current close.',
      'Divide by the SMA and multiply by 100 to express as a percentage.',
      'Positive = price above MA (extended upward); Negative = price below MA (extended downward).',
    ],
    reading: [
      'Large positive readings: price is far above the MA — potential mean-reversion short or overbought condition.',
      'Large negative readings: price is far below the MA — potential mean-reversion long or oversold condition.',
      'What counts as "large" depends on the asset — compare to historical extremes.',
      'Crossing zero = price has crossed its MA (trend change signal).',
    ],
  },
  cmf: {
    name: 'Chaikin Money Flow (CMF)',
    blurb: 'CMF measures buying and selling pressure over a period by summing volume weighted by where the close falls in the high-low range.',
    formula: 'Multiplier = ((Close−Low) − (High−Close)) ÷ (High−Low)   ·   MFV = Multiplier × Volume   ·   CMF = Sum(MFV, n) ÷ Sum(Volume, n)',
    measures: 'CMF measures net buying vs selling pressure as a ratio, oscillating between −1 and +1 (typically ±0.5 in practice).',
    construction: [
      'Step 1 — Money Flow Multiplier: ((Close−Low) − (High−Close)) ÷ (High−Low). Ranges from −1 (close at the low) to +1 (close at the high).',
      'Step 2 — Money Flow Volume (MFV): Multiplier × Volume for that bar.',
      'Step 3 — Over the lookback period n, sum all MFV values and sum all Volume values.',
      'Step 4 — CMF = Sum of MFV ÷ Sum of Volume. This normalizes by volume so big-volume days count more.',
    ],
    reading: [
      'Above 0 = net buying pressure (accumulation); below 0 = net selling pressure (distribution).',
      'A reading above +0.25 signals strong buying; below −0.25 signals strong selling.',
      'CMF crossing above 0 from below = a shift from distribution to accumulation.',
      'Note: ADL uses the same multiplier but as a running total; CMF is a windowed ratio — so it is bounded and mean-reverting.',
    ],
  },
  obv: {
    name: 'On Balance Volume (OBV)',
    blurb: 'OBV is a running volume total that adds volume on up days and subtracts it on down days.',
    formula: 'If Close > prev Close: OBV = prev OBV + Volume   ·   If Close < prev Close: OBV = prev OBV − Volume   ·   If unchanged: OBV = prev OBV',
    measures: 'OBV measures cumulative buying and selling pressure by tracking whether volume flows in (up day) or out (down day).',
    construction: [
      'Start with Day 1 volume as the initial OBV.',
      'Each subsequent day: if the close is higher than the previous close, add that day\'s volume to OBV.',
      'If the close is lower, subtract the volume. If unchanged, OBV stays the same.',
      'Plot the running total as a line — the absolute value does not matter, only the trend.',
    ],
    reading: [
      'Rising OBV = volume is flowing in on up days (accumulation / buying pressure).',
      'Falling OBV = volume is flowing out on down days (distribution / selling pressure).',
      'If price makes a new high but OBV does not, the breakout lacks volume support (bearish divergence).',
      'Developed by Joe Granville — the original volume-based indicator (CMT curriculum).',
    ],
  },
  bb: {
    name: 'Bollinger Bands®',
    blurb: 'Bollinger Bands wrap price in a moving average plus and minus a multiple of standard deviation, so the bands widen when volatility rises and tighten when it falls.',
    formula: 'Middle = 20-period SMA of close   ·   Upper = Middle + (2 × 20-period std dev)   ·   Lower = Middle − (2 × 20-period std dev)',
    measures: 'Bollinger Bands show whether price is high or low on a relative basis, and whether volatility is expanding or contracting. John Bollinger\'s key insight: volatility is dynamic, not fixed — so the bands set their own width automatically.',
    construction: [
      'Middle band = a simple moving average of the closing price (default 20 periods).',
      'Compute the population standard deviation (÷ n, the same way the moving average is built) of those same 20 closes.',
      'Upper band = middle + (multiplier × standard deviation). Default multiplier = 2.',
      'Lower band = middle − (multiplier × standard deviation). Squaring the deviations makes the bands expand fast in trends and pull in tight during consolidations.',
    ],
    reading: [
      'Price near the upper band = relatively high; near the lower band = relatively low. This does NOT automatically mean "too high / too low" — that is the most common error.',
      'Bands tightening = "The Squeeze" (low volatility, often precedes a move); bands bulging outward = "The Bulge" (expanding volatility).',
      'Roughly 90% of price action stays inside the bands — security prices are fat-tailed, so not the ~95% a normal distribution would imply.',
      'Created by John Bollinger. Bollinger Bands are a tool, not a standalone trading system.',
    ],
  },
};

// Practical, real-market applications — how traders actually put each indicator to work.
const USE_CASES: Record<IndicatorKey, string[]> = {
  roc: [
    'Momentum ranking: scan a watchlist and rank stocks by ROC to surface the strongest and weakest movers for rotation strategies.',
    'Divergence alerts: if price makes a new high but ROC makes a lower high, the move is losing fuel — a heads-up for an upcoming pullback.',
    'Breakout confirmation: a sharp jump in ROC as price clears resistance adds conviction that the breakout is real, not a fake-out.',
    'Cycle timing: in range-bound markets, repeated ROC peaks and troughs help time swing entries and exits.',
  ],
  macd: [
    'Trend entries: in an uptrend, traders buy when the MACD line crosses above its signal line and trim when it crosses back below.',
    'Zero-line filter: MACD above zero confirms an up-bias, below zero a down-bias — used to only take trades in the trend\'s direction.',
    'Early warnings: the histogram shrinks before a crossover, giving an advance signal that momentum is fading.',
    'Reversal hunting: MACD/price divergence at the end of a long trend often precedes a turn — popular on daily and weekly charts.',
  ],
  rsi: [
    'Mean-reversion timing: buy pullbacks when RSI dips below 30 (oversold) and fades rallies near 70 (overbought) in range markets.',
    'Trend filter: keeping RSI above 50 for longs / below 50 for shorts keeps you on the right side of the trend.',
    'Divergence: bullish/bearish RSI divergence is one of the most-used early reversal signals across all timeframes.',
    'Strong-trend tweak: in powerful trends, traders shift the bands (e.g. 40–80) so RSI doesn\'t flash "overbought" too early.',
  ],
  stochastics: [
    'Pullback entries: in an uptrend, a %K cross up out of oversold (<20) pinpoints low-risk re-entry points.',
    'Range trading: fade overbought (>80) and oversold (<20) turns when price is stuck in a sideways band.',
    'Crossover timing: %K crossing %D is a fast, short-term momentum trigger for active traders.',
    'Divergence: stochastic divergence at tops and bottoms warns of exhaustion before price actually turns.',
  ],
  adl: [
    'Trend health check: a rising ADL alongside rising price confirms genuine accumulation behind the advance.',
    'Hidden distribution: price climbing while ADL falls warns that big players are quietly selling into strength.',
    'Base spotting: ADL rising during a flat consolidation hints at accumulation before a breakout.',
    'Breakout validation: a breakout backed by a jump in ADL is far more trustworthy than one without volume flow.',
  ],
  mfi: [
    'Volume-confirmed extremes: because MFI uses volume, its overbought/oversold signals are often more reliable than plain RSI on liquid names.',
    'Exhaustion divergence: MFI failing to confirm a new price high flags a move running out of money.',
    'Smart-money clues: sustained high MFI suggests accumulation; collapsing MFI suggests distribution.',
    'Breakout filter: traders require rising MFI to back a breakout, screening out low-conviction moves.',
  ],
  ppo: [
    'Cross-stock comparison: because PPO is a percentage, you can directly compare momentum between a ₹100 stock and a ₹5,000 stock.',
    'Portfolio ranking: rank a whole watchlist by PPO to find the strongest momentum candidates.',
    'Same signals as MACD: zero-line crosses, signal-line crosses and divergence — but normalized and comparable.',
    'Long-history backtests: PPO stays meaningful even when a stock\'s price has changed 10x over the years.',
  ],
  dmi: [
    'Strategy switch: ADX above 25 says "trend is strong → use trend-following"; below 20 says "choppy → use range tactics or stand aside".',
    'Directional entries: +DI crossing above −DI signals an uptrend entry; −DI over +DI signals a downtrend.',
    'Whipsaw filter: skipping trades when ADX is low avoids the death-by-a-thousand-cuts of sideways markets.',
    'Riding trends: as long as ADX keeps rising, traders hold; a falling ADX warns the trend is tiring.',
  ],
  obv: [
    'Breakout confirmation: OBV breaking to new highs with price confirms real buying behind the move.',
    'Divergence: price at a new high but OBV lagging warns the rally lacks volume support (and vice-versa at bottoms).',
    'Early accumulation: OBV can rise before price during a base, hinting that smart money is loading up.',
    'Trend confirmation: a steadily rising OBV reassures trend-followers their position is well-supported.',
  ],
  cmf: [
    'Pressure gauge: CMF above zero confirms net buying behind an uptrend; below zero confirms selling pressure.',
    'Divergence: CMF rolling over while price rises warns the advance is weakening internally.',
    'Shift detection: CMF crossing up through zero flags a change from distribution to accumulation.',
    'Breakout conviction: a breakout with strongly positive CMF is more likely to follow through.',
  ],
  rvol: [
    'Trade filter: many day-traders only take setups where RVOL is above 1.5–2, ensuring there\'s enough participation to move.',
    'Stocks "in play": pre-market scanners use RVOL to find gappers and news names worth watching that day.',
    'Breakout reliability: a breakout on 3x RVOL is far more credible than the same breakout on thin volume.',
    'Climax spotting: an extreme RVOL spike after a long run can mark exhaustion and a turning point.',
  ],
  sma: [
    'Dynamic support/resistance: the 50- and 200-day SMAs act as battle lines that institutions watch and defend.',
    'Golden / Death Cross: the 50-day crossing the 200-day is a widely-followed long-term trend signal.',
    'Trend filter: only buying when price is above the 200-day SMA keeps systematic traders on the right side of the market.',
    'Stop placement: a rising SMA gives a logical, objective level to trail a stop beneath.',
  ],
  ema: [
    'Faster signals: active traders use 9/21 EMAs on intraday charts to react quicker than the SMA allows.',
    'Dynamic support: in trends, pullbacks to the 20-EMA are classic low-risk entry zones.',
    'EMA ribbons: stacking several EMAs visualizes trend strength and direction at a glance.',
    'System building block: the EMA is the engine inside MACD, PPO and many automated strategies.',
  ],
  lwma: [
    'Less lag, less noise: LWMA reacts faster than SMA but is steadier than EMA — useful for cleaner trend entries.',
    'Crossover systems: a fast LWMA crossing a slow LWMA is a responsive trend-change trigger.',
    'Smoothing intraday data: the linear weighting tames choppy short-timeframe price without over-smoothing.',
    'Adaptive strategies: weighting recent data more makes LWMA popular in custom, faster-reacting systems.',
  ],
  wilderma: [
    'Understand your indicators: Wilder smoothing is the math inside RSI, ADX/DMI and ATR — knowing it explains how those behave.',
    'Fewer whipsaws: its slow, stable nature suits position traders who want to avoid false signals.',
    'Volatility stops: ATR (which uses Wilder smoothing) drives the popular chandelier and ATR-trailing stops.',
    'Long-term trend tracking: a Wilder MA of n behaves like an EMA of (2n−1), so it rides longer trends smoothly.',
  ],
  distma: [
    'Mean-reversion: when price stretches to an unusually large % above/below its MA, traders fade the extreme back toward the average.',
    'Overextension alerts: large positive readings flag rallies that have run too far, too fast.',
    'Cross-stock comparison: the % framing lets you compare how stretched different stocks are right now.',
    'Re-entry timing: after a snap-back toward the MA (distance near zero), trend traders look to re-enter.',
  ],
  bb: [
    'The Squeeze: when the bands pinch to their tightest in months, volatility is coiling — traders pre-position for the breakout that often follows.',
    'Band rides: in strong trends, price "walks the band", hugging the upper band up (or lower band down) — a sign of trend strength, not a reversal.',
    'Range reversion: in sideways markets, tags of the upper/lower band mark fade entries back toward the middle.',
    'Stops & targets: the opposite band and the middle SMA give objective, volatility-adjusted exit and target levels; W-bottoms and M-tops are confirmed with the bands.',
  ],
};

function fmt(v: number | null, d = 2) {
  return v === null || !Number.isFinite(v) ? '—' : v.toFixed(d);
}

export function IndicatorTool({ indicator, embedded = false }: { indicator: IndicatorKey; embedded?: boolean }) {
  const meta = META[indicator];
  const bars = AAPL_SAMPLE;
  const N = bars.length;

  const isMa = MA_KEYS.includes(indicator);
  const usesEma = indicator === 'macd' || indicator === 'ppo';
  const usesPeriod = ['roc', 'rsi', 'stochastics', 'mfi', 'dmi', 'cmf', 'rvol'].includes(indicator);
  const noControls = indicator === 'adl' || indicator === 'obv';
  const [period, setPeriod] = useState(
    indicator === 'roc' ? 10 : ['cmf', 'rvol', 'sma', 'ema', 'lwma', 'wilderma', 'distma', 'bb'].includes(indicator) ? 20 : 14
  );
  const [mult, setMult] = useState(2); // Bollinger std-dev multiplier
  const MA_COLORS_LIST = [
    { label: 'Blue',   value: '#2563eb' },
    { label: 'Orange', value: '#d97706' },
    { label: 'Red',    value: '#dc2626' },
    { label: 'Purple', value: '#7c3aed' },
    { label: 'Green',  value: '#047857' },
    { label: 'Pink',   value: '#db2777' },
  ];
  const [maColor, setMaColor] = useState('#2563eb');
  const MA_PRESETS = [5, 10, 20, 50, 100, 200];
  const [fast, setFast] = useState(12);
  const [slow, setSlow] = useState(26);
  const [signal, setSignal] = useState(9);
  const firstDate = bars[0].date;
  const lastDate = bars[N - 1].date;
  const [fromDate, setFromDate] = useState(bars[Math.max(0, N - 120)].date);
  const [toDate, setToDate] = useState(lastDate);
  const fromI = useMemo(() => { const i = bars.findIndex((b) => b.date >= fromDate); return i < 0 ? 0 : i; }, [bars, fromDate]);
  const toI = useMemo(() => { for (let i = N - 1; i >= 0; i--) if (bars[i].date <= toDate) return i; return N - 1; }, [bars, toDate, N]);
  const lo = Math.min(fromI, toI);
  const hi = Math.max(fromI, toI);
  const setPreset = (count: number) => { setFromDate(bars[Math.max(0, N - count)].date); setToDate(lastDate); };
  const PRESETS: [string, number][] = [['1M', 21], ['3M', 63], ['6M', 126], ['1Y', 252], ['5Y', N]];

  // compute on the FULL series, then show only the selected window
  const roc = useMemo(() => computeRoc(bars, period), [bars, period]);
  const rsi = useMemo(() => computeRsi(bars, period), [bars, period]);
  const macd = useMemo(() => computeMacd(bars, fast, slow, signal), [bars, fast, slow, signal]);
  const stoch = useMemo(() => computeStochastics(bars, period), [bars, period]);
  const adl = useMemo(() => computeAdl(bars), [bars]);
  const obv = useMemo(() => computeObv(bars), [bars]);
  const cmf = useMemo(() => computeCmf(bars, period), [bars, period]);
  const rvol = useMemo(() => computeRvol(bars, period), [bars, period]);
  const sma = useMemo(() => computeSma(bars, period), [bars, period]);
  const ema = useMemo(() => computeEma(bars, period), [bars, period]);
  const lwma = useMemo(() => computeLwma(bars, period), [bars, period]);
  const wilderma = useMemo(() => computeWilderMa(bars, period), [bars, period]);
  const distma = useMemo(() => computeDistMa(bars, period), [bars, period]);
  const bb = useMemo(() => computeBollinger(bars, period, mult), [bars, period, mult]);
  const mfi = useMemo(() => computeMfi(bars, period), [bars, period]);
  const ppo = useMemo(() => computePpo(bars, fast, slow, signal), [bars, fast, slow, signal]);
  const dmi = useMemo(() => computeDmi(bars, period), [bars, period]);

  const sl = <T,>(arr: T[]) => arr.slice(lo, hi + 1);
  const dates = sl(bars.map((b) => b.date.slice(5)));
  const priceSeries = { label: 'Close', color: '#292524', values: sl(bars.map((b) => b.close)) };

  const chart = (() => {
    if (indicator === 'roc')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`ROC (${period})`} indSuffix="%"
        indicators={[{ label: `ROC (${period})`, color: EMERALD, values: sl(roc.line) }]} refLines={[{ value: 0, label: '0', color: '#9ca3af' }]} />;
    if (indicator === 'rsi')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`RSI (${period})`} indMin={0} indMax={100}
        indicators={[{ label: `RSI (${period})`, color: EMERALD, values: sl(rsi.line) }]} refLines={[{ value: 70, label: '70 overbought' }, { value: 30, label: '30 oversold' }]} />;
    if (indicator === 'macd')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel="MACD"
        indicators={[{ label: 'MACD', color: BLUE, values: sl(macd.macdLine) }, { label: 'Signal', color: AMBER, values: sl(macd.signalLine) }]} refLines={[{ value: 0, label: '0', color: '#9ca3af' }]} />;
    if (indicator === 'stochastics')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`Stochastics %K/%D (${period})`} indMin={0} indMax={100}
        indicators={[{ label: '%K', color: EMERALD, values: sl(stoch.kLine) }, { label: '%D', color: AMBER, values: sl(stoch.dLine) }]} refLines={[{ value: 80, label: '80 overbought' }, { value: 20, label: '20 oversold' }]} />;
    if (indicator === 'adl')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel="Accumulation / Distribution Line"
        indicators={[{ label: 'ADL', color: EMERALD, values: sl(adl.line) }]} />;
    if (indicator === 'obv')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel="On Balance Volume (OBV)"
        indicators={[{ label: 'OBV', color: BLUE, values: sl(obv.line) }]} />;
    if (indicator === 'sma')
      return <OverlayChart categories={dates} price={priceSeries}
        overlay={{ label: `SMA (${period})`, color: maColor, values: sl(sma.line) }} />;
    if (indicator === 'ema')
      return <OverlayChart categories={dates} price={priceSeries}
        overlay={{ label: `EMA (${period})`, color: maColor, values: sl(ema.line) }} />;
    if (indicator === 'lwma')
      return <OverlayChart categories={dates} price={priceSeries}
        overlay={{ label: `LWMA (${period})`, color: maColor, values: sl(lwma.line) }} />;
    if (indicator === 'wilderma')
      return <OverlayChart categories={dates} price={priceSeries}
        overlay={{ label: `Wilder MA (${period})`, color: maColor, values: sl(wilderma.line) }} />;
    if (indicator === 'distma')
      return <OverlayChart categories={dates} price={priceSeries}
        overlay={{ label: `SMA (${period})`, color: BLUE, values: sl(distma.smaLine) }}
        indicator={{ label: `Distance from SMA (${period}) %`, values: sl(distma.distLine), color: PURPLE, suffix: '%',
          refLines: [{ value: 0, label: '0', color: '#9ca3af' }] }} />;
    if (indicator === 'bb')
      return <OverlayChart categories={dates} price={priceSeries}
        overlay={{ label: `Middle SMA (${period})`, color: maColor, values: sl(bb.middleLine) }}
        bands={{ upper: sl(bb.upperLine), lower: sl(bb.lowerLine), label: `Upper / Lower (${mult}σ)` }} />;
    if (indicator === 'cmf')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`Chaikin Money Flow (${period})`}
        indicators={[{ label: `CMF (${period})`, color: PURPLE, values: sl(cmf.line) }]}
        refLines={[{ value: 0, label: '0', color: '#9ca3af' }, { value: 0.25, label: '+0.25 strong buy' }, { value: -0.25, label: '-0.25 strong sell' }]} />;
    if (indicator === 'rvol')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`Relative Volume (${period})`}
        indicators={[{ label: `RVOL (${period})`, color: AMBER, values: sl(rvol.line) }]}
        refLines={[{ value: 1, label: '1.0 average', color: '#9ca3af' }, { value: 2, label: '2.0 high' }]} />;
    if (indicator === 'mfi')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`MFI (${period})`} indMin={0} indMax={100}
        indicators={[{ label: `MFI (${period})`, color: EMERALD, values: sl(mfi.line) }]} refLines={[{ value: 70, label: '70 overbought' }, { value: 30, label: '30 oversold' }]} />;
    if (indicator === 'ppo')
      return <PanelChart categories={dates} price={priceSeries} indicatorLabel="PPO" indSuffix="%"
        indicators={[{ label: 'PPO', color: BLUE, values: sl(ppo.ppoLine) }, { label: 'Signal', color: AMBER, values: sl(ppo.signalLine) }]} refLines={[{ value: 0, label: '0', color: '#9ca3af' }]} />;
    return <PanelChart categories={dates} price={priceSeries} indicatorLabel={`DMI (${period})`} indMin={0}
      indicators={[{ label: '+DI', color: EMERALD, values: sl(dmi.plusDI) }, { label: '−DI', color: RED, values: sl(dmi.minusDI) }, { label: 'ADX', color: PURPLE, values: sl(dmi.adx) }]} refLines={[{ value: 25, label: '25 strong trend' }]} />;
  })();

  const seg = (on: boolean) =>
    `rounded-md px-2.5 py-1 text-[12.5px] transition ${on ? 'bg-white font-medium text-stone-900 shadow-sm ring-1 ring-stone-200' : 'text-stone-500 hover:text-stone-900'}`;
  const presetActive = (cnt: number) => toDate === lastDate && fromDate === bars[Math.max(0, N - cnt)].date;
  const controlLabel = 'text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400';
  const dateInput = 'rounded-md border border-stone-200 bg-white px-2.5 py-1.5 text-[13px] text-stone-800 focus:border-stone-400 focus:outline-none';

  return (
    <div className="space-y-6">
      {!embedded && (
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-emerald-800">Interactive tool</p>
          <h1 className="mt-3 font-serif text-[40px] font-normal leading-tight text-stone-900">{meta.name}</h1>
          <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-stone-500">{meta.blurb}</p>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
        {/* Controls */}
        <div className="flex flex-wrap items-end gap-x-10 gap-y-5 border-b border-stone-200 px-5 py-5 sm:px-6">
          {isMa ? (
            <>
              <div>
                <p className={controlLabel}>Period</p>
                <div className="mt-2 flex items-center gap-3">
                  <input type="range" min={2} max={200} value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="w-32 accent-emerald-800" aria-label="Period" />
                  <span className="w-8 font-mono text-[13px] text-stone-900">{period}</span>
                  <div className="inline-flex rounded-lg bg-stone-100 p-0.5">
                    {MA_PRESETS.map((p) => (
                      <button key={p} type="button" onClick={() => setPeriod(p)} className={seg(period === p)}>{p}</button>
                    ))}
                  </div>
                </div>
              </div>
              {indicator !== 'distma' && (
                <div>
                  <p className={controlLabel}>Line colour</p>
                  <div className="mt-2.5 flex items-center gap-2">
                    {MA_COLORS_LIST.map((c) => (
                      <button key={c.value} type="button" title={c.label} aria-label={c.label} onClick={() => setMaColor(c.value)}
                        className={`h-5 w-5 rounded-full ring-offset-2 transition ${maColor === c.value ? 'ring-2 ring-stone-400' : 'hover:ring-1 hover:ring-stone-300'}`}
                        style={{ backgroundColor: c.value }} />
                    ))}
                  </div>
                </div>
              )}
              {indicator === 'bb' && (
                <div>
                  <p className={controlLabel}>Std deviations</p>
                  <div className="mt-2 inline-flex rounded-lg bg-stone-100 p-0.5">
                    {[1, 2, 3].map((m) => (
                      <button key={m} type="button" onClick={() => setMult(m)} className={seg(mult === m)}>{m}σ</button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : usesEma ? (
            <div className="flex flex-wrap gap-6">
              {([['Fast EMA', fast, setFast], ['Slow EMA', slow, setSlow], ['Signal', signal, setSignal]] as const).map(([lbl, val, set]) => (
                <label key={lbl} className="block">
                  <span className={controlLabel}>{lbl}</span>
                  <input type="number" min={2} max={50} value={val} onChange={(e) => set(Math.max(2, Math.min(50, Number(e.target.value) || 2)))}
                    className={`mt-2 block w-20 font-mono ${dateInput}`} />
                </label>
              ))}
            </div>
          ) : usesPeriod ? (
            <div>
              <p className={controlLabel}>Period</p>
              <div className="mt-2 flex items-center gap-3">
                <input type="range" min={2} max={20} value={period} onChange={(e) => setPeriod(Number(e.target.value))} className="w-44 accent-emerald-800" aria-label="Period" />
                <span className="font-mono text-[13px] text-stone-900">{period}</span>
              </div>
            </div>
          ) : (
            <p className="max-w-md text-[13.5px] leading-relaxed text-stone-500">
              {indicator === 'obv' ? 'OBV has no period setting — it is a cumulative running total of volume, adding on up days and subtracting on down days.' : 'The ADL has no period setting — it is a cumulative running total of volume.'}
            </p>
          )}

          <div className="sm:ml-auto">
            <p className={controlLabel}>Date range</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <div className="inline-flex rounded-lg bg-stone-100 p-0.5">
                {PRESETS.map(([lbl, cnt]) => (
                  <button key={lbl} type="button" onClick={() => setPreset(cnt)} className={seg(presetActive(cnt))}>{lbl}</button>
                ))}
              </div>
              <input type="date" min={firstDate} max={lastDate} value={fromDate} onChange={(e) => e.target.value && setFromDate(e.target.value)} className={dateInput} aria-label="From date" />
              <span className="text-stone-300">–</span>
              <input type="date" min={firstDate} max={lastDate} value={toDate} onChange={(e) => e.target.value && setToDate(e.target.value)} className={dateInput} aria-label="To date" />
            </div>
          </div>
        </div>

        {/* Chart: price on top, indicator below */}
        <div className="px-3 pb-4 pt-5 sm:px-5">
          {chart}
        </div>
        <p className="border-t border-stone-100 px-5 py-3 text-xs text-stone-400 sm:px-6">
          Showing {hi - lo + 1} of {N} bars ({bars[lo].date} → {bars[hi].date}). Calculations use the full 5-year history, so values are correct from the first day shown.
        </p>
      </div>

      {/* Calculation table */}
      <details open className="group overflow-hidden rounded-2xl border border-stone-200 bg-white">
        <summary className="flex cursor-pointer list-none items-center justify-between px-5 py-4 sm:px-6 [&::-webkit-details-marker]:hidden">
          <span className="text-[14px] font-medium text-stone-900">Step-by-step calculation <span className="font-normal text-stone-400">· selected dates</span></span>
          <span className="text-xs text-stone-500 group-open:hidden">Show table</span>
          <span className="hidden text-xs text-stone-500 group-open:inline">Hide table</span>
        </summary>
        <div className="max-h-[420px] overflow-auto border-t border-stone-200">
          <CalcTable indicator={indicator} roc={sl(roc.rows)} rsi={sl(rsi.rows)} macd={sl(macd.rows)}
            stoch={sl(stoch.rows)} adl={sl(adl.rows)} mfi={sl(mfi.rows)} ppo={sl(ppo.rows)} dmi={sl(dmi.rows)}
            obv={sl(obv.rows)} cmf={sl(cmf.rows)} rvol={sl(rvol.rows)}
            sma={sl(sma.rows)} ema={sl(ema.rows)} lwma={sl(lwma.rows)} wilderma={sl(wilderma.rows)} distma={sl(distma.rows)} bb={sl(bb.rows)} />
        </div>
      </details>

      {/* Explanation */}
      <div className="grid gap-10 pt-6 md:grid-cols-2">
        <div>
          <h3 className="text-[13px] font-semibold text-stone-900">What {meta.name} measures</h3>
          <p className="mt-2 text-[15px] leading-[1.75] text-stone-600">{meta.measures}</p>
          <h3 className="mt-8 text-[13px] font-semibold text-stone-900">How it is constructed</h3>
          <ol className="mt-3 space-y-2.5">
            {meta.construction.map((p, i) => (
              <li key={p} className="flex gap-3 text-[15px] leading-[1.7] text-stone-600">
                <span className="w-4 flex-none font-mono text-[12px] leading-[1.9] text-stone-400">{i + 1}</span><span>{p}</span>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="text-[13px] font-semibold text-stone-900">How to read it</h3>
          <ul className="mt-3 space-y-2.5">
            {meta.reading.map((p) => (
              <li key={p} className="flex items-start gap-3 text-[15px] leading-[1.7] text-stone-600"><span className="mt-[11px] h-1 w-1 flex-none rounded-full bg-stone-300" /><span>{p}</span></li>
            ))}
          </ul>
          <p className="mt-8 text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">Formula</p>
          <div className="mt-2.5 overflow-x-auto rounded-lg border border-stone-200 bg-[#F4F3EE] px-4 py-3">
            <code className="font-mono text-[13px] leading-relaxed text-stone-800">{meta.formula}</code>
          </div>
        </div>
      </div>

      {/* Real-world use cases */}
      <div className="border-t border-stone-200 pt-8">
        <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-stone-400">In practice</p>
        <h3 className="mt-2 font-serif text-[22px] text-stone-900">How traders use {meta.name} in real markets</h3>
        <ul className="mt-5 grid gap-x-10 gap-y-3 md:grid-cols-2">
          {USE_CASES[indicator].map((u) => (
            <li key={u} className="flex items-start gap-3 text-[15px] leading-[1.7] text-stone-600"><span className="mt-[11px] h-1 w-1 flex-none rounded-full bg-emerald-600" /><span>{u}</span></li>
          ))}
        </ul>
        <p className="mt-6 text-xs text-stone-400">Educational examples only — not investment or trading advice. Sample data: {N} AAPL daily bars, for learning the calculation. <Link href="/tools" className="text-emerald-800 underline underline-offset-2">Back to all tools</Link></p>
      </div>
    </div>
  );
}

function th(label: string) { return <th className="whitespace-nowrap border-b border-stone-200 px-4 py-2.5 text-right text-[11px] font-medium uppercase tracking-[0.1em] text-stone-400 first:text-left">{label}</th>; }
function td(v: ReactNode, first = false) { return <td className={`whitespace-nowrap px-4 py-2 ${first ? 'text-left font-mono text-[12px] text-stone-400' : 'text-right font-mono text-[12.5px] tabular-nums text-stone-700'}`}>{v}</td>; }
function fmtInt(v: number | null) { return v === null || !Number.isFinite(v) ? '—' : Math.round(v).toLocaleString('en-US'); }

function CalcTable({ indicator, roc, rsi, macd, stoch, adl, mfi, ppo, dmi, obv, cmf, rvol, sma, ema, lwma, wilderma, distma, bb }: {
  indicator: IndicatorKey;
  roc: ReturnType<typeof computeRoc>['rows'];
  rsi: ReturnType<typeof computeRsi>['rows'];
  macd: ReturnType<typeof computeMacd>['rows'];
  stoch: ReturnType<typeof computeStochastics>['rows'];
  adl: ReturnType<typeof computeAdl>['rows'];
  mfi: ReturnType<typeof computeMfi>['rows'];
  ppo: ReturnType<typeof computePpo>['rows'];
  dmi: ReturnType<typeof computeDmi>['rows'];
  obv: ReturnType<typeof computeObv>['rows'];
  cmf: ReturnType<typeof computeCmf>['rows'];
  rvol: ReturnType<typeof computeRvol>['rows'];
  sma: ReturnType<typeof computeSma>['rows'];
  ema: ReturnType<typeof computeEma>['rows'];
  lwma: ReturnType<typeof computeLwma>['rows'];
  wilderma: ReturnType<typeof computeWilderMa>['rows'];
  distma: ReturnType<typeof computeDistMa>['rows'];
  bb: ReturnType<typeof computeBollinger>['rows'];
}) {
  if (indicator === 'roc') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('ROC %')}</tr></thead>
        <tbody>{roc.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.roc))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'rsi') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Change')}{th('Gain')}{th('Loss')}{th('Avg Gain')}{th('Avg Loss')}{th('RS')}{th('RSI')}</tr></thead>
        <tbody>{rsi.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.change))}{td(fmt(r.gain))}{td(fmt(r.loss))}{td(fmt(r.avgGain))}{td(fmt(r.avgLoss))}{td(fmt(r.rs))}{td(fmt(r.rsi))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'stochastics') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Low n')}{th('High n')}{th('%K')}{th('%D')}</tr></thead>
        <tbody>{stoch.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.lowN))}{td(fmt(r.highN))}{td(fmt(r.k))}{td(fmt(r.d))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'adl') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Volume')}{th('Multiplier')}{th('Adj Volume')}{th('ADL')}</tr></thead>
        <tbody>{adl.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmtInt(r.volume))}{td(fmt(r.multiplier))}{td(fmtInt(r.adjVol))}{td(fmtInt(r.adl))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'mfi') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Typ Price')}{th('Pos Flow')}{th('Neg Flow')}{th('MFI')}</tr></thead>
        <tbody>{mfi.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.typical))}{td(fmtInt(r.posFlow))}{td(fmtInt(r.negFlow))}{td(fmt(r.mfi))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'ppo') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Fast EMA')}{th('Slow EMA')}{th('PPO %')}{th('Signal')}{th('Histogram')}</tr></thead>
        <tbody>{ppo.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.emaFast))}{td(fmt(r.emaSlow))}{td(fmt(r.ppo))}{td(fmt(r.signal))}{td(fmt(r.hist))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'dmi') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('TR')}{th('+DI')}{th('−DI')}{th('DX')}{th('ADX')}</tr></thead>
        <tbody>{dmi.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.tr))}{td(fmt(r.plusDI))}{td(fmt(r.minusDI))}{td(fmt(r.dx))}{td(fmt(r.adx))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'obv') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Volume')}{th('Direction')}{th('OBV')}</tr></thead>
        <tbody>{obv.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmtInt(r.volume))}{td(<span className={r.direction === '+' ? 'text-emerald-700 font-medium' : r.direction === '−' ? 'text-rose-600 font-medium' : 'text-stone-400'}>{r.direction}</span>)}{td(fmtInt(r.obv))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'cmf') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Volume')}{th('Multiplier')}{th('MFV')}{th('Sum MFV')}{th('Sum Vol')}{th('CMF')}</tr></thead>
        <tbody>{cmf.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmtInt(r.volume))}{td(fmt(r.multiplier))}{td(fmtInt(r.mfv))}{td(r.sumMfv === null ? '—' : fmtInt(r.sumMfv))}{td(r.sumVol === null ? '—' : fmtInt(r.sumVol))}{td(fmt(r.cmf, 4))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'rvol') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Volume')}{th('Avg Volume')}{th('RVOL')}</tr></thead>
        <tbody>{rvol.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">
          {td(r.date, true)}{td(fmt(r.close))}{td(fmtInt(r.volume))}{td(r.avgVolume === null ? '—' : fmtInt(r.avgVolume))}
          {td(<span className={r.rvol === null ? '' : r.rvol >= 2 ? 'text-rose-600 font-medium' : r.rvol >= 1 ? 'text-emerald-700 font-medium' : 'text-stone-400'}>{r.rvol === null ? '—' : fmt(r.rvol)}</span>)}
        </tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'sma') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('SMA')}</tr></thead>
        <tbody>{sma.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.sma))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'ema') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('EMA')}</tr></thead>
        <tbody>{ema.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.ema))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'lwma') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('LWMA')}</tr></thead>
        <tbody>{lwma.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.lwma))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'wilderma') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Wilder MA')}</tr></thead>
        <tbody>{wilderma.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.wma))}</tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'distma') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('SMA')}{th('Distance %')}</tr></thead>
        <tbody>{distma.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">
          {td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.sma))}
          {td(<span className={r.dist === null ? '' : r.dist > 0 ? 'text-emerald-700 font-medium' : 'text-rose-600 font-medium'}>{fmt(r.dist)}%</span>)}
        </tr>)}</tbody>
      </table>
    );
  }
  if (indicator === 'bb') {
    return (
      <table className="w-full text-[13px]">
        <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Middle (SMA)')}{th('Std Dev')}{th('Upper')}{th('Lower')}{th('%B')}</tr></thead>
        <tbody>{bb.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">
          {td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.middle))}{td(fmt(r.stdev))}{td(fmt(r.upper))}{td(fmt(r.lower))}
          {td(<span className={r.pctB === null ? '' : r.pctB >= 100 ? 'text-rose-600 font-medium' : r.pctB <= 0 ? 'text-emerald-700 font-medium' : 'text-stone-700'}>{r.pctB === null ? '—' : fmt(r.pctB, 0) + '%'}</span>)}
        </tr>)}</tbody>
      </table>
    );
  }
  return (
    <table className="w-full text-[13px]">
      <thead className="sticky top-0 bg-white"><tr>{th('Date')}{th('Close')}{th('Fast EMA')}{th('Slow EMA')}{th('MACD')}{th('Signal')}{th('Histogram')}</tr></thead>
      <tbody>{macd.map((r) => <tr key={r.date} className="border-t border-stone-100 hover:bg-stone-50/70">{td(r.date, true)}{td(fmt(r.close))}{td(fmt(r.emaFast))}{td(fmt(r.emaSlow))}{td(fmt(r.macd))}{td(fmt(r.signal))}{td(fmt(r.hist))}</tr>)}</tbody>
    </table>
  );
}
