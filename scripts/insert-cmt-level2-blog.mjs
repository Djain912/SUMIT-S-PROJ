// Insert CMT Level 2 Complete Guide blog post
// Run: node scripts/insert-cmt-level2-blog.mjs

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const title = 'Complete Guide to CMT Level II: Syllabus, Exam Format & Study Plan';

const excerpt =
  'Everything you need to know about the CMT Level II exam — syllabus breakdown, knowledge domain weights, section-by-section learning objectives, and a proven study strategy to clear it on your first attempt.';

const tags = [
  'CMT Level 2',
  'CMT Exam',
  'Technical Analysis',
  'CMT Syllabus',
  'CMT Study Guide',
  'Chartered Market Technician',
];

const contentHtml = `
<h2>What is the CMT Level II Exam?</h2>

<p>The <strong>CMT Level II exam</strong> is the second of three levels in the Chartered Market Technician (CMT) programme — the gold-standard designation in technical analysis, awarded by the CMT Association.</p>

<p>While Level I tests foundational definitions and concepts, <strong>Level II focuses on application</strong>: how to use the full toolkit of technical analysis to identify opportunities and manage risk in real markets. You are expected to move beyond knowing what indicators are to knowing how, when, and why to apply them.</p>

<blockquote>
<strong>Official Theme:</strong> <em>"Application of Technical Analysis Methods — Application of the Concepts, Tools, and Methods of Technical Analysis to Identify Opportunities and Manage Risk."</em>
</blockquote>

<p>Level II is widely considered the most demanding of the three levels in terms of sheer content volume. Candidates should plan for <strong>100–140 hours of study</strong>.</p>

<hr />

<h2>CMT Level II Exam Format at a Glance</h2>

<table style="width:100%;border-collapse:collapse;">
  <thead>
    <tr style="background:#f4f4f5;">
      <th style="padding:10px 14px;text-align:left;border:1px solid #e4e4e7;">Detail</th>
      <th style="padding:10px 14px;text-align:left;border:1px solid #e4e4e7;">CMT Level II</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>Format</strong></td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">170 Multiple Choice Questions</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>Scored Questions</strong></td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">150 (20 are unscored pilot questions)</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>Duration</strong></td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">4 Hours</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>Delivery</strong></td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Computer at Prometric centres or ProProctor remote proctoring</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>Recommended Study Hours</strong></td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">100–140 hours</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>Prerequisite</strong></td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Pass CMT Level I</td>
    </tr>
  </tbody>
</table>

<p>The extra two hours compared to Level I reflects the step up in complexity. You will need solid time management — roughly <strong>1.4 minutes per question</strong> — to finish comfortably.</p>

<hr />

<h2>Knowledge Domain Weights</h2>

<p>The Level II paper is built from five knowledge domains. Understanding these weights helps you allocate study time in proportion to exam impact:</p>

<table style="width:100%;border-collapse:collapse;">
  <thead>
    <tr style="background:#f4f4f5;">
      <th style="padding:10px 14px;text-align:left;border:1px solid #e4e4e7;">Domain</th>
      <th style="padding:10px 14px;text-align:left;border:1px solid #e4e4e7;">Weight</th>
      <th style="padding:10px 14px;text-align:left;border:1px solid #e4e4e7;">Approx. Questions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Theory &amp; History</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">7%</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">~12</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>Classical Techniques</strong></td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>40%</strong></td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>~60</strong></td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>Advanced Techniques</strong></td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>40%</strong></td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;"><strong>~60</strong></td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Application of Technical Analysis</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">10%</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">~17</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Ethics</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">3%</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">~5</td>
    </tr>
  </tbody>
</table>

<p><strong>Key insight:</strong> Classical and Advanced Techniques together make up 80% of the paper. The Application of Technical Analysis domain is unique to Level II — it tests your ability to integrate knowledge across multiple techniques in real trading scenarios. There are no dedicated chapters for this domain; it is examined across the whole syllabus.</p>

<hr />

<h2>CMT Level II Syllabus: All 12 Sections</h2>

<p>The Level II curriculum is organised into 12 sections (units). Below is a thorough breakdown of each section, its topics, and the key learning objective statements (LOS) you must master.</p>

<h3>Section 1 — Theory and History of Technical Analysis</h3>

<p>Level II revisits theory not as a recap, but through an applied lens. You need to be able to argue for technical analysis in a professional context.</p>

<ul>
  <li><strong>Alpha and Beta:</strong> Distinguish between alpha and beta. Compare the Efficient Market Hypothesis (EMH), the Adaptive Market Hypothesis (AMH), and the Fractal Market Hypothesis (FMH). Analyse anomalous supply-demand scenarios as potential opportunities.</li>
  <li><strong>Fusion Analysis:</strong> Contrast the roles of a fundamental and a technical analyst. Outline how technicians can collaborate with fundamentalists in a team-based investment process.</li>
</ul>

<h3>Section 2 — Behavioural Finance</h3>

<p>This section examines collective investor psychology, which is critical for understanding market extremes.</p>

<ul>
  <li><strong>Anatomy of Market Bubbles:</strong> Explain what a market bubble is. Identify and describe the five stages of a market bubble. Identify charts that help assess each bubble stage.</li>
</ul>

<h3>Section 3 — Charts: Organising Market Data</h3>

<p>At Level II, charting moves beyond construction into professional interpretation across multiple data sets and timeframes.</p>

<ul>
  <li><strong>Charting Multiple Data Sets &amp; Intervals:</strong> Use multiple timeframe analysis to identify trends. Understand the challenges of consistent sampling in intraday data. Interpret multi-price-data-set charts.</li>
  <li><strong>Market Profile:</strong> State the basic principles behind Market Profile and how it organises price-time data into a distribution.</li>
</ul>

<h3>Section 4 — Chart Pattern Analysis</h3>

<p>The most heavily tested classical section. Level II requires you to calculate targets and make trading decisions, not just identify patterns.</p>

<ul>
  <li><strong>Classical Chart Patterns:</strong> Calculate price targets for reversal and continuation patterns. Apply the 3% rule and ATR multiple rule to confirm breakouts. Understand rangebound mean-reversion and breakout tactics.</li>
  <li><strong>Candlestick Patterns in the Real World:</strong> Identify and interpret patterns including multi-candle patterns. Relate candlestick patterns to their volume characteristics and what they reveal about market psychology.</li>
  <li><strong>Candlestick Analysis in the Real World:</strong> Differentiate single-candle from multi-candle patterns. Identify complete vs. incomplete patterns. Interpret patterns at support/resistance. Compare abandoned baby and island reversal. Apply guidelines for imperfect candlestick patterns.</li>
  <li><strong>Point-and-Figure Pattern Analysis:</strong> Identify complex P&amp;F patterns. Calculate price projections using vertical and horizontal counts.</li>
</ul>

<h3>Section 5 — Trend Analysis</h3>

<p>Volume and market breadth are elevated to core analytical tools at Level II.</p>

<ul>
  <li><strong>Price Trend and Volume:</strong> Describe the four phases of price-volume trends. Interpret volume in context of price trends to identify the current phase.</li>
  <li><strong>Market Internals:</strong> Examine the advance-decline line and up/down volume. Describe breadth indicators and how they are commonly used. Contrast different ways to calculate and use leadership indicators. Interpret advanced indicators. Use qualitative analysis with market internals.</li>
</ul>

<h3>Section 6 — Volatility Analysis</h3>

<p>Volatility is a major focus at Level II, both as a risk tool and as a forecasting input. This section is quantitative and detailed.</p>

<ul>
  <li><strong>Extrapolating Price from Volatility:</strong> State what the VIX measures and how. Calculate expected price ranges using VIX for various look-ahead periods. Articulate the limitations of VIX-based forecasts.</li>
  <li><strong>Volatility Risk Premium (VRP):</strong> Examine the relationship between implied and realised volatility. Define the VRP. Explain how to capture the VRP using options.</li>
  <li><strong>VIX Complex &amp; Term Structure:</strong> Examine backwardation and contango in the VIX futures term structure. Interpret what a shift from contango to backwardation signals. Identify early-warning signals for risk management. Contrast using VIX calls versus S&amp;P 500 puts to manage downside risk.</li>
</ul>

<h3>Section 7 — Sentiment</h3>

<p>Sentiment at Level II is deeper and more derivative-focused than at Level I.</p>

<ul>
  <li><strong>Sentiment in the Stock Market:</strong> Analyse insider activity and its impact on price action. Distinguish insider buying from selling. Analyse short interest and the short interest ratio. Interpret sentiment surveys of investors and professionals.</li>
  <li><strong>Sentiment in the Derivatives Market:</strong> Interpret changes in futures open interest vs. price action. Analyse the Commitments of Traders (COT) report. Employ options put/call ratios. Interpret volatility data from the options market.</li>
</ul>

<h3>Section 8 — Statistics for Technicians</h3>

<p>Level II adds hypothesis testing to the statistics toolkit from Level I.</p>

<ul>
  <li><strong>Inferential Statistics:</strong> Define hypothesis testing. Describe the steps in hypothesis testing. Distinguish Type I and Type II errors. Demonstrate how to frame statistical tests for technical analysis validation.</li>
</ul>

<h3>Section 9 — Technical Indicators</h3>

<p>This is one of the largest and most heavily weighted sections. Mastery of indicator interpretation at a professional level is expected.</p>

<ul>
  <li><strong>Momentum Part 1:</strong> Define technical momentum. Distinguish velocity and acceleration. Compare overbought/oversold conditions across trending and rangebound markets. Identify momentum divergences. Outline momentum from beginning to end of directional trends.</li>
  <li><strong>Momentum Part 2:</strong> Distinguish reversals in price vs. reversals in momentum. Identify trend changes in momentum indicators. Interpret multiple momentum indicators. Understand the three steps of a valid signal.</li>
  <li><strong>Volume Weighted Average Price (VWAP):</strong> State the original purpose of VWAP. Interpret order execution quality. Explain why VWAP is the "true dollar average." Use VWAP to assess buyer/seller control. Describe VWAP calculation. Understand the typical intraday volume pattern.</li>
  <li><strong>Practical Applications of Bollinger Bands:</strong> Interpret %b and BandWidth. Describe the cyclical nature of volatility. Identify Two-Bar Reversals using %b. Identify Squeezes and Bulges using BandWidth.</li>
</ul>

<h3>Section 10 — Comparative Market Analysis</h3>

<p>Relative strength analysis at Level II moves to the professional RRG (Relative Rotation Graph) framework.</p>

<ul>
  <li><strong>Advanced Applications of Relative Strength:</strong> Explain two major issues in relative strength analysis. Compare and contrast JdK RS-Ratio and JdK RS-Momentum. Outline their roles as building blocks for the RRG. Illustrate the benchmark's role. Diagram the ideal sequence of rotation for securities on the RRG.</li>
</ul>

<h3>Section 11 — Cycle Analysis</h3>

<p>The most technically demanding section for most candidates. Elliott Wave, Hurst cycles, and seasonality are all tested at depth.</p>

<ul>
  <li><strong>Concepts in Cycle Theory:</strong> Illustrate mid-cycle dip and ¾-cycle high causes. Analyse the implications of a cycle inversion. Examine cyclical explanations for rounded tops and V-bottoms. Interpret left/right translation. Calculate a Centred Moving Average (CMA) envelope. Demonstrate using a valid trendline (VTL).</li>
  <li><strong>Applied Cycle Analysis:</strong> Diagram a comprehensive cycle analysis workflow. Distinguish cycle-finding tools from cycle-phasing tools. Identify a dominant cycle with a spectrogram. Compare phasing of smaller harmonics to larger ones.</li>
  <li><strong>Analysis of Seasonal Cycles:</strong> Explain how the annual cycle conforms to cycle theory. Describe two detrending methods. Outline common seasonal tools.</li>
  <li><strong>Elliott Wave Part 1:</strong> Describe the basic operating theory of the Wave Principle. Label waves using standard notation. Compare motive and corrective waves. Diagram impulse, extension, and diagonal waves.</li>
  <li><strong>Elliott Wave Part 2:</strong> Describe corrective wave characteristics including alternation and depth. Analyse how Elliott Wave reflects investor psychology. Compute Fibonacci relationships in Elliott Wave context.</li>
  <li><strong>Elliott Wave Part 3:</strong> Diagram observations from multiple market cycle experts. Infer the benefits of combining time-based tools with traditional price-based tools.</li>
</ul>

<h3>Section 12 — Systems and Quantitative Methods</h3>

<p>The final section bridges qualitative analysis with systematic, data-driven decision-making.</p>

<ul>
  <li><strong>Trading Systems:</strong> Compare five common trading models. Outline go/no-go metrics. Explain four ways of generating trading signals. Analyse seven steps to a consistently profitable system.</li>
  <li><strong>Applying Quantitative Techniques:</strong> Outline each step of the quantitative process. Compare trigger rules, filter rules, and value rules. Contrast signal test results. Interpret trade measures, performance measures, and accounting measures (annualised return, CAGR, maximum drawdown, Sharpe ratio, Sortino ratio, Calmar ratio, profit factor, expected value). Explain stop calculations. Define robustness in parameter optimisation.</li>
</ul>

<hr />

<h2>How CMT Level II Differs from Level I</h2>

<table style="width:100%;border-collapse:collapse;">
  <thead>
    <tr style="background:#f4f4f5;">
      <th style="padding:10px 14px;text-align:left;border:1px solid #e4e4e7;">Dimension</th>
      <th style="padding:10px 14px;text-align:left;border:1px solid #e4e4e7;">Level I</th>
      <th style="padding:10px 14px;text-align:left;border:1px solid #e4e4e7;">Level II</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Focus</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Definitions &amp; concepts</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Application &amp; decision-making</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Questions</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">132 MCQ / 2 hours</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">170 MCQ / 4 hours</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Study hours</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">40–100 hours</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">100–140 hours</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Elliott Wave</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Not covered</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">3 dedicated units</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Quantitative methods</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Introductory</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Full system design &amp; optimisation</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Volatility</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Introductory (VIX basics)</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">VRP, term structure, options hedging</td>
    </tr>
    <tr>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Cycle Analysis</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Foundations &amp; Hurst principles</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Spectrogram, seasonality, Elliott Wave</td>
    </tr>
    <tr style="background:#fafafa;">
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Market Internals</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Introductory</td>
      <td style="padding:10px 14px;border:1px solid #e4e4e7;">Advanced breadth, leadership, internals</td>
    </tr>
  </tbody>
</table>

<hr />

<h2>Recommended Study Plan for CMT Level II</h2>

<p>With 100–140 hours of study, here is how to allocate your time based on exam weightings:</p>

<h3>Phase 1 — Foundation (Weeks 1–4)</h3>
<p>Cover Sections 1–5: Theory, Behavioural Finance, Charts, Chart Patterns, and Trend Analysis. These build the scaffolding on which all application questions rest. Do not rush chart patterns — it is the single largest area in the Classical domain.</p>

<h3>Phase 2 — Advanced Tools (Weeks 5–10)</h3>
<p>Work through Sections 6–10: Volatility, Sentiment, Statistics, Indicators (the biggest unit), and Relative Strength/RRG. This is the heart of the Advanced Techniques domain (40%). Pay special attention to Momentum (Sections 9.1 and 9.2) — it is among the most heavily tested topics in the entire exam.</p>

<h3>Phase 3 — Cycle Analysis and Systems (Weeks 11–14)</h3>
<p>Sections 11 and 12. Elliott Wave is notorious for being complex — give it more time than you expect. The three Elliott Wave units plus Cycle Theory and Seasonality together represent a significant portion of the paper. Trading Systems and Quantitative Methods (Section 12) are manageable but require understanding all the performance ratios cold.</p>

<h3>Phase 4 — Mock Tests and Revision (Weeks 15–18)</h3>
<p>Simulate exam conditions with full 170-question papers timed at 4 hours. Review every wrong answer against the LOS, not just the answer explanation. Target weaknesses by returning to the specific unit. Ethics should also be revised in this phase — while it is only 3% of the paper, it is tested on every level and the questions are typically straightforward.</p>

<hr />

<h2>Common Mistakes Candidates Make at Level II</h2>

<ul>
  <li><strong>Treating it like Level I.</strong> Level II does not reward recall alone. You must be able to apply. For every concept, ask yourself: "How would I use this in a trade or risk management decision?"</li>
  <li><strong>Underweighting Elliott Wave.</strong> Many candidates skim the three Elliott Wave units. They collectively form one of the most detailed and testable areas in the entire curriculum. Allow two to three weeks for these alone.</li>
  <li><strong>Ignoring the quantitative performance metrics.</strong> Questions on Sharpe ratio, Sortino ratio, Calmar ratio, maximum drawdown, and CAGR appear reliably. Know how to calculate each and when to use one over another.</li>
  <li><strong>Not practising VIX calculations.</strong> The VIX-based price range formula (VIX ÷ √52 for weekly, or ÷ √252 for daily) is a consistent calculation question. Learn it, practise it, and trust it.</li>
  <li><strong>Running out of time in the exam.</strong> 170 questions in 4 hours = 1.4 minutes each. Practise under timed conditions from at least 8 weeks out so your pace is automatic by exam day.</li>
</ul>

<hr />

<h2>Ethics — Do Not Skip It</h2>

<p>Ethics questions appear on all three CMT levels. At Level II, Ethics carries 3% of the paper (~5 questions). The relevant reference is the <strong>Standards of Practice Handbook</strong> (not the main textbook — ethics is not covered in the standard curriculum readings). Study the <strong>CMT Code of Ethics and Standards of Professional Conduct</strong> directly. These questions are typically straightforward if you have read the material, and you cannot afford to lose them.</p>

<hr />

<h2>Frequently Asked Questions</h2>

<h3>How hard is CMT Level II compared to Level I?</h3>
<p>Level II is significantly more demanding. The jump from 132 questions in 2 hours to 170 questions in 4 hours understates the difficulty increase — the real step up is in depth. Questions at Level II require you to apply techniques, calculate outputs, and make trading decisions, not just recall definitions. Most candidates who struggle at Level II do so because they underestimate this shift.</p>

<h3>Can I skip Level I and sit Level II directly?</h3>
<p>No. You must pass CMT Level I before you are eligible to sit Level II. The levels are sequential and prerequisites are enforced by the CMT Association.</p>

<h3>How many times can I take CMT Level II?</h3>
<p>There is no official limit on the number of attempts. However, the CMT Association requires you to complete all three levels within seven years of passing Level I.</p>

<h3>Which sections should I study first?</h3>
<p>Start with Chart Pattern Analysis (Section 4) and Trend Analysis (Section 5) — together they represent a large slice of the Classical domain (40% of the paper). Then move into Indicators (Section 9, the largest unit in the curriculum) before tackling Cycle Analysis (Section 11). Leave Elliott Wave for last in your build-up phase so it is fresh in your memory before the exam.</p>

<h3>Is there a recommended textbook list for CMT Level II?</h3>
<p>The CMT Association provides the official candidate body of knowledge through its digital LMS. The reading list spans multiple textbooks and journal articles. The Programme Guide (available from the CMT Association website) contains the complete reading list with all section and unit mappings.</p>

<h3>What is the pass rate for CMT Level II?</h3>
<p>The CMT Association does not publish official pass rates. Anecdotally, Level II has a lower pass rate than Level I, with many candidates requiring more than one attempt. Structured preparation with a focus on application — not just recall — is the key differentiator between first-time passers and repeaters.</p>

<hr />

<h2>Final Thoughts</h2>

<p>CMT Level II is a serious undertaking — but it is entirely clearable with the right preparation. The syllabus is broad, but the LOS are your precision guide. Every exam question is traceable back to a specific learning objective. Study the LOS, not just the chapters.</p>

<p>Focus the majority of your time on Classical Techniques and Advanced Techniques (together 80% of the paper). Get comfortable with calculations — price targets from chart patterns, VIX-based price ranges, CMA envelopes, and performance ratios. And build in genuine timed mock exam practice from at least a month before your sitting date.</p>

<p>If you cleared Level I, you have already proven you can do this. Level II rewards candidates who treat it as a professional skills exam, not an academic test.</p>
`;

async function main() {
  const slug = 'complete-guide-to-cmt-level-2';

  const existing = await prisma.blogPost.findFirst({ where: { slug } });
  if (existing) {
    console.log(`Blog post already exists (id: ${existing.id}), updating...`);
    const updated = await prisma.blogPost.update({
      where: { id: existing.id },
      data: {
        title,
        contentHtml,
        excerpt,
        readMinutes: 18,
        tags,
      },
    });
    console.log(`Updated: ${updated.slug} (id: ${updated.id})`);
  } else {
    const post = await prisma.blogPost.create({
      data: {
        title,
        slug,
        contentHtml,
        excerpt,
        isPublished: false, // publish manually after review
        readMinutes: 18,
        tags,
      },
    });
    console.log(`Created: ${post.slug} (id: ${post.id}) — isPublished: false`);
    console.log('Review it in the admin blog panel, then publish.');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
