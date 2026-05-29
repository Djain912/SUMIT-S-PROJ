import { PrismaClient } from '@prisma/client';
import { readFileSync } from 'fs';

const envFile = readFileSync('.env', 'utf-8');
for (const line of envFile.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  process.env[key] = val;
}

const prisma = new PrismaClient();

function toSlug(text) {
  return text.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').slice(0, 120);
}

function doc(...paragraphs) {
  return {
    type: 'doc',
    content: paragraphs.map(text => ({
      type: 'paragraph',
      content: [{ type: 'text', text }],
    })),
  };
}

function heading(text, level = 2) {
  return { type: 'heading', attrs: { level }, content: [{ type: 'text', text }] };
}

function para(text) {
  return { type: 'paragraph', content: [{ type: 'text', text }] };
}

function bulletList(items) {
  return {
    type: 'bulletList',
    content: items.map(item => ({
      type: 'listItem',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: item }] }],
    })),
  };
}

function richDoc(...nodes) {
  return { type: 'doc', content: nodes };
}

// ─── CHAPTERS ──────────────────────────────────────────────────────────────────

const CHAPTERS = [
  { title: 'An Overview of Charting', slug: 'an-overview-of-charting', orderIndex: 10, description: 'Foundational charting concepts including line, bar, and candlestick charts, OHLC data, and price ranges.' },
  { title: 'Behavioral Finance', slug: 'behavioral-finance', orderIndex: 11, description: 'Psychological biases affecting investor decisions, prospect theory, loss aversion, and market anomalies.' },
  { title: 'Bollinger Bands', slug: 'bollinger-bands', orderIndex: 12, description: 'Bollinger Band construction, volatility dynamics, squeeze signals, and practical trading applications.' },
  { title: 'Candlestick Patterns', slug: 'candlestick-patterns', orderIndex: 13, description: 'Single and multi-candle reversal and continuation patterns including hammer, engulfing, doji, and stars.' },
  { title: 'Charting Volume and Open Interest', slug: 'charting-volume-and-open-interest', orderIndex: 14, description: 'Volume histograms, equivolume charts, tick volume, open interest mechanics, and confirmation signals.' },
  { title: 'Classical Chart Patterns', slug: 'classical-chart-patterns', orderIndex: 15, description: 'Head and shoulders, triangles, rectangles, double tops/bottoms, flags, pennants, gaps, and support/resistance.' },
];

// ─── SUBTOPICS ─────────────────────────────────────────────────────────────────

const SUBTOPICS = {
  'an-overview-of-charting': [
    { title: 'Chart Types and Data', slug: 'chart-types-and-data', orderIndex: 1, description: 'Line, bar, and candlestick charts; OHLC data components and price range concepts.' },
    { title: 'Bar Chart Construction', slug: 'bar-chart-construction', orderIndex: 2, description: 'Constructing bar charts with open, high, low, and close price representations.' },
    { title: 'Candlestick Chart Basics', slug: 'candlestick-chart-basics', orderIndex: 3, description: 'Japanese candlestick structure: real body, upper and lower shadows, and color conventions.' },
  ],
  'behavioral-finance': [
    { title: 'Prospect Theory and Loss Aversion', slug: 'prospect-theory-and-loss-aversion', orderIndex: 1, description: 'Kahneman-Tversky prospect theory, asymmetric utility of gains vs losses.' },
    { title: 'Belief Preservation Biases', slug: 'belief-preservation-biases', orderIndex: 2, description: 'Conservatism, confirmation bias, representativeness, and anchoring effects.' },
    { title: 'Information Processing Biases', slug: 'information-processing-biases', orderIndex: 3, description: 'Framing, mental accounting, availability heuristic, and overconfidence.' },
    { title: 'Emotional Biases', slug: 'emotional-biases', orderIndex: 4, description: 'Herding, overconfidence, endowment effect, and regret aversion.' },
  ],
  'bollinger-bands': [
    { title: 'Bollinger Band Calculation', slug: 'bollinger-band-calculation', orderIndex: 1, description: 'SMA middle band, upper/lower bands at ±2 standard deviations, parameter settings.' },
    { title: 'Volatility and the Squeeze', slug: 'volatility-and-the-squeeze', orderIndex: 2, description: 'Band width as a volatility measure, squeeze patterns signaling low volatility breakouts.' },
    { title: 'Trading Applications', slug: 'trading-applications', orderIndex: 3, description: 'Walking the bands, M-tops, W-bottoms, %B indicator, and bandwidth indicator.' },
  ],
  'candlestick-patterns': [
    { title: 'Single Candlestick Patterns', slug: 'single-candlestick-patterns', orderIndex: 1, description: 'Hammer, hanging man, shooting star, inverted hammer, and doji variations.' },
    { title: 'Two-Candle Reversal Patterns', slug: 'two-candle-reversal-patterns', orderIndex: 2, description: 'Bullish/bearish engulfing, piercing line, dark cloud cover, and harami.' },
    { title: 'Three-Candle Patterns', slug: 'three-candle-patterns', orderIndex: 3, description: 'Morning star, evening star, three white soldiers, three black crows.' },
    { title: 'Windows and Gaps', slug: 'windows-and-gaps', orderIndex: 4, description: 'Tasuki gaps, rising/falling windows, upside/downside gap three methods.' },
  ],
  'charting-volume-and-open-interest': [
    { title: 'Volume Analysis', slug: 'volume-analysis', orderIndex: 1, description: 'Volume histograms, tick volume, on-balance volume, and volume confirmation of price moves.' },
    { title: 'Equivolume Charts', slug: 'equivolume-charts', orderIndex: 2, description: 'Price-volume relationship through variable-width bars representing trading volume.' },
    { title: 'Open Interest Mechanics', slug: 'open-interest-mechanics', orderIndex: 3, description: 'Open interest in futures/options, commitment of traders, and OI as sentiment indicator.' },
  ],
  'classical-chart-patterns': [
    { title: 'Head and Shoulders Patterns', slug: 'head-and-shoulders-patterns', orderIndex: 1, description: 'H&S top, inverse H&S, neckline breakout, volume confirmation, and price targets.' },
    { title: 'Triangle Patterns', slug: 'triangle-patterns', orderIndex: 2, description: 'Symmetrical, ascending, and descending triangles; breakout direction and measuring objectives.' },
    { title: 'Double Tops and Bottoms', slug: 'double-tops-and-bottoms', orderIndex: 3, description: 'Double top (M formation), double bottom (W formation), confirmation and price targets.' },
    { title: 'Continuation Patterns', slug: 'continuation-patterns', orderIndex: 4, description: 'Flags, pennants, rectangles, and wedges as pauses in trend continuation.' },
    { title: 'Gaps and Support/Resistance', slug: 'gaps-and-support-resistance', orderIndex: 5, description: 'Common, breakaway, runaway, and exhaustion gaps; support/resistance role reversal.' },
  ],
};

// ─── NOTES ─────────────────────────────────────────────────────────────────────

const NOTES = {
  'an-overview-of-charting': {
    'chart-types-and-data': [
      {
        title: 'Introduction to Technical Charts',
        orderIndex: 1,
        contentJson: richDoc(
          heading('What is a Chart?'),
          para('A chart is a graphical representation of price data over time. It is the fundamental tool of the technical analyst, providing a visual history of a security\'s price action.'),
          heading('Types of Charts'),
          bulletList([
            'Line Chart: Connects closing prices over time. Simple and clean, ideal for identifying trends.',
            'Bar Chart (OHLC): Each bar shows Open, High, Low, and Close for the period. Provides more detail than a line chart.',
            'Candlestick Chart: Japanese origin; uses a "real body" to show open-to-close range and "shadows" (wicks) for high and low.',
            'Point & Figure Chart: Plots price movements without time on the x-axis; filters noise.',
          ]),
          heading('OHLC Data'),
          para('OHLC stands for Open, High, Low, Close. This is the standard data format for most price charts:'),
          bulletList([
            'Open: First traded price in the period.',
            'High: Highest traded price in the period.',
            'Low: Lowest traded price in the period.',
            'Close: Last traded price in the period (most important for many indicators).',
          ]),
          heading('The Range Concept'),
          para('The range is the difference between the High and Low of any given period. A wide range bar indicates high volatility; a narrow range bar indicates low volatility or consolidation.')
        ),
      },
    ],
    'bar-chart-construction': [
      {
        title: 'Reading and Constructing Bar Charts',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Bar Chart Structure'),
          para('Each bar in an OHLC chart represents one time period (day, week, hour, etc.). The bar has four key components:'),
          bulletList([
            'Vertical line: Spans from the low to the high of the period.',
            'Left tick: Marks the opening price.',
            'Right tick: Marks the closing price.',
          ]),
          heading('Interpreting Bar Charts'),
          para('When the close is higher than the open, bulls controlled the period. When the close is lower than the open, bears were in control.'),
          heading('Time Frames'),
          para('Bar charts can be constructed on any time frame: 1-minute, 5-minute, hourly, daily, weekly, or monthly. Longer time frames filter more noise and reveal longer-term trends.'),
          heading('Volume Bars'),
          para('Volume bars are typically displayed below the price bars. Higher volume on up bars (close > open) confirms buying pressure; higher volume on down bars confirms selling pressure.')
        ),
      },
    ],
    'candlestick-chart-basics': [
      {
        title: 'Japanese Candlestick Fundamentals',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Candlestick Anatomy'),
          para('A candlestick has three main components:'),
          bulletList([
            'Real Body: The rectangular area between the open and the close.',
            'Upper Shadow (wick): The line extending above the real body to the high.',
            'Lower Shadow (tail): The line extending below the real body to the low.',
          ]),
          heading('Color Convention'),
          bulletList([
            'Bullish (white/green) candle: Close is higher than the open. The real body is white or green.',
            'Bearish (black/red) candle: Close is lower than the open. The real body is black or red.',
          ]),
          heading('Body Size Significance'),
          para('A long real body indicates strong buying or selling pressure during that period. A short real body (called a spinning top) indicates indecision or balance between buyers and sellers.'),
          heading('Doji'),
          para('A doji occurs when the open and close are at (or very near) the same price, creating a cross-like shape. It signals indecision and potential reversal when appearing after a prolonged trend.')
        ),
      },
    ],
  },

  'behavioral-finance': {
    'prospect-theory-and-loss-aversion': [
      {
        title: 'Prospect Theory and Loss Aversion',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Prospect Theory'),
          para('Developed by Kahneman and Tversky (1979), prospect theory describes how people actually make decisions under uncertainty — contrary to traditional expected utility theory.'),
          heading('Key Insights'),
          bulletList([
            'People evaluate outcomes relative to a reference point (usually the purchase price), not in absolute terms.',
            'The utility curve is S-shaped: concave for gains, convex for losses.',
            'Losses loom larger than equivalent gains — the pain of a $100 loss is felt more strongly than the pleasure of a $100 gain.',
          ]),
          heading('Loss Aversion'),
          para('Loss aversion is the tendency for losses to have about twice the psychological impact of equivalent gains. This leads investors to:'),
          bulletList([
            'Hold losing positions too long (hoping to break even).',
            'Sell winning positions too early (locking in gains).',
            'Avoid taking necessary risks to protect current positions.',
          ]),
          heading('Disposition Effect'),
          para('The disposition effect — a direct consequence of loss aversion — is the tendency to sell winners too early and hold losers too long. This creates predictable momentum and reversal patterns that technical analysts can exploit.')
        ),
      },
    ],
    'belief-preservation-biases': [
      {
        title: 'Belief Preservation Biases',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Conservatism Bias'),
          para('Investors underreact to new information because they overweight their prior beliefs. This causes slow price adjustment to fundamentals, creating trends that technical analysis can identify.'),
          heading('Confirmation Bias'),
          para('The tendency to seek out and overweight information that confirms existing beliefs, while ignoring contradictory evidence. Analysts may cherry-pick data to support a predetermined view.'),
          heading('Representativeness Heuristic'),
          para('People judge the probability of an event based on how similar it is to a stereotype (base rate neglect). This leads to overreaction to recent performance (hot hand fallacy) and underreaction to long-term base rates.'),
          heading('Anchoring'),
          para('The tendency to rely heavily on the first piece of information encountered (the anchor). In markets, investors may anchor on a stock\'s 52-week high/low, recent highs, or round numbers, making these levels significant support/resistance.')
        ),
      },
    ],
    'information-processing-biases': [
      {
        title: 'Information Processing Biases',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Framing Effect'),
          para('How a decision is presented affects the choice made. Investors react differently to "a 20% chance of loss" versus "an 80% chance of gain" even though they are mathematically identical.'),
          heading('Mental Accounting'),
          para('People treat money differently based on its source or intended use, violating fungibility. Example: being willing to take more risk with "house money" (investment gains) than with initial capital.'),
          heading('Availability Heuristic'),
          para('People judge the likelihood of an event by how easily examples come to mind. Dramatic, recent events (crashes, bubbles) are overweighted. This causes overreaction to news and market volatility clustering.'),
          heading('Overconfidence'),
          para('Investors overestimate the precision of their forecasts and their own skill. This leads to excess trading, underdiversification, and underestimation of risk. Studies show overconfident investors trade more and earn less.')
        ),
      },
    ],
    'emotional-biases': [
      {
        title: 'Emotional Biases in Markets',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Herding Behavior'),
          para('The tendency to mimic the actions of a larger group, even against one\'s own analysis. Herding amplifies trends, creates bubbles, and causes panics. Technical analysis uses sentiment indicators to identify extremes in herding.'),
          heading('Regret Aversion'),
          para('Investors avoid actions that might later cause regret. This leads to following the crowd (no personal accountability) and holding losers to avoid the regret of crystallizing a loss.'),
          heading('Endowment Effect'),
          para('People assign higher value to things they already own than to identical things they do not own. This causes investors to hold positions simply because they own them, not based on forward-looking analysis.'),
          heading('Overconfidence and Self-Attribution'),
          para('Investors attribute gains to their own skill and losses to bad luck (self-attribution bias). This reinforces overconfidence over time. Combined with hindsight bias (knowing outcomes in advance seems obvious), it distorts learning.')
        ),
      },
    ],
  },

  'bollinger-bands': {
    'bollinger-band-calculation': [
      {
        title: 'Bollinger Band Construction',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Components of Bollinger Bands'),
          para('Bollinger Bands consist of three lines plotted around price:'),
          bulletList([
            'Middle Band: A simple moving average (default: 20-period SMA).',
            'Upper Band: Middle Band + (k × standard deviation). Default k = 2.',
            'Lower Band: Middle Band − (k × standard deviation). Default k = 2.',
          ]),
          heading('Standard Deviation Calculation'),
          para('The standard deviation is calculated from the same N periods used for the SMA. With k=2, approximately 88–89% of price action is contained within the bands under normal conditions.'),
          heading('Parameter Settings'),
          bulletList([
            'Default: 20-period SMA, ±2 standard deviations.',
            'Shorter-term trading: 10-period, ±1.5 SD.',
            'Longer-term: 50-period, ±2.5 SD.',
            'The key rule: as the period changes, the multiplier should also be adjusted.',
          ]),
          heading('Interpretation Principle'),
          para('Bollinger Bands adapt to market conditions. When volatility is high, bands widen; when volatility is low, bands narrow. Prices can "walk the bands" during strong trends, touching the upper band repeatedly in an uptrend.')
        ),
      },
    ],
    'volatility-and-the-squeeze': [
      {
        title: 'Volatility Dynamics and the Squeeze',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Bands as a Volatility Measure'),
          para('The width of Bollinger Bands reflects current volatility relative to the recent past. Wide bands = high volatility; narrow bands = low volatility.'),
          heading('The Bandwidth Indicator'),
          para('BandWidth = (Upper Band − Lower Band) / Middle Band × 100. This converts band width into a percentage of the middle band, making it comparable across different price levels.'),
          heading('The Squeeze'),
          para('A "squeeze" occurs when BandWidth falls to its lowest level in 6 months. This signals that volatility has contracted to an unusually low level, which historically precedes a significant price move.'),
          heading('Squeeze Interpretation'),
          bulletList([
            'The squeeze identifies when to expect a move, not which direction.',
            'The direction must be determined by other indicators or price action.',
            'After the squeeze, the first strong candle in either direction often indicates the breakout direction.',
          ]),
          heading('%B Indicator'),
          para('%B = (Price − Lower Band) / (Upper Band − Lower Band). Values above 1.0 mean price is above the upper band; below 0 means price is below the lower band. Useful for identifying overbought/oversold conditions relative to the bands.')
        ),
      },
    ],
    'trading-applications': [
      {
        title: 'Trading with Bollinger Bands',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Walking the Bands'),
          para('In a strong trend, price can "walk" along the upper band (uptrend) or lower band (downtrend). Touching the upper band is NOT a sell signal in a strong uptrend.'),
          heading('M-Tops (Double Tops)'),
          para('An M-Top forms when price makes a high near or above the upper band (first top), pulls back, then makes a second high that fails to exceed the upper band on a %B basis. This divergence warns of a potential reversal.'),
          heading('W-Bottoms (Double Bottoms)'),
          para('A W-Bottom forms when the first low touches or breaks the lower band, price rallies above the middle band, then makes a second low that stays above the lower band. This positive divergence signals accumulation.'),
          heading('The Bollinger Band System'),
          bulletList([
            'Do not buy just because price touches the lower band.',
            'Do not sell just because price touches the upper band.',
            'Use confirming indicators: volume, RSI, MACD, or momentum.',
            'Volatility cycles: from high to low and back to high.',
          ])
        ),
      },
    ],
  },

  'candlestick-patterns': {
    'single-candlestick-patterns': [
      {
        title: 'Single Candlestick Reversal Patterns',
        orderIndex: 1,
        contentJson: richDoc(
          heading('The Hammer'),
          para('Appears after a downtrend. Has a small real body at the top of the range with a long lower shadow (at least 2× the body) and little to no upper shadow. Color can be bullish or bearish, but a white/green body is more bullish.'),
          heading('The Hanging Man'),
          para('Same shape as the hammer but appears after an uptrend. It is a bearish reversal signal. The name reflects the image of a hanging body. Requires bearish confirmation the next session.'),
          heading('The Shooting Star'),
          para('Appears after an uptrend. Has a small real body at the bottom of the range with a long upper shadow (2×+ the body). Bearish. The long upper shadow shows that buyers pushed price higher but sellers drove it back down.'),
          heading('The Inverted Hammer'),
          para('Appears after a downtrend. Same shape as shooting star but bullish context. The next session must confirm with a higher open or strong close.'),
          heading('Doji Varieties'),
          bulletList([
            'Long-legged doji: Very long upper and lower shadows; extreme indecision.',
            'Gravestone doji: Open/close at low, long upper shadow; bearish at tops.',
            'Dragonfly doji: Open/close at high, long lower shadow; bullish at bottoms.',
            'Four-price doji: Open = High = Low = Close; very rare.',
          ])
        ),
      },
    ],
    'two-candle-reversal-patterns': [
      {
        title: 'Two-Candle Reversal Patterns',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Bullish Engulfing Pattern'),
          para('After a downtrend: a large white/green candle completely engulfs the prior black/red candle\'s real body. The second candle opens below the first candle\'s close and closes above the first candle\'s open. Strong bullish reversal.'),
          heading('Bearish Engulfing Pattern'),
          para('After an uptrend: a large black/red candle engulfs the prior white/green candle. Signals bearish reversal. Volume increase strengthens the signal.'),
          heading('Piercing Line'),
          para('Bullish two-candle pattern: after a downtrend, a black candle followed by a white candle that opens below the prior low but closes more than halfway up the prior candle\'s real body. Incomplete version is called "in-neck."'),
          heading('Dark Cloud Cover'),
          para('Bearish counterpart of piercing line. After an uptrend, a white candle followed by a black candle that opens above the prior high but closes more than halfway down the prior candle\'s real body.'),
          heading('Harami'),
          para('A small second candle whose real body is contained within the prior large candle\'s real body. A harami cross (second candle is a doji) is even more significant. Can be bullish or bearish depending on trend context.')
        ),
      },
    ],
    'three-candle-patterns': [
      {
        title: 'Three-Candle Patterns',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Morning Star'),
          para('Bullish three-candle reversal after a downtrend:'),
          bulletList([
            '1st candle: Long black/red candle (bears in control).',
            '2nd candle: Small real body (star) that gaps below the first; can be any color.',
            '3rd candle: Long white/green candle that closes well into the first candle\'s body.',
          ]),
          heading('Evening Star'),
          para('Bearish counterpart after an uptrend:'),
          bulletList([
            '1st candle: Long white/green candle.',
            '2nd candle: Small real body (star) that gaps above the first.',
            '3rd candle: Long black/red candle that closes well into the first candle\'s body.',
          ]),
          heading('Morning/Evening Doji Star'),
          para('Same structure but the second candle is a doji. Considered even more powerful than the regular morning/evening star pattern.'),
          heading('Three White Soldiers'),
          para('Three consecutive long white/green candles, each opening within the prior body and closing at or near the high. Strong bullish continuation/reversal after a consolidation.'),
          heading('Three Black Crows'),
          para('Three consecutive long black/red candles, each opening within the prior body and closing at or near the low. Strong bearish signal after an uptrend.')
        ),
      },
    ],
    'windows-and-gaps': [
      {
        title: 'Windows and Gap Patterns',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Windows in Candlestick Analysis'),
          para('In Japanese candlestick terminology, a "window" is a gap between two candles — i.e., the high of one candle is below the low of the next (rising window) or the low is above the high (falling window).'),
          heading('Rising Window'),
          para('A bullish gap where the low of the current candle is above the high of the prior candle. Acts as support on pullbacks. If price falls back into the window, the pattern is weakening.'),
          heading('Falling Window'),
          para('A bearish gap where the high of the current candle is below the low of the prior candle. Acts as resistance on bounces.'),
          heading('Upside Gap Two Crows'),
          para('Bearish: After an uptrend, a gap higher on a black candle, followed by another black candle that opens higher and closes into the gap. Signals the uptrend is losing steam.'),
          heading('Tasuki Gaps'),
          bulletList([
            'Upside Tasuki Gap: Two white candles separated by a gap, followed by a black candle that opens inside the second white body but does not close the gap. Bullish continuation.',
            'Downside Tasuki Gap: Two black candles separated by a gap, followed by a white candle that does not fill the gap. Bearish continuation.',
          ])
        ),
      },
    ],
  },

  'charting-volume-and-open-interest': {
    'volume-analysis': [
      {
        title: 'Volume as a Confirming Indicator',
        orderIndex: 1,
        contentJson: richDoc(
          heading('What is Volume?'),
          para('Volume is the total number of shares, contracts, or units traded in a given period. It measures the intensity of price moves and confirms or questions the validity of trends.'),
          heading('Volume and Trend Confirmation'),
          bulletList([
            'Rising price + rising volume = healthy uptrend (confirmed).',
            'Rising price + falling volume = potential exhaustion (divergence).',
            'Falling price + rising volume = strong distribution (bearish).',
            'Falling price + falling volume = weak selling; potential base forming.',
          ]),
          heading('On-Balance Volume (OBV)'),
          para('OBV adds volume on up days and subtracts volume on down days to create a cumulative line. When OBV rises with price, the uptrend is healthy. OBV divergence (price rising while OBV falls) warns of reversal.'),
          heading('Volume Histogram'),
          para('Displayed below the price chart as vertical bars. The height represents volume for that period. Analysts look for volume spikes at key price reversals (climactic action) and drying up volume in consolidations.')
        ),
      },
    ],
    'equivolume-charts': [
      {
        title: 'Equivolume Charting',
        orderIndex: 1,
        contentJson: richDoc(
          heading('What are Equivolume Charts?'),
          para('Equivolume charts (developed by Richard W. Arms Jr.) replace the uniform-width price bars with rectangles whose width represents the volume traded in that period. Time becomes secondary to volume.'),
          heading('Reading Equivolume Charts'),
          bulletList([
            'Wide box: High volume for that price range — significant activity.',
            'Narrow box: Low volume — minor price movement on thin volume.',
            'Tall and wide box at a breakout: High-volume breakout, very significant.',
            'Short and wide box: High volume but small price range — absorption or churning.',
          ]),
          heading('Ease of Movement (EMV)'),
          para('Developed alongside equivolume charts, EMV measures the ease with which price moves based on volume. A large EMV value means price is moving significantly with relatively little volume.')
        ),
      },
    ],
    'open-interest-mechanics': [
      {
        title: 'Open Interest in Futures and Options',
        orderIndex: 1,
        contentJson: richDoc(
          heading('What is Open Interest?'),
          para('Open interest (OI) is the total number of outstanding (unsettled) futures or options contracts. Unlike volume (which resets daily), OI accumulates and reflects the total number of open positions in the market.'),
          heading('OI vs Volume'),
          bulletList([
            'Volume: Number of contracts traded in a session.',
            'Open Interest: Total number of contracts not yet closed/delivered.',
            'OI increases when a new buyer and new seller create a contract.',
            'OI decreases when both parties close existing positions.',
          ]),
          heading('Interpreting OI with Price'),
          bulletList([
            'Price up + OI up + volume up: Strong uptrend (new money entering).',
            'Price up + OI down: Short covering rally; weaker signal.',
            'Price down + OI up + volume up: Strong downtrend (new shorts entering).',
            'Price down + OI down: Longs liquidating; potential bottom near.',
          ]),
          heading('Commitment of Traders (COT)'),
          para('The COT report (published weekly by the CFTC) breaks down open interest by trader category: Commercials (hedgers), Large Speculators, and Small Speculators. Extreme positioning by commercials often signals market turning points.')
        ),
      },
    ],
  },

  'classical-chart-patterns': {
    'head-and-shoulders-patterns': [
      {
        title: 'Head and Shoulders Patterns',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Head and Shoulders Top'),
          para('One of the most reliable reversal patterns. Structure after an uptrend:'),
          bulletList([
            'Left Shoulder: Price rallies to a high, then pulls back.',
            'Head: Price rallies to a higher high, then pulls back to approximately the same level.',
            'Right Shoulder: Price rallies but fails to reach the head\'s high, then pulls back.',
            'Neckline: The line connecting the two pullback lows.',
          ]),
          heading('Breakout and Target'),
          para('The pattern completes when price closes below the neckline. The price target is calculated by measuring the vertical distance from the head to the neckline, then projecting that distance downward from the breakout point.'),
          heading('Inverse Head and Shoulders'),
          para('Same structure inverted — appears after a downtrend and signals a bullish reversal. Measured target is projected upward from the neckline breakout.'),
          heading('Volume Confirmation'),
          para('In a classic H&S top: volume should be highest on the left shoulder, decrease on the head rally, and be even lower on the right shoulder rally. Volume should surge on the neckline breakdown.')
        ),
      },
    ],
    'triangle-patterns': [
      {
        title: 'Triangle Chart Patterns',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Symmetrical Triangle'),
          para('Formed by converging trendlines: lower highs and higher lows. Neither bulls nor bears are winning. Usually a continuation pattern in the direction of the prior trend, but can reverse.'),
          heading('Ascending Triangle'),
          para('Upper trendline is flat (resistance); lower trendline slopes upward. Bulls are becoming increasingly aggressive. Bullish bias — breakout expected upward through resistance.'),
          heading('Descending Triangle'),
          para('Lower trendline is flat (support); upper trendline slopes downward. Bears are pressing price down. Bearish bias — breakdown expected through support.'),
          heading('Measuring Objectives'),
          para('For all triangles: measure the height of the pattern at its widest point (the left side). Project this distance from the breakout point in the direction of the break.'),
          heading('Volume in Triangles'),
          para('Volume typically contracts as the triangle develops and should expand significantly on the breakout. Low-volume breakouts are suspect and may lead to false breakouts.')
        ),
      },
    ],
    'double-tops-and-bottoms': [
      {
        title: 'Double Top and Double Bottom Patterns',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Double Top (M Formation)'),
          para('Two price peaks at approximately the same level, separated by a trough. Pattern is confirmed when price closes below the trough low (the neckline).'),
          bulletList([
            'Second top may be slightly lower than the first.',
            'Volume is often lower on the second peak than the first.',
            'Confirmation requires a decisive close below the trough.',
            'Target: Height of the pattern measured from neckline downward.',
          ]),
          heading('Double Bottom (W Formation)'),
          para('Two troughs at approximately the same level with a rally between them. Bullish reversal pattern confirmed by a close above the rally high.'),
          heading('Common Mistakes'),
          bulletList([
            'Calling a double top before neckline is broken.',
            'Ignoring volume confirmation.',
            'Confusing a normal pullback and re-test with a double top.',
          ]),
          heading('Adam and Eve Variation'),
          para('Adam top: sharp, narrow, V-shaped. Eve top: rounder, broader. Adam & Eve combination is considered more significant than two identical-shaped tops.')
        ),
      },
    ],
    'continuation-patterns': [
      {
        title: 'Continuation Chart Patterns',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Flags'),
          para('Short-term continuation patterns that slope against the prevailing trend. After a sharp move (the flagpole), price consolidates in a narrow channel before resuming.'),
          bulletList([
            'Bull flag: Upward flagpole, downward-sloping channel.',
            'Bear flag: Downward flagpole, upward-sloping channel.',
            'Target: Height of the flagpole added to the breakout point.',
          ]),
          heading('Pennants'),
          para('Similar to flags but the consolidation forms a small symmetrical triangle rather than a channel. Volume contracts during formation and expands on breakout.'),
          heading('Rectangles'),
          para('Price oscillates between parallel support and resistance. A horizontal congestion zone. Breakout in either direction with volume surge signals the next trend direction.'),
          heading('Rising and Falling Wedges'),
          bulletList([
            'Rising wedge in downtrend: Bearish continuation.',
            'Rising wedge in uptrend: Bearish reversal.',
            'Falling wedge in uptrend: Bullish continuation.',
            'Falling wedge in downtrend: Bullish reversal.',
          ])
        ),
      },
    ],
    'gaps-and-support-resistance': [
      {
        title: 'Gaps and Support/Resistance',
        orderIndex: 1,
        contentJson: richDoc(
          heading('Types of Gaps'),
          bulletList([
            'Common Gap: Occurs frequently, in congestion zones; quickly filled. Not significant.',
            'Breakaway Gap: Occurs at the start of a new trend, breaking out of a base or pattern. High volume. Rarely filled quickly.',
            'Runaway Gap (Measuring Gap): Occurs in the middle of a trend on continued high volume. Signals trend continuation. Used to estimate the midpoint of the move.',
            'Exhaustion Gap: Occurs near the end of a trend. High volume but price fails to follow through. Often filled within days.',
          ]),
          heading('Gap Fill Principle'),
          para('Technical analysts believe that most gaps eventually get "filled" — price returns to close the gap. This is more reliable for common and exhaustion gaps than for breakaway gaps.'),
          heading('Support and Resistance'),
          para('Support is a price level where buying interest is strong enough to prevent further decline. Resistance is where selling pressure prevents further advance.'),
          heading('Role Reversal'),
          para('Once a support level is broken decisively, it becomes resistance (and vice versa). This principle of role reversal is one of the most reliable concepts in technical analysis.'),
          heading('Significance of Support/Resistance'),
          bulletList([
            'The more times a level is tested, the more significant it becomes.',
            'High volume at a level increases its significance.',
            'The longer the level has been in place, the more powerful the role reversal when broken.',
          ])
        ),
      },
    ],
  },
};

// ─── QUESTIONS ─────────────────────────────────────────────────────────────────

function q(text, options, correctIndex, difficulty, explanation) {
  return {
    promptJson: doc(text),
    options: options.map((o, i) => ({ contentJson: doc(o), isCorrect: i === correctIndex, orderIndex: i + 1 })),
    difficulty: difficulty === 'Easy' ? 'EASY' : difficulty === 'Hard' ? 'HARD' : 'MEDIUM',
    explanationJson: doc(explanation),
  };
}

const QUESTIONS = {
  'an-overview-of-charting': {
    'chart-types-and-data': [
      q('What does the term "OHLC" stand for in charting?', ['Open, High, Low, Close', 'Open, Hold, Long, Cut', 'Order, High, Low, Close', 'Open, Hold, Liquidate, Close'], 0, 'Easy', 'OHLC is the standard data format for price charts, representing the Open, High, Low, and Close prices for a given period.'),
      q('Which type of chart uses only closing prices?', ['Bar chart', 'Candlestick chart', 'Line chart', 'Point & Figure chart'], 2, 'Easy', 'A line chart connects only the closing prices over time, making it the simplest chart type. It sacrifices intraday detail for clarity of the closing trend.'),
      q('What does a wide-range bar (or candle) indicate?', ['Low trading volume', 'Market indecision', 'High volatility during that period', 'An unchanged close'], 2, 'Easy', 'The range is the difference between the high and low. A wide range indicates high price volatility during that period, reflecting strong participation from buyers or sellers.'),
      q('In a bar chart, where is the opening price indicated?', ['Right tick mark', 'Left tick mark', 'Top of the vertical bar', 'Bottom of the vertical bar'], 1, 'Easy', 'In a standard OHLC bar chart, the open is marked by a horizontal tick on the left side of the bar, and the close is marked by a tick on the right side.'),
      q('A candlestick\'s "real body" represents:', ['The total range from high to low', 'The difference between open and close', 'The upper shadow only', 'The lower shadow only'], 1, 'Easy', 'The real body of a candlestick is the rectangular area between the opening and closing prices. If the close is higher, it is bullish (white/green); if lower, bearish (black/red).'),
      q('Which candlestick component shows the highest price of the period?', ['Lower shadow', 'Real body top', 'Upper shadow tip', 'Left tick'], 2, 'Easy', 'The tip of the upper shadow (wick) represents the highest price traded during the period. The tip of the lower shadow represents the lowest.'),
      q('Point & Figure charts differ from bar charts in that they:', ['Use volume as the x-axis', 'Do not use a time-based x-axis', 'Show only closing prices', 'Are only used for commodities'], 1, 'Medium', 'Point & Figure charts plot price movements (X columns for rises, O columns for falls) without regard to time. They filter out minor price movements based on a user-defined box size.'),
      q('A candlestick with a very small real body and long upper and lower shadows is called a:', ['Hammer', 'Shooting Star', 'Spinning Top', 'Marubozu'], 2, 'Easy', 'A spinning top has a small real body with long shadows on both sides. It signals indecision and balance between buyers and sellers during the period.'),
      q('A "Marubozu" candlestick has:', ['A very small real body', 'No shadows at all', 'Only a lower shadow', 'Only an upper shadow'], 1, 'Medium', 'A Marubozu (Japanese for "close-cropped") has no upper or lower shadows. The open equals the low (bullish marubozu) or high (bearish marubozu), showing complete control by one side.'),
      q('What is the primary purpose of using different time frames in charts?', ['To change the color of candlesticks', 'To filter noise and reveal trends at different scales', 'To increase the number of data points', 'To eliminate volume data'], 1, 'Easy', 'Different time frames serve different analytical purposes. Shorter frames show more detail; longer frames filter intraday noise and reveal longer-term trend structures.'),
      q('In Japanese candlestick analysis, a long white candle signifies:', ['Bearish sentiment with sellers in control', 'Neutral market conditions', 'Bullish sentiment with buyers in control all session', 'An exhaustion gap'], 2, 'Easy', 'A long white (or green) candle — where the close is significantly higher than the open — shows that buyers dominated the entire session. It is a bullish signal.'),
      q('Which data point is generally considered most important for technical analysis?', ['Open', 'High', 'Low', 'Close'], 3, 'Medium', 'The closing price is widely considered the most important because it represents the market\'s final consensus valuation for the period and is used in most technical indicators.'),
      q('What is the key difference between a bar chart and a candlestick chart?', ['Candlesticks only show closing prices', 'Candlesticks visually distinguish between bullish and bearish periods using colored bodies', 'Bar charts show volume, candlesticks do not', 'Bar charts are only for stocks'], 1, 'Easy', 'Both chart types show OHLC data, but candlesticks add a colored real body that immediately shows whether the period was bullish (white/green) or bearish (black/red), making patterns easier to see visually.'),
      q('A series of progressively higher highs and higher lows defines:', ['A downtrend', 'A trading range', 'An uptrend', 'Congestion'], 2, 'Easy', 'The basic definition of an uptrend is a series of higher highs (HH) and higher lows (HL). Conversely, a downtrend is lower highs (LH) and lower lows (LL).'),
      q('Which chart type was originally developed in Japan?', ['Bar chart', 'Line chart', 'Point & Figure chart', 'Candlestick chart'], 3, 'Easy', 'Candlestick charting originated in Japan, developed by rice trader Munehisa Homma in the 18th century, and was introduced to Western technical analysts by Steve Nison in the late 1980s.'),
    ],
    'bar-chart-construction': [
      q('In an OHLC bar chart, where is the closing price shown?', ['Left tick', 'Right tick', 'Top of the bar', 'Bottom of the bar'], 1, 'Easy', 'The closing price is indicated by a horizontal tick on the right side of the vertical bar. The opening price is on the left side.'),
      q('A down-close bar in an OHLC chart means:', ['The close is below the open', 'The close is below the prior close', 'The close equals the open', 'The high is lower than the prior high'], 0, 'Easy', 'A down-close bar (bearish bar) is defined as one where the closing price is below the opening price, showing that sellers dominated during the period.'),
      q('Volume bars in a chart are typically displayed:', ['Above the price chart', 'To the right of the price chart', 'Below the price chart', 'Overlaid on the price bars'], 2, 'Easy', 'Volume bars are conventionally displayed as a histogram below the price chart. This arrangement allows easy visual comparison of price action and volume simultaneously.'),
      q('Higher volume on down bars compared to up bars suggests:', ['Accumulation by smart money', 'Distribution and selling pressure', 'Low market interest', 'Trend continuation to the upside'], 1, 'Medium', 'When volume is consistently higher on declining price bars than on advancing bars, it indicates that sellers are more aggressive — a sign of distribution and potential downtrend continuation.'),
      q('What does a "doji" bar/candle indicate?', ['Strong bullish pressure', 'Strong bearish pressure', 'Indecision between buyers and sellers', 'High volume activity'], 2, 'Easy', 'A doji forms when the open and close are at or very near the same price. It indicates indecision — neither buyers nor sellers gained a decisive advantage during the period.'),
    ],
    'candlestick-chart-basics': [
      q('In Western candlestick convention, what color indicates a bearish candle?', ['Green or white', 'Red or black', 'Blue', 'Yellow'], 1, 'Easy', 'In the standard Western convention, a bearish candlestick (where close < open) is colored red or black. A bullish candle (close > open) is green or white.'),
      q('The upper shadow of a candlestick extends from:', ['Open to Close', 'Real body top to the High', 'Real body top to the Low', 'Low to the Open'], 1, 'Easy', 'The upper shadow (wick) extends from the top of the real body (either the open or close, whichever is higher) up to the period\'s highest price.'),
      q('A long lower shadow on a candle after a downtrend suggests:', ['Strong bearish continuation', 'Buyers stepped in and pushed prices back up from the lows', 'The market gapped down on the open', 'No significant trading occurred'], 1, 'Easy', 'A long lower shadow indicates that bears drove price lower during the session, but bulls bought aggressively, pushing price back up. After a downtrend, this can signal a bullish reversal.'),
      q('What is a "spinning top" candlestick?', ['A candle with a very long body and no shadows', 'A candle with a small body and long shadows on both sides', 'A candle with only an upper shadow', 'A gap up followed by a gap down'], 1, 'Easy', 'A spinning top has a small real body (reflecting little net change) with long shadows on both sides, indicating that prices moved significantly in both directions but neither bulls nor bears maintained control.'),
      q('Which doji type is considered most bearish when appearing at a market top?', ['Dragonfly doji', 'Long-legged doji', 'Gravestone doji', 'Four-price doji'], 2, 'Medium', 'The gravestone doji has the open/close at the low of the session with a long upper shadow. At a top, it shows bulls initially drove price higher but bears completely overwhelmed them, driving price back to the open — a bearish reversal signal.'),
    ],
  },

  'behavioral-finance': {
    'prospect-theory-and-loss-aversion': [
      q('Prospect theory was developed by:', ['William Sharpe and Harry Markowitz', 'Daniel Kahneman and Amos Tversky', 'Eugene Fama and Kenneth French', 'Benjamin Graham and David Dodd'], 1, 'Easy', 'Prospect theory was developed by psychologists Daniel Kahneman and Amos Tversky in 1979. It describes how people actually make decisions under uncertainty, and won Kahneman the Nobel Prize in Economics in 2002.'),
      q('According to loss aversion research, losses feel approximately how many times more painful than equivalent gains feel pleasurable?', ['1.5 times', '2 times', '3 times', '4 times'], 1, 'Easy', 'Research by Kahneman and Tversky found that losses feel roughly twice as painful as equivalent gains feel pleasurable. This asymmetry is the core of loss aversion theory.'),
      q('The disposition effect refers to the tendency of investors to:', ['Buy when markets are falling', 'Sell winners too early and hold losers too long', 'Follow the consensus opinion', 'Overweight recent events'], 1, 'Easy', 'The disposition effect (Shefrin & Statman, 1985) describes the systematic tendency to sell winning positions prematurely (to lock in gains) while holding losing positions too long (to avoid realizing losses).'),
      q('In prospect theory, the utility function is S-shaped, meaning:', ['Utility is linear in both gains and losses', 'Investors are risk-seeking for both gains and losses', 'Investors are risk-averse for gains and risk-seeking for losses', 'Investors always prefer certainty'], 2, 'Medium', 'The S-shaped utility curve means investors are risk-averse in the gain domain (preferring a certain gain to a gamble of equal expected value) but risk-seeking in the loss domain (preferring a gamble to a certain loss of equal expected value).'),
      q('Which of the following is a key implication of loss aversion for markets?', ['Markets are always efficient', 'Stocks that have fallen significantly will always recover', 'Investors are reluctant to sell losing stocks, which may suppress recovery', 'Loss aversion makes investors better at timing the market'], 2, 'Medium', 'Loss aversion causes investors to hold on to losing positions, as selling would mean acknowledging the loss. This can lead to prolonged suppression of recovery in individual stocks and create downward momentum.'),
      q('A reference point in prospect theory is:', ['The risk-free rate of return', 'The level against which gains and losses are measured', 'A benchmark index', 'The maximum loss a portfolio can sustain'], 1, 'Easy', 'In prospect theory, people evaluate outcomes relative to a reference point — typically the purchase price or current position value. Gains and losses are defined in relation to this reference point, not in absolute terms.'),
      q('The "endowment effect" is most directly related to which concept?', ['Herding', 'Loss aversion', 'Representativeness heuristic', 'Framing'], 1, 'Medium', 'The endowment effect — valuing something more once you own it — arises from loss aversion. Selling an owned item is framed as a loss (giving something up) which feels more painful than the equivalent gain would feel pleasurable.'),
      q('Overweighting small probabilities and underweighting moderate/high probabilities is described by which aspect of prospect theory?', ['The value function', 'The probability weighting function', 'The framing effect', 'Loss aversion coefficient'], 1, 'Hard', 'Prospect theory includes a probability weighting function in addition to the value function. People tend to overweight small probabilities (making them buy lottery tickets) and underweight moderate to high probabilities.'),
      q('Which market anomaly is directly predicted by the disposition effect?', ['Value premium', 'Momentum effect', 'Low volatility anomaly', 'Size premium'], 1, 'Hard', 'The disposition effect predicts momentum: investors sell winners too early (reducing upward price pressure) and hold losers too long (reducing downward pressure), creating persistent price momentum in both directions.'),
      q('Mental accounting is best described as:', ['Tracking every financial transaction', 'Treating money differently based on its source, purpose, or mental category', 'Following a strict budget', 'Calculating expected returns accurately'], 1, 'Easy', 'Mental accounting (Thaler, 1985) is the tendency to categorize money into separate "mental accounts" and apply different rules to each. For example, treating a tax refund differently from salary, or a gambling win differently from investment returns.'),
      q('An investor holds a losing stock and says "I can\'t sell now, I need to get back to breakeven first." This is an example of:', ['Herding', 'Confirmation bias', 'Loss aversion leading to breakeven effect', 'Overconfidence'], 2, 'Medium', 'This illustrates the "breakeven effect" from prospect theory — a special form of loss aversion where investors in the loss domain become risk-seeking, preferring to gamble on recovery rather than realize a certain loss.'),
      q('Which of the following would NOT be predicted by prospect theory?', ['Investors holding onto losing stocks', 'Risk-seeking behavior when already in a loss', 'Consistent maximization of expected utility', 'Overweighting small probabilities'], 2, 'Medium', 'Expected utility maximization is the prediction of classical (rational) utility theory. Prospect theory specifically contradicts this, showing that people systematically deviate from expected utility maximization through loss aversion and probability weighting.'),
    ],
    'belief-preservation-biases': [
      q('Conservatism bias causes investors to:', ['Overreact to new information', 'Underreact to new information because they overweight prior beliefs', 'Ignore historical data', 'Trade too frequently'], 1, 'Easy', 'Conservatism bias means investors are slow to update their beliefs in response to new evidence. They anchor to prior views and revise forecasts less than they should given new data.'),
      q('Confirmation bias in investing means an analyst is likely to:', ['Seek out data that contradicts their thesis', 'Give equal weight to bullish and bearish arguments', 'Preferentially seek information that supports their existing view', 'Avoid making any forecast'], 2, 'Easy', 'Confirmation bias is the tendency to search for, interpret, and recall information in a way that confirms one\'s preexisting beliefs or hypotheses. It leads analysts to build one-sided cases.'),
      q('Representativeness heuristic can lead investors to:', ['Ignore recent performance', 'Extrapolate recent trends too far into the future', 'Underweight anecdotal evidence', 'Focus only on fundamentals'], 1, 'Medium', 'Representativeness causes people to judge probabilities based on how much something resembles a prototype. In markets, this leads to extrapolating recent strong performance indefinitely — buying high-flying stocks expecting continued outperformance.'),
      q('Anchoring bias refers to:', ['The tendency to focus on fundamental analysis', 'Over-reliance on the first piece of information received', 'Following the trend in prices', 'Diversifying a portfolio properly'], 1, 'Easy', 'Anchoring is the cognitive bias of relying too heavily on an initial piece of information (the anchor) when making subsequent judgments. In markets, investors often anchor on purchase price, 52-week highs, or round numbers.'),
      q('An analyst who predicted a stock would hit $100 six months ago, but it has only reached $60, still projects a $100 target. This best illustrates:', ['Overconfidence', 'Herding', 'Conservatism bias', 'Availability heuristic'], 2, 'Medium', 'This illustrates conservatism bias — the analyst is slow to update the forecast despite evidence (the stock is not performing as expected). The prior $100 target is being overweighted relative to recent contrary evidence.'),
      q('Which bias explains why investors often buy "hot" mutual funds with recent strong performance?', ['Conservatism bias', 'Confirmation bias', 'Representativeness / extrapolation bias', 'Anchoring'], 2, 'Medium', 'Representativeness leads investors to treat recent strong performance as representative of future performance. They assume the pattern will continue, ignoring mean-reversion tendencies and base-rate return data.'),
      q('The "halo effect" in analyst research is most related to which bias?', ['Anchoring', 'Representativeness heuristic', 'Availability heuristic', 'Framing effect'], 1, 'Hard', 'The halo effect — judging an entire company positively because of one outstanding feature — relates to representativeness, where one characteristic is allowed to represent the whole. An impressive CEO might make the investment seem representative of success.'),
      q('Base-rate neglect occurs when investors:', ['Give too much weight to statistical averages', 'Underweight general statistical information in favor of specific case information', 'Only use fundamental data', 'Follow contrarian strategies'], 1, 'Hard', 'Base-rate neglect is a manifestation of the representativeness heuristic. Investors focus on specific story details about a company while ignoring the base-rate statistics (e.g., most IPOs underperform over 3 years).'),
    ],
    'information-processing-biases': [
      q('Framing effect demonstrates that investors\' decisions are affected by:', ['The actual expected value of outcomes', 'How choices are presented rather than the substance of the choices', 'The time horizon of the investment', 'The liquidity of the market'], 1, 'Easy', 'The framing effect shows that people respond differently to the same information depending on whether it is presented as a gain or a loss, a percentage or an absolute number. The substance is identical but the frame changes the decision.'),
      q('Mental accounting is violated by which of the following investment behaviors?', ['Treating all dollars as fungible', 'Diversifying across asset classes', 'Taking more risk with profits from a previous trade ("house money")', 'Rebalancing a portfolio regularly'], 2, 'Medium', 'Treating "house money" differently violates fungibility — a dollar is a dollar regardless of its source. The house money effect (Thaler & Johnson) is a classic example of mental accounting causing suboptimal risk decisions.'),
      q('Which bias is most likely to cause investors to overestimate the probability of a market crash immediately after experiencing one?', ['Anchoring', 'Availability heuristic', 'Conservatism', 'Representativeness'], 1, 'Easy', 'The availability heuristic means people judge probability by how easily examples come to mind. A recent crash makes crash scenarios highly available in memory, causing overestimation of their future probability.'),
      q('Overconfidence in investors most commonly manifests as:', ['Insufficient trading activity', 'Excessive trading and underdiversification', 'Risk aversion in all situations', 'Perfectly calibrated probability estimates'], 1, 'Easy', 'Research consistently shows that overconfident investors trade too much (reducing returns through transaction costs) and hold concentrated positions (underdiversification), believing their information is more accurate than others\'.'),
      q('The illusion of control is a form of which bias?', ['Loss aversion', 'Herding', 'Overconfidence', 'Anchoring'], 2, 'Medium', 'The illusion of control — believing one can influence random outcomes — is a manifestation of overconfidence. Traders who perform well during a bull market may believe their skill was the cause rather than recognizing the role of market conditions.'),
      q('An investor ignores a negative analyst report on a stock they own because they believe the analyst "doesn\'t understand the business." This most likely illustrates:', ['Framing effect', 'Mental accounting', 'Confirmation bias', 'Availability heuristic'], 2, 'Easy', 'Dismissing contrary evidence as invalid — rather than evaluating it objectively — is confirmation bias. The investor is protecting their existing positive view by discounting the contradictory information.'),
      q('Narrow framing in portfolio management leads investors to:', ['Evaluate each investment in isolation rather than in portfolio context', 'Diversify broadly across all asset classes', 'Make optimal risk-return decisions', 'Follow a systematic rebalancing strategy'], 0, 'Hard', 'Narrow framing (a form of mental accounting) means evaluating each investment on its own rather than considering how it interacts with the overall portfolio. This leads to suboptimal diversification and risk management.'),
      q('Which of the following biases is most exploitable by contrarian technical analysts?', ['Conservatism bias', 'Framing effect', 'Availability heuristic causing market overreaction to news', 'Anchoring to purchase price'], 2, 'Hard', 'When the availability heuristic causes investors to overreact to dramatic news (e.g., crashing prices making crashes too available in memory), it creates overshoot conditions that contrarian analysts can identify using sentiment indicators and oversold signals.'),
    ],
    'emotional-biases': [
      q('Herding behavior in financial markets refers to:', ['Large institutional investors dominating trading', 'Investors mimicking the actions of the crowd regardless of their own analysis', 'High-frequency trading strategies', 'Index fund investing'], 1, 'Easy', 'Herding is the tendency to follow the crowd. In financial markets, investors buy because others are buying and sell because others are selling. This amplifies trends, contributes to bubble formation, and causes panics.'),
      q('Regret aversion leads investors to:', ['Take more risk than they should', 'Avoid decisions that might lead to future regret, including following the crowd for cover', 'Improve their decision-making process', 'Seek out high-volatility investments'], 1, 'Medium', 'Regret aversion leads to two behaviors: following consensus (if the trade goes wrong, everyone else was wrong too) and refusing to sell losers (selling crystallizes regret). Both behaviors are suboptimal but psychologically protective.'),
      q('The endowment effect is the tendency to:', ['Donate to charitable causes', 'Value items more once they are owned than before they are owned', 'Invest only in companies one is familiar with', 'Undervalue future cash flows'], 1, 'Easy', 'The endowment effect (Thaler, 1980) describes the tendency to assign greater value to objects merely because one owns them. In investing, people demand higher prices to sell assets they hold compared to what they would pay to acquire the same assets.'),
      q('Self-attribution bias means investors tend to attribute:', ['All outcomes to luck', 'Gains to skill and losses to bad luck or external factors', 'Losses to skill and gains to luck', 'Both gains and losses to market conditions'], 1, 'Easy', 'Self-attribution bias is the tendency to take personal credit for successes (attributing to skill) while blaming failures on external factors. This compounds overconfidence over time as investors remember hits and dismiss misses.'),
      q('Hindsight bias leads investors to believe:', ['Future events are unpredictable', 'Events were predictable after they have occurred', 'They are consistently wrong in their predictions', 'Historical patterns never repeat'], 1, 'Easy', 'Hindsight bias (the "I knew it all along" effect) causes people to believe after the fact that an outcome was predictable. This distorts learning: investors don\'t properly account for the uncertainty that existed before the outcome.'),
      q('Which emotional bias most directly contributes to asset price bubbles?', ['Hindsight bias', 'Herding behavior', 'Regret aversion only', 'Endowment effect only'], 1, 'Easy', 'Herding is the primary driver of bubbles. When investors buy because others are buying (not based on fundamentals), prices rise far above intrinsic value. The same herding behavior in reverse creates crashes.'),
      q('An investor refuses to sell an inherited stock that has declined 40%, saying "my grandfather would have wanted me to hold." This illustrates:', ['Regret aversion', 'Herding', 'Endowment effect and loss aversion combined', 'Overconfidence'], 2, 'Medium', 'This is a combination of the endowment effect (the stock feels more valuable because it was inherited) and loss aversion (selling would realize a loss). This type of irrational attachment is a classic emotional bias.'),
      q('Which combination of biases can cause investors to buy at market peaks?', ['Loss aversion and hindsight bias', 'Herding, availability heuristic (recent gains), and overconfidence', 'Conservatism and anchoring', 'Regret aversion and endowment effect'], 1, 'Hard', 'Buying at peaks is driven by herding (following the crowd), availability (recent gains are vivid in memory making further gains seem likely), and overconfidence (believing one can identify the right time to enter and exit).'),
    ],
  },

  'bollinger-bands': {
    'bollinger-band-calculation': [
      q('What is the default middle band in Bollinger Bands?', ['10-period EMA', '20-period SMA', '50-period SMA', '14-period Wilder SMA'], 1, 'Easy', 'The default Bollinger Band middle band is a 20-period Simple Moving Average (SMA). John Bollinger specified this as the standard setting, though it can be adjusted for different analytical purposes.'),
      q('By default, Bollinger Bands use how many standard deviations for the upper and lower bands?', ['1', '1.5', '2', '2.5'], 2, 'Easy', 'The default multiplier is 2 standard deviations. This setting theoretically contains approximately 88-89% of price action within the bands under normal (non-trending) market conditions.'),
      q('Bollinger Bands are best described as:', ['Static support and resistance levels', 'Dynamic volatility bands that expand and contract with market volatility', 'Fixed percentage envelopes around a moving average', 'Volume-weighted price channels'], 1, 'Easy', 'Unlike fixed percentage envelopes, Bollinger Bands are dynamic. They use standard deviation to measure volatility, so the bands automatically widen in volatile markets and narrow in quiet markets.'),
      q('If you increase the period of the Bollinger Band SMA from 20 to 50 periods, the standard deviation multiplier should typically be:', ['Decreased to 1.5', 'Increased to 2.5', 'Kept the same at 2', 'Not changed; period has no effect on multiplier'], 1, 'Medium', 'John Bollinger\'s rule is that when the period is changed, the multiplier should be adjusted accordingly. Longer periods capture more of the price distribution, so a higher multiplier (like 2.5) is needed to maintain appropriate containment.'),
      q('What percentage of price data is typically contained within Bollinger Bands at the default settings?', ['68%', '75%', '89%', '95%'], 2, 'Medium', 'With the default 20-period SMA and ±2 SD, Bollinger Bands contain approximately 88-89% of price action. (Note: this differs from a normal distribution\'s 95.4% because price data is not normally distributed.)'),
      q('The standard deviation used in Bollinger Bands is calculated based on:', ['The last 200 periods only', 'The same N periods used for the SMA middle band', 'A fixed 30-period lookback', 'Weekly data only'], 1, 'Easy', 'The standard deviation is computed over the same lookback period as the SMA. For the default 20-period band, both the 20-period SMA and the 20-period standard deviation are calculated using the same 20 data points.'),
      q('Which of the following is the correct formula for the upper Bollinger Band?', ['SMA − (k × standard deviation)', 'SMA + (k × standard deviation)', 'SMA × (1 + k)', 'SMA ÷ standard deviation'], 1, 'Easy', 'The upper band = Middle Band (SMA) + k × Standard Deviation. The lower band = Middle Band − k × Standard Deviation. The default value of k is 2.'),
      q('Touching the upper Bollinger Band in a strong uptrend should be interpreted as:', ['A sell signal — price is overbought', 'A sign of strength confirming the uptrend', 'A gap up pattern', 'A volatility contraction signal'], 1, 'Medium', 'In a strong uptrend, price can "walk the upper band" — repeatedly touching or exceeding it. This is a sign of trend strength, NOT a sell signal. Bollinger himself emphasizes that touching the band alone is not sufficient to trigger a trade.'),
    ],
    'volatility-and-the-squeeze': [
      q('The Bollinger Band "squeeze" signals:', ['A confirmed breakout direction', 'Unusually low volatility that often precedes a significant price move', 'An overbought market condition', 'High current volatility'], 1, 'Easy', 'The squeeze occurs when the bands reach their narrowest point in 6 months (low BandWidth). This indicates that volatility has compressed to a multi-month extreme, which historically precedes a significant expansion in price movement.'),
      q('The BandWidth indicator is calculated as:', ['(Upper − Lower) / Close', '(Upper − Lower) / Middle × 100', 'Upper / Lower', '(Close − Lower) / (Upper − Lower)'], 1, 'Easy', 'BandWidth = (Upper Band − Lower Band) / Middle Band × 100. This normalizes the band width as a percentage of the middle band, making it comparable across different price levels and over time.'),
      q('When BandWidth is at its lowest level in six months, what trading approach is suggested?', ['Increase position size immediately', 'Wait for a breakout signal to identify direction, then trade the move', 'Sell all positions', 'Go long volatility derivatives'], 1, 'Medium', 'A 6-month BandWidth low (the squeeze) tells you WHEN to expect a move, not which direction. The correct approach is to prepare for a breakout by identifying which direction has more momentum and waiting for a confirmed break.'),
      q('The %B indicator value of 0.5 means price is:', ['At the upper band', 'At the lower band', 'Exactly at the middle band', 'Outside the bands'], 2, 'Easy', '%B = (Price − Lower Band) / (Upper Band − Lower Band). When %B = 0.5, price is exactly at the middle band (SMA). %B = 1.0 means price is at the upper band; %B = 0 means at the lower band.'),
      q('A "volatility cycle" in Bollinger Band analysis refers to:', ['Price moving in a fixed pattern', 'Alternation between periods of high and low volatility', 'Monthly options expiration effects', 'The SMA period chosen'], 1, 'Medium', 'Bollinger observed that volatility is cyclical — periods of high volatility are followed by periods of low volatility and vice versa. This is the theoretical foundation for the squeeze: low volatility states eventually give way to high volatility expansions.'),
      q('If %B rises above 1.0, it means:', ['Price has fallen below the lower band', 'Price has moved above the upper Bollinger Band', 'Price is at the moving average', 'Volume has increased significantly'], 1, 'Easy', '%B above 1.0 means price is above the upper band. %B below 0 means price is below the lower band. Both conditions indicate price has moved beyond the expected volatility envelope.'),
      q('During a squeeze, volume typically:', ['Spikes to multi-year highs', 'Contracts as participation decreases', 'Remains constant', 'Is not meaningful'], 1, 'Medium', 'During a squeeze (low volatility contraction), volume typically contracts alongside price volatility. The combined narrowing of bands and volume sets up the explosive breakout when pent-up energy is released.'),
    ],
    'trading-applications': [
      q('A "W-Bottom" Bollinger Band pattern forms when:', ['Price makes two consecutive highs above the upper band', 'First low touches/breaks lower band, rally exceeds middle band, second low stays above lower band', 'Price gaps below the lower band twice', 'BandWidth is at a 12-month high'], 1, 'Medium', 'The W-Bottom (bullish reversal) requires: (1) first low at or below lower band, (2) a rally that pushes %B above 0.6+, (3) a second low that stays above the lower band (%B > 0). This positive divergence signals accumulating buying pressure.'),
      q('An "M-Top" in Bollinger Band analysis is characterized by:', ['Two highs both above the upper band', 'First high at or above upper band, second high below upper band on %B basis', 'A squeeze followed by upside breakout', 'BandWidth expanding to 12-month highs'], 1, 'Medium', 'The M-Top (bearish reversal): (1) first high at or above upper band (%B ≥ 1.0), (2) a reaction downward, (3) second high that does NOT reach the upper band (%B < 1.0). This negative divergence warns of trend reversal.'),
      q('The most important rule Bollinger emphasizes about band touches is:', ['Buy when price touches lower band', 'Sell when price touches upper band', 'Band touches alone are not signals; require confirming indicators', 'Always trade breakouts from the bands'], 2, 'Easy', 'John Bollinger\'s cardinal rule: "A touch of the upper or lower band is just a tag — not a signal." Band touches must be confirmed by other indicators (momentum, volume, RSI, patterns) before trading decisions are made.'),
      q('Walking the upper band during an uptrend indicates:', ['The stock is severely overbought and should be sold', 'Strong buying pressure and trend continuation', 'A failed breakout', 'The bands are malfunctioning'], 1, 'Easy', '"Walking the band" (price repeatedly tagging the upper band in uptrend or lower band in downtrend) indicates strong, sustained directional momentum. It is a sign of trend health, not overbought conditions.'),
      q('Which additional indicator would BEST confirm a Bollinger Band squeeze breakout?', ['The stock\'s dividend yield', 'Volume expansion and momentum indicator alignment', 'P/E ratio', 'Short interest'], 1, 'Medium', 'A squeeze breakout is best confirmed by: (1) a significant increase in volume (showing genuine participation), and (2) momentum indicators like MACD or RSI moving strongly in the breakout direction.'),
    ],
  },

  'candlestick-patterns': {
    'single-candlestick-patterns': [
      q('The hammer candlestick pattern is MOST significant when it appears:', ['After a prolonged uptrend', 'After a prolonged downtrend', 'During a sideways market', 'At the beginning of a trading session'], 1, 'Easy', 'The hammer is a bullish reversal signal that requires context. Its significance depends on appearing after a downtrend where bears have been in control. It shows that despite selling pressure, buyers drove prices back up from the lows.'),
      q('What distinguishes a hammer from a hanging man?', ['The size of the real body', 'The color of the candle', 'The trend context in which they appear', 'The presence of an upper shadow'], 2, 'Easy', 'A hammer and a hanging man are identical in shape: small real body at the top, long lower shadow, little/no upper shadow. The difference is context: hammer appears after a downtrend (bullish); hanging man after an uptrend (bearish).'),
      q('A shooting star has which defining characteristic?', ['Long lower shadow, small body at bottom', 'Long upper shadow, small body at bottom of the range', 'No shadows at all', 'Large body with no shadows'], 1, 'Easy', 'The shooting star has a long upper shadow (minimum 2× the body) and a small real body at the LOWER end of the range. It appears after an uptrend. The long upper shadow shows that bulls initially drove price higher but bears pushed it back down near the open.'),
      q('For a candle to qualify as a hammer, the lower shadow must be at least:', ['Equal to the body length', 'Twice the length of the real body', 'Three times the daily range', '50% of the prior day\'s range'], 1, 'Medium', 'The traditional rule for a hammer is that the lower shadow must be at least twice (2×) the length of the real body. The upper shadow should be very small or nonexistent. The real body should be in the upper portion of the overall range.'),
      q('A gravestone doji is considered most bearish when:', ['It appears in the middle of a downtrend', 'It appears at a resistance level after an uptrend', 'Volume is declining', 'The real body is green'], 1, 'Medium', 'A gravestone doji (open = close at the session low, long upper shadow) is most bearish when it appears at a resistance level after an uptrend. Bulls tried to push higher but completely failed, with bears driving price all the way back to the open.'),
      q('Which of the following is NOT a type of doji?', ['Long-legged doji', 'Gravestone doji', 'Dragonfly doji', 'Morning doji'], 3, 'Easy', 'The four main doji types are: standard doji, long-legged doji, gravestone doji, and dragonfly doji. "Morning doji" is not a specific doji type — the morning star with a doji is called a "morning doji star" (a three-candle pattern).'),
      q('An inverted hammer requires which condition for confirmation?', ['A strong black candle the next day', 'A gap down followed by selling', 'Bullish follow-through the next session (higher open or strong close)', 'Volume higher than the inverted hammer session'], 2, 'Medium', 'Unlike the shooting star, the inverted hammer appears after a downtrend and is potentially bullish. However, because the upper shadow shows initial rejection, it requires bullish confirmation (higher open or close) the following session before acting on it.'),
      q('A "spinning top" candlestick indicates:', ['A strong directional move', 'Indecision; buyers and sellers are in balance', 'A gap in price', 'A trend acceleration signal'], 1, 'Easy', 'A spinning top has a small real body with long shadows on both sides. The price moved significantly in both directions but ended near where it started. This reflects indecision and a balance of power between buyers and sellers.'),
    ],
    'two-candle-reversal-patterns': [
      q('A bullish engulfing pattern requires the second candle to:', ['Have the same range as the first candle', 'Completely engulf the real body of the prior bearish candle with a larger bullish body', 'Open higher than the first candle\'s close', 'Close below the midpoint of the first candle'], 1, 'Easy', 'In a bullish engulfing pattern: the second (white/green) candle must open below the first candle\'s close AND close above the first candle\'s open. The entire real body of the first candle must be contained within the second candle\'s body.'),
      q('The piercing line pattern is a bullish signal when:', ['The white candle closes less than 50% into the prior black candle\'s body', 'The white candle closes more than 50% into the prior black candle\'s body', 'The second candle gaps higher and closes at a new high', 'Volume is lower on the second day'], 1, 'Medium', 'The piercing line requires the white candle to close more than 50% (halfway) up into the prior black candle\'s real body. If it closes less than 50%, it is a weaker pattern called "in-neck" or "on-neck" line.'),
      q('Dark cloud cover is bearish because:', ['It follows a downtrend', 'A black candle opens above the prior high but closes more than halfway into the prior white body', 'It has a gap down on the second candle', 'Volume is absent'], 1, 'Medium', 'Dark cloud cover appears after an uptrend. The second black candle opens above the prior white candle\'s high (gap up showing initial bullish sentiment) but closes deeply into the white body (more than 50%), showing strong bearish reversal.'),
      q('A harami pattern occurs when:', ['The second candle engulfs the first', 'The second candle\'s body is contained within the first candle\'s body', 'Two consecutive doji appear', 'The second candle gaps away from the first'], 1, 'Easy', 'Harami means "pregnant" in Japanese. In the pattern, a large candle (the "mother") is followed by a small candle whose real body is completely inside the prior candle\'s body. It signals a potential trend slowdown or reversal.'),
      q('A "bearish engulfing" pattern has highest reliability when:', ['Volume is lower on the second candle', 'It appears at a minor resistance after a 2-day uptrend', 'It appears after an extended uptrend at a key resistance with high volume', 'The first candle is a doji'], 2, 'Medium', 'Pattern reliability increases with: (1) the length and strength of the prior trend, (2) appearance at significant resistance levels, and (3) high volume on the engulfing candle confirming aggressive selling.'),
      q('Which two-candle pattern is the bearish counterpart of the bullish engulfing?', ['Dark cloud cover', 'Bearish engulfing', 'Bearish harami', 'Evening star'], 1, 'Easy', 'The bearish engulfing is the direct counterpart: a large black/red candle that completely engulfs the prior white/green candle\'s body, appearing after an uptrend. Dark cloud cover requires the close to be >50% into the prior body but does not need full engulfment.'),
    ],
    'three-candle-patterns': [
      q('The morning star pattern appears after:', ['An uptrend', 'A downtrend', 'A sideways consolidation', 'A gap down followed by recovery'], 1, 'Easy', 'The morning star is a three-candle bullish reversal pattern that must appear after a downtrend. Like the morning star in astronomy appearing before sunrise, it signals the end of darkness (selling) and the beginning of a new day (uptrend).'),
      q('In an evening star pattern, the second candle (the "star") should ideally:', ['Be a large bullish candle', 'Have a small real body that gaps above the first candle', 'Close below the first candle\'s open', 'Be a long-legged doji only'], 1, 'Medium', 'The star candle should gap away from the first candle (ideally a gap in candlestick Japanese methodology = window). It should have a small real body, indicating indecision at the top. The gap demonstrates that the prior uptrend has stalled.'),
      q('Three white soldiers is most reliable as a signal when:', ['Appearing after an extended downtrend on increasing volume', 'Each candle gaps away from the prior candle', 'The third candle has a very long upper shadow', 'Volume is declining across the three sessions'], 0, 'Hard', 'Three white soldiers (three long white/green candles, each closing near its high) is strongest after a downtrend, signaling sustained institutional buying. Volume should ideally increase across the three candles, confirming broad participation.'),
      q('A morning doji star differs from a morning star in that:', ['The first candle is a doji', 'The second candle is a doji', 'The third candle is a doji', 'All three candles are doji'], 1, 'Medium', 'In a morning doji star, the second candle (the star) is specifically a doji. This is considered a more powerful reversal signal than a regular morning star because the doji star shows absolute indecision at the bottom of the move.'),
      q('The evening star\'s third candle should:', ['Be a doji', 'Open within the star\'s body and close well into the first candle\'s body', 'Have no real body', 'Be a very long white candle'], 1, 'Easy', 'The third candle in an evening star is a long bearish (black/red) candle that opens within or below the star\'s body and closes well into the first (white) candle\'s body, confirming that bulls have lost control.'),
    ],
    'windows-and-gaps': [
      q('In Japanese candlestick analysis, a "window" is equivalent to Western:', ['A spinning top', 'A doji', 'A price gap', 'A hammer'], 2, 'Easy', 'In Japanese candlestick terminology, "window" (ku) is the Japanese term for a price gap — where the trading ranges of two consecutive sessions do not overlap. Rising window = gap up; falling window = gap down.'),
      q('A rising window (gap up) is expected to act as:', ['Resistance on rallies', 'Support on subsequent pullbacks', 'A sell signal', 'An exhaustion signal'], 1, 'Easy', 'Gaps become support/resistance levels after formation. A rising window (bullish gap) acts as a support zone — if price pulls back to the gap but does not fill it, this tests and confirms the support.'),
      q('A falling window (gap down) acts as:', ['Support on pullbacks', 'Resistance on subsequent bounces', 'A buy signal', 'A consolidation area'], 1, 'Easy', 'A falling window (bearish gap) acts as resistance. If price rallies back toward the gap level but cannot close it, this confirms that sellers are still in control at that price level.'),
      q('An "upside tasuki gap" is considered a bullish continuation signal because:', ['The black candle completely fills the gap between the two white candles', 'The black candle partially fills the gap but cannot close it, showing bulls absorb the selling', 'All three candles are white', 'Volume is at a 12-month high'], 1, 'Medium', 'In an upside tasuki gap, the third black candle\'s attempt to fill the gap fails — it cannot close the gap. This failure shows that buyers are absorbing the profit-taking and that the uptrend is likely to resume.'),
    ],
  },

  'charting-volume-and-open-interest': {
    'volume-analysis': [
      q('What does rising volume during a price advance indicate?', ['Weakening trend', 'Distribution by large institutions', 'Strong buying conviction and trend health', 'An overbought condition'], 2, 'Easy', 'Rising volume during a price advance confirms that buyers are increasingly active and willing to buy at higher prices. This is the classic confirmation of a healthy uptrend.'),
      q('When price is making new highs but volume is declining, this represents:', ['A bullish continuation signal', 'A neutral condition', 'A negative volume divergence warning of potential trend weakness', 'A signal to add to long positions'], 2, 'Medium', 'Declining volume as price makes new highs is a warning sign (negative divergence). The advance is losing fuel — fewer participants are willing to buy at the new higher prices, suggesting potential exhaustion.'),
      q('On-Balance Volume (OBV) adds volume on up-days and subtracts volume on down-days. OBV rising while price is flat indicates:', ['Neutral conditions', 'Accumulation — institutional buying on flat days', 'Distribution is occurring', 'Volume data is unreliable'], 1, 'Medium', 'When OBV rises while price is flat (or consolidating), it indicates accumulation. Institutions are buying quietly on flat-price days, building positions without revealing their intentions through price action. This is typically bullish.'),
      q('A volume spike at a market low after a significant decline most likely indicates:', ['Continued selling pressure', 'A "selling climax" or capitulation — potential reversal point', 'Normal trading activity', 'Institutional distribution'], 1, 'Medium', 'A high-volume price spike at a low after a sustained decline often represents a selling climax — the final exhaustion of sellers. After this capitulation, there are few sellers left to push prices lower, often marking a bottom.'),
      q('Volume is considered a "leading indicator" of price because:', ['Volume changes happen the day before price changes always', 'Volume confirms or questions price action, often showing institutional intent before it is fully reflected in price', 'Volume is always higher before a major price move', 'Price always follows volume direction'], 1, 'Medium', 'Volume is considered a leading indicator because institutional accumulation/distribution often shows up in volume patterns before the full price impact is visible. OBV divergences, for example, can precede price reversals by days or weeks.'),
      q('Tick volume in futures markets refers to:', ['Trading activity measured in dollar amounts', 'The number of price changes (up-ticks and down-ticks) in a period', 'The bid-ask spread', 'Open interest changes'], 1, 'Medium', 'Tick volume counts the number of individual price changes (ticks) during a period. In markets where actual volume data may be delayed or unavailable (e.g., forex), tick volume serves as a proxy for actual volume, measuring market activity level.'),
      q('When analyzing a breakout from a consolidation pattern, volume should:', ['Be at its lowest level during the breakout session', 'Be average, showing calm accumulation', 'Expand significantly, confirming genuine buying/selling interest', 'Be irrelevant to the signal quality'], 2, 'Easy', 'High volume on a breakout is critical for confirmation. A breakout on low volume is suspect — it may be a false breakout or lack follow-through. High volume demonstrates conviction and broad participation.'),
    ],
    'equivolume-charts': [
      q('In equivolume charts, what does the WIDTH of each box represent?', ['The trading time period', 'The volume traded during that price range', 'The standard deviation of prices', 'The open-close difference'], 1, 'Easy', 'The defining feature of equivolume charts (developed by Richard Arms) is that the width of each price bar is proportional to the volume traded during that period. A wide box means high volume; a narrow box means low volume.'),
      q('A "tall and wide" equivolume box during a breakout indicates:', ['Weak breakout on low volume', 'Strong breakout: significant price movement on high volume — highly significant', 'Normal trading conditions', 'A reversal pattern'], 1, 'Easy', 'Tall (large price range) + wide (high volume) = a powerful equivolume box. During a breakout, this combination confirms that the move is genuine — significant price change occurred with strong participation.'),
      q('A "wide and short" equivolume box means:', ['Small price range on low volume', 'Large price range on high volume', 'Significant volume with minimal price movement — potential churning/absorption', 'Indecision with low participation'], 2, 'Medium', 'A wide (high volume) but short (small price range) box indicates churning or absorption. Large volume is coming in but price is barely moving — this can signal accumulation (if at lows) or distribution (if at highs).'),
      q('Ease of Movement (EMV) indicator, associated with equivolume, measures:', ['Average daily price change only', 'The ease with which price is moving relative to volume', 'Open interest changes', 'Volatility relative to a moving average'], 1, 'Medium', 'EMV measures how easily prices are moving based on their volume. High EMV = price is moving a lot per unit of volume (ease of movement). Low EMV = price requires a lot of volume to move (heavy, labored movement).'),
    ],
    'open-interest-mechanics': [
      q('Open interest INCREASES when:', ['An existing long and existing short both close their positions', 'A new buyer and a new seller enter the market and create a new contract', 'An existing long sells to an existing short', 'The futures contract expires'], 1, 'Easy', 'Open interest (OI) increases only when a new buyer (long) and a new seller (short) both open new positions, creating a new contract. If both sides are closing positions, OI decreases. If one is new and one is existing, OI is unchanged.'),
      q('Rising price with rising open interest and rising volume indicates:', ['Short covering in a weak market', 'New money entering the market — trend is strong and healthy', 'Distribution by insiders', 'A weak rally near its end'], 1, 'Easy', 'The bullish confirmation: price up + OI up + volume up means new long positions are being established. New money is flowing in with conviction. This is the strongest possible confirmation of an uptrend.'),
      q('Falling open interest during a price rally most likely indicates:', ['New long positions being established', 'Short covering — bears are buying to cover positions; less sustainable than new longs', 'Accumulation by commercials', 'A long-term bullish trend beginning'], 1, 'Medium', 'When OI falls during a price rally, it means existing short positions are being covered (bought back). While this causes price to rise, it is less sustainable than rallies driven by new long positions. The rally may stall once short covering is exhausted.'),
      q('The Commitment of Traders (COT) report is published by:', ['The Securities and Exchange Commission (SEC)', 'The Commodity Futures Trading Commission (CFTC)', 'The Federal Reserve', 'CME Group'], 1, 'Easy', 'The CFTC (Commodity Futures Trading Commission) publishes the weekly COT report, which breaks down open interest in regulated futures markets by three trader categories: Commercials (hedgers), Large Speculators (funds), and Small Speculators.'),
      q('In COT analysis, "commercials" (hedgers) are considered:', ['Trend-following speculators', 'Smart money — producers and consumers who hedge; their extremes often mark market turns', 'Small retail traders', 'Index fund managers'], 1, 'Medium', 'Commercials are the producers, processors, and merchants who use futures to hedge their actual business exposure. Because they have fundamental knowledge of their industry, extreme commercial positioning (very long or very short) is a contrarian signal watched by analysts.'),
      q('Price declining with open interest rising and volume high suggests:', ['Weak downtrend with short covering', 'Strong downtrend — new short positions being established', 'A potential bottom forming', 'Low market interest'], 1, 'Easy', 'Price down + OI up + volume up = the bearish confirmation equivalent. New short positions are being established aggressively. New money is entering on the short side, confirming a healthy (from the bearish perspective) downtrend.'),
    ],
  },

  'classical-chart-patterns': {
    'head-and-shoulders-patterns': [
      q('In a Head and Shoulders top, the "neckline" is:', ['The line connecting the two peaks', 'The line connecting the two troughs between the shoulders and head', 'A horizontal line at the head level', 'The 200-day moving average'], 1, 'Easy', 'The neckline in a H&S top connects the two reaction lows — the trough between the left shoulder and head, and the trough between the head and right shoulder. The neckline may be flat or slightly sloped.'),
      q('The H&S price target is calculated by:', ['Subtracting the neckline width from the breakout price', 'Measuring from head to neckline, projecting downward from neckline breakout point', 'Taking 50% of the prior uptrend', 'Adding the right shoulder height to the neckline'], 1, 'Easy', 'H&S target = Neckline breakout price − (Head price − Neckline price at the head). The vertical distance from the head to the neckline is projected downward from the point where price breaks the neckline.'),
      q('In a classic H&S top, volume ideally follows which pattern?', ['Increases steadily from left shoulder to right shoulder', 'Highest on left shoulder rally, declining on head rally, very low on right shoulder rally', 'Lowest on left shoulder, highest on right shoulder', 'Volume is irrelevant in H&S analysis'], 1, 'Medium', 'Classic H&S volume pattern: highest volume on the left shoulder rally (initial enthusiasm), moderately lower on the head rally (strength waning), and lowest on the right shoulder rally (bearish divergence). Volume should surge on the neckline breakdown.'),
      q('An inverse (reverse) H&S pattern signals:', ['Bearish reversal after an uptrend', 'Bullish reversal after a downtrend', 'Continuation of the current trend', 'A neutral consolidation'], 1, 'Easy', 'The inverse H&S (or H&S bottom) is the mirror image appearing after a downtrend. When price breaks above the neckline, it signals a bullish reversal. The price target is projected upward using the same measuring method.'),
      q('A right shoulder that forms at a lower high than the left shoulder indicates:', ['Stronger bullish potential', 'Greater bearish potential — bulls are becoming progressively weaker', 'The pattern is invalid', 'The neckline must slope upward'], 1, 'Hard', 'When the right shoulder peaks lower than the left shoulder, it shows that buying interest on each successive rally is diminishing. This is actually a more bearish variant, as bulls are failing to push as high before bears regain control.'),
      q('A "complex head and shoulders" pattern has:', ['One left and one right shoulder', 'Multiple left and/or right shoulders', 'No visible neckline', 'Only a head with no shoulders'], 1, 'Hard', 'Complex H&S patterns have two or more left shoulders, two or more right shoulders, or both. Despite the added complexity, the same measuring rule applies. Complex H&S are less common but when confirmed can be powerful.'),
    ],
    'triangle-patterns': [
      q('An ascending triangle is characterized by:', ['Lower highs and lower lows', 'A flat upper boundary and rising lower boundary', 'A flat lower boundary and falling upper boundary', 'Both boundaries sloping in the same direction'], 1, 'Easy', 'An ascending triangle has a horizontal resistance line at the top (where sellers appear at the same level repeatedly) and a rising trendline at the bottom (where buyers are entering at progressively higher lows). This shows increasing bull control.'),
      q('A descending triangle typically resolves:', ['To the upside', 'To the downside', 'In a neutral direction', 'Only after a volume spike'], 1, 'Easy', 'A descending triangle — falling upper trendline + flat support line — has a bearish bias. Each successive high is lower (bears are more aggressive), while bulls defend the same level. Eventually support breaks and price declines.'),
      q('The measuring objective for a symmetrical triangle is:', ['The width of the base measured from the breakout', 'The height of the triangle at its tallest point projected from the breakout', 'Half the prior trend\'s move added to breakout price', 'The first parallel level above the apex'], 1, 'Medium', 'Measure the maximum height of the triangle (left side, at widest point) and project this vertical distance from the breakout point in the direction of the break. This gives the minimum expected price target.'),
      q('Triangles are typically classified as:', ['Primarily reversal patterns', 'Primarily continuation patterns that can occasionally reverse', 'Always reversal patterns after a specific trend', 'Non-directional patterns with no trading application'], 1, 'Medium', 'Triangles are primarily continuation patterns — they represent a pause/consolidation within a trend before it resumes. However, they can occasionally reverse, particularly if a symmetrical triangle breaks in the opposite direction of the prior trend.'),
      q('Volume behavior within a triangle typically:', ['Expands as the triangle develops', 'Contracts as the triangle develops, then expands sharply on breakout', 'Stays constant throughout', 'Is highest at the apex'], 1, 'Easy', 'As a triangle compresses price action, volume typically contracts — reflecting the indecision and declining urgency. A genuine breakout is confirmed by a significant expansion in volume as participants commit to the new direction.'),
      q('A breakout from a triangle on very low volume suggests:', ['The breakout is highly reliable', 'The breakout may be false; confirm with follow-through', 'Volume is irrelevant for triangles', 'Immediate target achieved'], 1, 'Medium', 'Low-volume breakouts from triangles are suspicious. Without volume confirmation, the breakout may be a "false breakout" — price breaks out briefly but snaps back inside the triangle. Always look for follow-through in price and volume.'),
    ],
    'double-tops-and-bottoms': [
      q('A double top pattern is confirmed when:', ['Price makes a second peak', 'Price closes below the trough between the two peaks (neckline)', 'The second peak is higher than the first', 'Volume is lower on the second peak'], 1, 'Easy', 'The double top is NOT confirmed merely by forming two peaks. Confirmation requires a decisive close below the trough (valley) between the two peaks — the neckline. Until then, the second top could be part of a consolidation before higher prices.'),
      q('The measuring target for a double top is:', ['Height of the pattern added above the second peak', 'Height of the pattern subtracted below the neckline breakout', 'Width of the pattern projected horizontally', '50% of the prior trend'], 1, 'Easy', 'Double top target = Neckline level − (Peak price − Neckline price). The vertical distance from the peaks to the neckline is projected downward from the neckline breakdown point.'),
      q('Volume in a double top typically shows:', ['Higher volume on the second peak than the first', 'Equal volume on both peaks', 'Lower volume on the second peak, with high volume on neckline breakdown', 'Volume increasing throughout the pattern'], 2, 'Medium', 'Classic double top volume: high volume on the first peak (still bullish enthusiasm), declining volume on the second peak (diminishing buying interest — a divergence), and high volume on the neckline breakdown (confirming the bearish reversal).'),
      q('An "Adam and Eve double top" has which characteristic?', ['Both tops are sharp V-shaped', 'First top is sharp/V-shaped (Adam) and second is rounded/broad (Eve)', 'Both tops are rounded', 'First top is rounded and second is sharp'], 1, 'Hard', 'Adam tops are sharp and narrow (V-shaped); Eve tops are rounder and broader. An Adam & Eve combination (or Eve & Adam) is considered a higher-quality pattern than two similar-shaped tops, as the shape change reflects a fundamental shift in market dynamics.'),
      q('A double bottom is confirmed when:', ['Two troughs appear at approximately the same level', 'Price closes above the peak between the two troughs', 'The second trough is lower than the first', 'Volume is very high on the second trough'], 1, 'Easy', 'Like the double top, the double bottom must be confirmed by a close above the interim peak (the neckline equivalent between the two troughs). The pattern is not confirmed simply by the second trough forming.'),
      q('The time between the two peaks/troughs in a double top/bottom is significant because:', ['It must always be exactly 4 weeks', 'Longer time between tops/bottoms generally increases pattern reliability', 'Shorter time always produces larger moves', 'Time is irrelevant to the pattern'], 1, 'Medium', 'A longer time between the two tops/bottoms generally increases the significance of the pattern. A longer interval means the two tests of that level are more independent, making the reversal more meaningful and the subsequent move potentially larger.'),
    ],
    'continuation-patterns': [
      q('Flags are distinguished from pennants by:', ['Flag is a reversal pattern; pennant is continuation', 'Flag has parallel boundaries; pennant has converging boundaries', 'Flag has higher volume; pennant has lower volume', 'Flag is longer in duration; pennant is shorter'], 1, 'Easy', 'Both are short-term continuation patterns, but flags have parallel trendlines (sloping against the trend), while pennants have converging trendlines forming a small symmetrical triangle. Both require a strong "flagpole" move preceding them.'),
      q('The price target for a flag pattern is typically:', ['The height of the flag channel', 'The length of the flagpole added to the breakout point', '50% of the prior trend', 'The width of the flag projected forward'], 1, 'Easy', 'Flag target = Breakout point + length of the flagpole (the sharp move preceding the flag). The theory is that the flag represents a midpoint pause and the pattern "flies at half-mast," so the move after the flag should approximately equal the flagpole.'),
      q('A rectangle pattern in an uptrend is considered:', ['A reversal pattern', 'A bearish signal always', 'A continuation pattern with breakout in trend direction expected', 'A neutral pattern with no directional bias'], 2, 'Easy', 'A rectangle (price oscillating between parallel horizontal support and resistance) in an uptrend is typically a continuation pattern — a consolidation before the uptrend resumes. The breakout direction should be upward to confirm continuation.'),
      q('A rising wedge in an UPTREND is typically interpreted as:', ['Bullish continuation', 'Bearish reversal signal', 'Neutral consolidation', 'Highly bullish breakout setup'], 1, 'Medium', 'A rising wedge in an uptrend is a bearish reversal pattern. Both trendlines rise but converge (upper line rises more slowly). Price is making higher highs and higher lows, but momentum is fading — this typically leads to a reversal downward.'),
      q('Which continuation pattern typically shows the steepest flagpole?', ['Rectangle', 'Pennant', 'Flag', 'Rising wedge'], 2, 'Medium', 'Flags by definition require a near-vertical flagpole — a sharp, rapid price move on high volume. Pennants also require a strong pole but are more commonly associated with slightly less extreme moves. Rectangles and wedges do not have a flagpole requirement.'),
    ],
    'gaps-and-support-resistance': [
      q('Which type of gap typically occurs in the middle of a strong trend and is rarely filled quickly?', ['Common gap', 'Exhaustion gap', 'Runaway (measuring) gap', 'Breakaway gap'], 2, 'Easy', 'The runaway gap (also called measuring gap) occurs in the middle of a strongly trending move, on continued high volume. It signals trend continuation and its name comes from its use as a measuring tool to estimate the midpoint of the move.'),
      q('A breakaway gap is significant because:', ['It always gets filled immediately', 'It marks the start of a new trend with high volume, breaking price out of a base', 'It occurs at the end of a trend on exhaustion', 'It is the least significant type of gap'], 1, 'Easy', 'A breakaway gap occurs on high volume at the start of a new trend, breaking price out of a consolidation pattern. It is significant because it represents a decisive imbalance of supply/demand and is often resistant to filling in the near term.'),
      q('An exhaustion gap at the end of a strong trend is typically characterized by:', ['Low volume and a small price gap', 'High volume but failure to follow through; often filled within days', 'Price gapping against the trend direction', 'The same volume as prior gaps in the trend'], 1, 'Medium', 'An exhaustion gap looks like a runaway gap at first — the gap is in the trend direction on high volume — but price quickly fails to maintain the new level and reverses to fill the gap. The key diagnostic is whether follow-through occurs.'),
      q('The principle of "role reversal" in support/resistance means:', ['Support and resistance switch locations randomly', 'Once a support level is broken decisively, it becomes resistance and vice versa', 'Support is always stronger than resistance', 'The roles of buyers and sellers are always reversed'], 1, 'Easy', 'Role reversal is a foundational concept: when a support level is broken, previous buyers become motivated sellers (trying to get out at breakeven), turning that level into resistance. Conversely, broken resistance becomes support.'),
      q('A support level is considered more significant when:', ['It has been tested and held multiple times on high volume', 'It was formed only once on low volume', 'It is far from the current price', 'It coincides with a market low from decades ago only'], 0, 'Easy', 'The significance of a support level increases with: (1) the number of times it has been tested, (2) the volume at those tests, (3) the recency of the test, and (4) the length of time the level has been respected.'),
      q('Common gaps are generally considered:', ['Highly significant continuation signals', 'Highly significant reversal signals', 'Insignificant noise, typically filled quickly', 'The most reliable gap type'], 2, 'Easy', 'Common gaps occur in the middle of congestion zones, often on routine days with average volume. They have no significant trend implications and are typically filled quickly (within a few sessions). Technical analysts generally ignore them.'),
      q('If a stock breaks below a 6-month support level on three times average volume, the principle of role reversal suggests:', ['The support level remains significant support', 'The 6-month support level will now act as resistance on any bounce', 'The stock will immediately recover', 'Volume is irrelevant to role reversal'], 1, 'Medium', 'A decisive break (here confirmed by 3× average volume) below support activates role reversal. Previous buyers who entered near support are now trapped in losing positions and will likely sell on any bounce to that level — converting support to resistance.'),
    ],
  },
};

// ─── SEED FUNCTION ─────────────────────────────────────────────────────────────

async function main() {
  console.log('Starting CMT PDF seed...\n');

  // Upsert chapters
  const chapterMap = {};
  for (const ch of CHAPTERS) {
    const chapter = await prisma.chapter.upsert({
      where: { level_slug: { level: 'LEVEL_1', slug: ch.slug } },
      update: { title: ch.title, description: ch.description },
      create: {
        title: ch.title,
        slug: ch.slug,
        level: 'LEVEL_1',
        description: ch.description,
        orderIndex: ch.orderIndex,
        isPublished: true,
        isDeleted: false,
      },
    });
    chapterMap[ch.slug] = chapter;
    console.log(`Chapter: ${chapter.title} (id: ${chapter.id})`);
  }

  // Upsert subtopics
  const subtopicMap = {};
  for (const [chapterSlug, subtopics] of Object.entries(SUBTOPICS)) {
    const chapter = chapterMap[chapterSlug];
    for (const st of subtopics) {
      const subtopic = await prisma.subtopic.upsert({
        where: { chapterId_slug: { chapterId: chapter.id, slug: st.slug } },
        update: { title: st.title, description: st.description },
        create: {
          chapterId: chapter.id,
          title: st.title,
          slug: st.slug,
          description: st.description,
          orderIndex: st.orderIndex,
          isPublished: true,
          isDeleted: false,
        },
      });
      subtopicMap[`${chapterSlug}__${st.slug}`] = subtopic;
      console.log(`  Subtopic: ${subtopic.title}`);
    }
  }

  // Seed notes
  let noteCount = 0;
  for (const [chapterSlug, subtopicsNotes] of Object.entries(NOTES)) {
    const chapter = chapterMap[chapterSlug];
    for (const [subtopicSlug, notes] of Object.entries(subtopicsNotes)) {
      const subtopic = subtopicMap[`${chapterSlug}__${subtopicSlug}`];
      if (!subtopic) { console.warn(`  WARN: No subtopic for ${chapterSlug}/${subtopicSlug}`); continue; }
      for (const note of notes) {
        await prisma.note.create({
          data: {
            subtopicId: subtopic.id,
            title: note.title,
            contentJson: note.contentJson,
            contentHtml: '',
            orderIndex: note.orderIndex,
            isPublished: true,
          },
        });
        noteCount++;
      }
    }
  }
  console.log(`\nNotes created: ${noteCount}`);

  // Seed questions
  let questionCount = 0;
  for (const [chapterSlug, subtopicsQs] of Object.entries(QUESTIONS)) {
    const chapter = chapterMap[chapterSlug];
    for (const [subtopicSlug, questions] of Object.entries(subtopicsQs)) {
      const subtopic = subtopicMap[`${chapterSlug}__${subtopicSlug}`];
      if (!subtopic) { console.warn(`  WARN: No subtopic for ${chapterSlug}/${subtopicSlug}`); continue; }
      for (const qdata of questions) {
        const question = await prisma.question.create({
          data: {
            level: 'LEVEL_1',
            chapterId: chapter.id,
            subtopicId: subtopic.id,
            promptJson: qdata.promptJson,
            explanationJson: qdata.explanationJson,
            questionType: 'SINGLE_CHOICE',
            difficulty: qdata.difficulty,
            isPublished: true,
          },
        });
        for (const opt of qdata.options) {
          await prisma.questionOption.create({
            data: {
              questionId: question.id,
              contentJson: opt.contentJson,
              isCorrect: opt.isCorrect,
              orderIndex: opt.orderIndex,
            },
          });
        }
        questionCount++;
      }
    }
  }
  console.log(`Questions created: ${questionCount}`);
  console.log('\nDone!');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
