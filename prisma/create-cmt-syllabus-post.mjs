// Creates the "CMT Syllabus 2026" blog post as a DRAFT.
// Source: official 2026 CMT Program Guide (CMT Association, v2026.03.20).
// Run: node prisma/create-cmt-syllabus-post.mjs
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const SLUG = 'cmt-syllabus-2026';
const TITLE = 'CMT Syllabus 2026: Level 1, 2 & 3 — Official Topics & Exam Format';
const EXCERPT =
  'The complete CMT syllabus for 2026, taken from the official CMT Program Guide: exam format, knowledge-domain weightings and every section and chapter for Level 1, Level 2 and Level 3.';

const table = 'width:100%;border-collapse:collapse;margin:16px 0;font-size:15px;';
const th = 'text-align:left;padding:10px 12px;border-bottom:2px solid #d1d5db;background:#f9fafb;';
const td = 'padding:10px 12px;border-bottom:1px solid #e5e7eb;vertical-align:top;';
const note = 'margin:24px 0;padding:16px 20px;border-left:4px solid #10b981;background:#f0fdf4;border-radius:8px;';

const row = (cells, head = false) =>
  `<tr>${cells.map((c) => (head ? `<th style="${th}">${c}</th>` : `<td style="${td}">${c}</td>`)).join('')}</tr>`;
const tbl = (head, rows) =>
  `<div style="overflow-x:auto;"><table style="${table}"><thead>${row(head, true)}</thead><tbody>${rows.map((r) => row(r)).join('')}</tbody></table></div>`;

// [section, [[chapter, what it covers], ...]]
const L1 = [
  ['1. Theory and History of Technical Analysis', [
    ['A Brief History of Technical Analysis', 'The people behind Dow Theory, the first Dow Jones averages and the earliest charted markets in Europe and Asia.'],
    ['The Dow Theory', 'The two averages Dow used, confirmation, the three primary movements and the most important price of the day.'],
    ['Markets, Instruments, Data and the Technical Analyst', 'Asset classes and instruments suited to technical analysis, and data-handling issues.'],
    ['The Opportunity of the Efficient Markets Hypothesis', 'The three forms of EMH, the joint-hypothesis problem, anomalies, random walk vs martingale.'],
    ['The Fibonacci Sequence and the Golden Ratio', 'Building the sequence, the golden ratio to three decimals, retracements and extensions.'],
  ]],
  ['2. Charts: Market Price Data', [
    ['An Overview of Charting', 'The four price points; line, bar and candlestick construction; the meaning of range.'],
    ['The X Axis', 'Fractals, data intervals, volume as an alternative x-axis, point-and-figure box size and reversal, range bars.'],
    ['The Y Axis', 'Arithmetic vs logarithmic scaling and how it changes trendlines, price objectives and risk/reward.'],
    ['Charting Volume and Open Interest', 'How volume and futures open interest are displayed on a chart.'],
  ]],
  ['3. Trend Analysis', [
    ['Trend Primer: What is a Trend', 'Three primary movements, fractal price and the principle of polarity.'],
    ['Trend Primer: A Trend\'s Four Phases', 'Wyckoff\'s four market phases, the four primary trades, throwbacks vs pullbacks.'],
    ['Trend Primer: Trend Identification and Following', 'Confirming breakouts, one- and two-moving-average trend methods, reward-to-risk and risk management.'],
    ['Introduction to Volume Analysis', 'How volume shows liquidity and participation and adds perspective to price.'],
    ['Volume, Open Interest, and Price', 'Price–volume trends, VWAP and what changes in open interest imply.'],
    ['Market Internals', 'Breadth, leadership and volume as measures of market health.'],
  ]],
  ['4. Chart Pattern Analysis', [
    ['Classical Chart Patterns', 'Reversal and continuation patterns with their volume, flags and pennants, and the types of gaps.'],
    ['Introduction to Candlesticks', 'From 18th-century Japan to today; candle anatomy, colouring and what candles say about sentiment.'],
    ['Introduction to Candlestick Patterns', 'Recognising and interpreting the core candlestick patterns.'],
    ['Basics of Point-and-Figure Charting', 'Plotting Xs and Os, box and reversal size, basic patterns and P&amp;F trendlines.'],
  ]],
  ['5. Technical Indicators', [
    ['Moving Averages', 'Simple, linearly weighted, Wilder and exponential averages; moving-average strategies and bands.'],
    ['Technical Indicator Construction', 'Momentum and volume indicators, price-volume indicators and the three lines of the DMI.'],
    ['Introduction to Bollinger Bands', 'How the bands are calculated, Bollinger\'s insight into volatility and the basic application.'],
  ]],
  ['6. Statistics for Technicians', [
    ['Introduction to Statistics Part 1', 'Mean, median, mode, geometric mean, standard deviation, variance and z-scores.'],
    ['Introduction to Statistics Part 2', 'Outliers, scatterplots, Pearson\'s r, correlation vs causation and linear regression.'],
    ['Introduction to Probability', 'Law of large numbers, the normal distribution, the Empirical Rule, skew and kurtosis.'],
  ]],
  ['7. Behavioral Finance', [
    ['Behavioral Finance', 'Prospect theory, loss aversion, and belief-perseverance, information-processing and emotional biases.'],
  ]],
  ['8. Sentiment', [
    ['Market Sentiment and Technical Analysis', 'The role of the crowd at trends and turning points.'],
    ['Sentiment Measured from Market Data', 'VIX, futures and options open interest, Commitments of Traders, insider activity, short interest.'],
    ['Sentiment Measured from External Data', 'News and advisories, contrary opinion and fund cash levels.'],
  ]],
  ['9. Cycle Analysis', [
    ['Foundations of Cycle Theory', 'Hurst\'s seven Principles of Commonality, harmonics, composite waves, translation and dominant cycles.'],
    ['Common Cycles', 'Notable economic cycles and their periods.'],
  ]],
  ['10. Comparative Market Analysis', [
    ['Equities', 'Market data, corporate actions and ways to segment the market.'],
    ['Indexes', 'Index weighting methods and survivorship bias.'],
    ['Fixed Income/Bonds', 'Price vs yield, debt terms, credit spreads and the yield curve.'],
    ['Futures', 'Contract terms, open interest and challenges with futures data.'],
    ['Exchange-Traded Products (ETPs)', 'ETFs vs ETNs, leveraged ETPs and their effect on breadth.'],
    ['Foreign Exchange (Currencies)', 'Base and quote currencies, majors vs crosses and the dealer market.'],
    ['Digital Assets', 'Blockchains, on-chain data and technical analysis of crypto assets.'],
    ['Options', 'Option terms, the Greeks and implied volatility.'],
    ['Introduction to Relative Strength', 'Absolute vs relative trend and methods of measuring and ranking relative strength.'],
    ['Relative Strength and its Uses', 'Top-down selection, the "beach ball effect" and relative strength as a leading indicator.'],
  ]],
  ['11. Volatility Analysis', [
    ['The Meaning of Volatility to a Technician', 'Historical vs implied volatility and volatility skew.'],
    ['Measuring Historical Volatility', 'Wilder\'s True Range, Bollinger Bands and Keltner Channels.'],
    ['Options Derived Volatility', 'Implied volatility, what VIX measures and why VIX spikes are tricky for spotting bottoms.'],
  ]],
  ['12. Systems and Quantitative Methods', [
    ['Introduction to Quantitative Methods', 'The scientific method, trigger/filter/value rules, survivorship bias and signal tests vs backtests.'],
  ]],
];

const L2 = [
  ['1. Theory and History of Technical Analysis', [
    ['Alpha and Beta – Outperforming the Benchmarks', 'Alpha vs beta and the EMH, AMH and FMH.'],
    ['Fusion Analysis: Technical Analysis as Part of a Team Approach', 'How technicians and fundamental analysts work together.'],
  ]],
  ['2. Behavioral Finance', [['Anatomy of Market Bubbles', 'The five stages of a bubble and the charts used to assess them.']]],
  ['3. Charts: Organizing Market Data', [
    ['Charting Multiple Data Sets and Multiple Data Intervals', 'Using several timeframes to identify trends.'],
    ['Market Profile', 'The basic principles of Market Profile.'],
    ['Y-axis Effects of Scaling on Chart Analysis', 'How arithmetic vs log scaling changes trend slope, price projections and ratio charts.'],
  ]],
  ['4. Chart Pattern Analysis', [
    ['Classical Chart Patterns', 'Calculating pattern price targets; confirming breakouts with the 3% rule and the ATR multiple rule.'],
    ['Candlestick Patterns in the Real World', 'Patterns, their psychology and volume, and types of doji.'],
    ['Candlestick Analysis in the Real World', 'Confirmed vs unconfirmed patterns, support/resistance context, abandoned baby vs island reversal.'],
    ['Point-and-Figure Pattern Analysis', 'Complex P&amp;F formations, vertical and horizontal counts, relative strength P&amp;F.'],
  ]],
  ['5. Trend Analysis', [
    ['Price Trend and Volume', 'The four phases of price-volume trends.'],
    ['Market Internals', 'Advance-decline line, up/down volume, breadth and leadership indicators.'],
  ]],
  ['6. Volatility Analysis', [
    ['Extrapolating Price from Volatility', 'Calculating expected price ranges from VIX and its limits.'],
    ['Volatility Risk Premium', 'Implied vs realized volatility and capturing the VRP with options.'],
    ['Volatility Indexes and VIX Complex', 'Contango vs backwardation and using VIX futures for risk management.'],
  ]],
  ['7. Sentiment', [
    ['Analyzing Sentiment in the Stock Market', 'Insider buying vs selling, short interest ratio and surveys.'],
    ['Analyzing Sentiment in the Derivatives Market', 'Futures open interest, the COT report and put/call ratios.'],
  ]],
  ['8. Statistics for Technicians', [['Inferential Statistics', 'Hypothesis testing, its steps and Type I/II errors.']]],
  ['9. Technical Indicators', [
    ['Momentum and Indicator Interpretation Part 1', 'Overbought/oversold in different regimes and momentum divergences.'],
    ['Momentum and Indicator Interpretation Part 2', 'Momentum vs price reversals and the three steps of a valid technical signal.'],
    ['Volume Weighted Average Price', 'How VWAP is calculated and used to judge execution and control.'],
    ['Practical Applications of Bollinger Bands', '%b, BandWidth, Squeezes, Bulges and two-bar reversals.'],
  ]],
  ['10. Comparative Market Analysis', [
    ['Advanced Applications of Relative Strength', 'JdK RS-Ratio, RS-Momentum and Relative Rotation Graphs (RRG).'],
  ]],
  ['11. Cycle Analysis', [
    ['Concepts in Cycle Theory', 'Mid-cycle dip, inversions, translation, CMA envelopes and valid trendlines.'],
    ['Applied Cycle Analysis', 'Finding and phasing cycles; spectrograms.'],
    ['Analysis of Seasonal Cycles', 'The annual cycle and detrending methods.'],
    ['The Elliott Wave Principle Part 1', 'Wave notation, motive vs corrective waves, impulses, diagonals, zigzags, flats and triangles.'],
    ['The Elliott Wave Principle Part 2', 'Alternation, depth, psychology and Fibonacci relationships in waves.'],
    ['Cycle Driven Market Approaches', 'Combining time-based tools with price-based tools.'],
  ]],
  ['12. Systems and Quantitative Methods', [
    ['Trading Systems', 'Five common trading models, go/no-go metrics and ways to generate signals.'],
    ['Applying Quantitative Techniques', 'CAGR, max drawdown, profit factor, Sharpe, Sortino, Calmar, stops and robustness.'],
  ]],
];

const L3 = [
  ['1. Quantifying and Managing Risk', [['Perspectives on Risk', 'VaR and CVaR, leverage, risk targeting and diversification.']]],
  ['2. Classical Chart Analysis', [
    ['Classical Chart Patterns', 'Designing trades — targets, entries and stops with the 3% and ATR rules — and trading failed patterns.'],
    ['Candlesticks within a Broader Technical Analysis Framework', 'Confirming candlesticks with Western tools and using them in risk management.'],
    ['Case Studies in Point-and-Figure Analysis', 'Top-down P&amp;F process, stop levels and position sizing.'],
  ]],
  ['3. Trend Analysis', [['Market Internals', 'Using internals to judge market health.']]],
  ['4. Technical Indicators', [
    ['Anchored VWAP Parts 1 &amp; 2', 'VWAP vs AVWAP, time and event anchors and their drawbacks.'],
    ['Bollinger Bands Advanced Implementation', 'Reversal vs continuation tags, multicollinearity, M tops and W bottoms.'],
  ]],
  ['5. Volatility Analysis', [['Volatility Indexes Advanced Concepts', 'VVIX, the SKEW Index, the MOVE Index and tail risk.']]],
  ['6. Comparative Market Analysis', [['Relative Rotation Graphs – Advanced Concepts', 'Open vs closed universes and RRGs in portfolio management.']]],
  ['7. Systems and Quantitative Methods', [
    ['Statistics of Backtesting', 'Log returns and the statistical pitfalls of backtesting.'],
    ['Systematic Approaches, Development, and Risk', 'Risk-per-trade vs risk-per-unit-of-time.'],
    ['Systematic Counter-Trend Trading and Position Sizing', 'Counter-trend models and volatility-based sizing.'],
    ['Systematic Tactical Asset Allocation', 'Improving the All-Weather portfolio.'],
    ['Trading Systems', 'The expectancy formula.'],
    ['Advanced Quantitative Concepts', 'Rebalancing, risk parity, p-values and the limits of the Sharpe ratio.'],
  ]],
  ['8. Topics in Portfolio Management', [
    ['Bridging the Fundamental Gap: Fusion Analysis', 'Combining fundamentals, trend and relative strength.'],
    ['Portfolio Construction with Relative Strength and Sector Rotation', 'Tactical allocation and sector rotation strategies.'],
    ['A Practitioner\'s Perspective on Portfolio Management', 'Top-down risk assessment and dynamic portfolio management.'],
    ['Digital Assets – Applying Technical Analysis', 'Bitcoin as benchmark, on-chain metrics and reflexivity.'],
    ['Fusion Analysis: Technicians and Fundamentalists Working Together', 'Rule 344 and what to do when technicals and fundamentals diverge.'],
    ['Contrarianism, Crowd Behavior, and Overcoming Group Biases', 'Contrarian strategy and groupthink.'],
  ]],
];

const syllabus = (sections) =>
  sections.map(([s, chapters]) => `<h3>${s}</h3>\n${tbl(['Chapter', 'What it covers'], chapters)}`).join('\n');

const HTML = `
<p>This is the complete <strong>CMT syllabus for 2026</strong> for all three levels, taken directly from the official <strong>2026 CMT Program Guide</strong> published by the CMT Association. You'll find the exam format, how much each knowledge domain is worth and every chapter you need to study.</p>

<div style="${note}"><strong>Quick summary:</strong> Level 1 tests foundations (132 MCQs, 2 hours). Level 2 tests application (170 MCQs, 4 hours). Level 3 tests your work as an analyst (multiple choice + short answers, 4 hours). Ethics is tested at every level.</div>

<h2>CMT exam format at a glance</h2>
${tbl(['', 'Level 1', 'Level 2', 'Level 3'], [
  ['Theme', 'Foundational Principles of Technical Analysis', 'Application of Technical Analysis Methods', 'The Work of a Technical Analyst'],
  ['Format', '132 multiple-choice questions', '170 multiple-choice questions', 'Multiple choice + short answers (about 50–60 questions)'],
  ['Scored items', '120 (12 are trial questions)', '150 (20 are trial questions)', 'Mostly open-ended responses'],
  ['Duration', '2 hours', '4 hours', '4 hours'],
  ['Suggested study time', '40–100 hours', '100–140 hours', '120–160 hours'],
  ['Delivery', 'Computer-based at Prometric centres or Prometric ProProctor (remote)', 'Same', 'Same'],
])}

<h2>Knowledge domain weightings</h2>
<p>The CMT curriculum is organised into five knowledge domains. Here is how much of each exam they make up:</p>
${tbl(['Knowledge domain', 'Level 1', 'Level 2', 'Level 3'], [
  ['Theory and History', '38%', '7%', '—'],
  ['Classical Techniques', '33%', '40%', '—'],
  ['Advanced Techniques', '26%', '40%', '—'],
  ['Application of Technical Analysis', '—', '10%', '95%'],
  ['Ethics', '3%', '3%', '5%'],
])}
<p>The shift is clear: Level 1 is about knowing the concepts, Level 2 about using them, and Level 3 almost entirely about applying them.</p>

<h2>CMT Level 1 syllabus 2026</h2>
<p>Level 1 tests introductory concepts and definitions. It has 12 sections plus Ethics.</p>
${syllabus(L1)}
<p>Every indicator above can be practised with our free <a href="/tools">indicator calculators</a>. For a full study plan, read the <a href="/blog/cmt-level-1-complete-guide-2026">CMT Level 1 guide</a>, then test yourself with <a href="/blog/cmt-level-1-practice-questions">100 Level 1 practice questions</a> and the <a href="/blog/cmt-level-1-formulas-explained">Level 1 formula cheat sheet</a>.</p>

<h2>CMT Level 2 syllabus 2026</h2>
<p>Level 2 tests the theory and analysis of applied technical analysis. Besides the sections below, the Application domain asks you to:</p>
<ul>
<li>Analyse charts for entries and exits using classical charts, patterns and indicators</li>
<li>Develop risk plans using technical, behavioral and quantitative analysis and leverage</li>
<li>Judge whether a model's output is suitable to implement</li>
<li>Weight assets using relative strength, trend and momentum</li>
<li>Build volatility measures into price forecasts and trade management</li>
</ul>
${syllabus(L2)}
<p>Go deeper with the <a href="/blog/complete-guide-to-cmt-level-2">CMT Level 2 guide</a>, <a href="/blog/cmt-level-2-formulas-explained">every Level 2 formula explained</a> and <a href="/blog/cmt-level-2-practice-questions">100+ Level 2 practice questions</a>.</p>

<h2>CMT Level 3 syllabus 2026</h2>
<p>Level 3 tests your ability to bring everything together. Questions come in groups that usually combine two or more domains, and each group has three to seven items. Most answers are written — you make a list, state and justify your analysis, or give a similar response.</p>
${syllabus(L3)}

<h2>Ethics at every level</h2>
<p>The CMT Association has adopted the <strong>CFA Institute Code of Ethics and Standards of Professional Conduct</strong>. Ethics questions appear on all three exams, but ethics is <strong>not</strong> covered in the CMT textbooks — study it from the <em>Standards of Practice Handbook</em>.</p>

<h2>What about fees and exam dates?</h2>
<p>The Program Guide does not list fees or exam dates. Check <strong>cmtassociation.org</strong> for the current exam windows, registration deadlines and fees before you register.</p>

<div style="${note}"><strong>Study the whole syllabus in one place.</strong> Chartix has chapter-wise notes that follow this exact syllabus, 10,000+ practice MCQs, mock tests and an AI tutor. <a href="/sign-up">Start free — no card needed →</a></div>

<p style="font-size:12px;color:#9ca3af;line-height:1.6;"><strong>Source:</strong> CMT Association, <em>CMT Program Guide 2026</em> (current March 5, 2026). Chapter descriptions are summaries of the official learning objectives. Syllabus and exam details can change — always verify the latest information at cmtassociation.org. Chartix is a Participating Prep Provider of the CMT Association; participation does not constitute an endorsement or sponsorship of our products by the Association. CMT&reg; and Chartered Market Technician&reg; are registered trademarks owned by the CMT Association.</p>
`.trim();

async function main() {
  const existing = await prisma.blogPost.findUnique({ where: { slug: SLUG } });
  const data = {
    title: TITLE,
    excerpt: EXCERPT,
    contentHtml: HTML,
    readMinutes: 12,
    tags: ['CMT Syllabus', 'CMT Level 1', 'CMT Level 2', 'CMT Level 3', 'CMT Exam'],
  };
  if (existing) {
    await prisma.blogPost.update({ where: { id: existing.id }, data });
    console.log(`✅ Updated ${SLUG} (published: ${existing.isPublished})`);
  } else {
    await prisma.blogPost.create({ data: { ...data, slug: SLUG, isPublished: false } });
    console.log(`✅ Created DRAFT /blog/${SLUG}`);
  }
  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
