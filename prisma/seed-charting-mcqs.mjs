/**
 * Seed: An Overview of Charting — PDF MCQs
 *
 * Adds all 60 questions from the PDF to the existing chapter/subtopics.
 * Run with: node prisma/seed-charting-mcqs.mjs
 *
 * Chapter: An Overview of Charting (slug: an-overview-of-charting)
 * Subtopics used:
 *   chart-types-and-data       → Q1–Q30 (conceptual + standard MCQs)
 *   bar-chart-construction     → Bar-chart specific questions embedded below
 *   candlestick-chart-basics   → Candlestick-specific questions embedded below
 */

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

function doc(text) {
  return {
    type: 'doc',
    content: [{ type: 'paragraph', content: [{ type: 'text', text }] }],
  };
}

// q(prompt, [optA, optB, optC, optD], correctIndex 0-based, 'Easy'|'Moderate'|'Hard', explanation)
function q(text, options, correctIndex, difficulty, explanation) {
  return {
    promptJson: doc(text),
    options: options.map((o, i) => ({
      contentJson: doc(o),
      isCorrect: i === correctIndex,
      orderIndex: i + 1,
    })),
    difficulty:
      difficulty === 'Easy' ? 'EASY' : difficulty === 'Hard' ? 'HARD' : 'MEDIUM',
    explanationJson: doc(explanation),
  };
}

// ─── QUESTIONS ────────────────────────────────────────────────────────────────
// Distributed across the three subtopics matching the PDF's topic coverage.
// chart-types-and-data      : general charting, purpose, line charts, chart comparison, evolution
// bar-chart-construction    : bar chart specifics, ticks, range, volatility interpretation
// candlestick-chart-basics  : candlestick anatomy, color, shadows, patterns, comparison to bar

const QUESTIONS = {
  // ── Subtopic 1: Chart Types and Data ──────────────────────────────────────
  'chart-types-and-data': [
    // ── Standard MCQs (from PDF Q1–Q30) ──
    q(
      'What is the primary purpose of charts in technical analysis?',
      ['Forecast macroeconomic variables', 'Record accounting transactions', 'Summarize price action visually', 'Predict earnings growth'],
      2, 'Easy',
      'Charts provide a concise visual summary of price history, helping analysts interpret trends and patterns rather than just record data.',
    ),
    q(
      'Which chart type uses only one data point per period?',
      ['Bar chart', 'Candlestick chart', 'Line chart', 'Point & figure chart'],
      2, 'Easy',
      'Line charts typically use only the closing price for each time period, making them simple but less detailed.',
    ),
    q(
      'In a line chart, what is plotted on the vertical axis?',
      ['Time', 'Volume', 'Price', 'Volatility'],
      2, 'Easy',
      'Price is plotted on the vertical (y) axis, while time is plotted on the horizontal axis.',
    ),
    q(
      'Which of the following best describes a bar chart?',
      ['Displays only closing prices', 'Displays OHLC data', 'Displays volume only', 'Displays moving averages'],
      1, 'Easy',
      'Bar charts typically display Open, High, Low, and Close (OHLC) data for each time period.',
    ),
    q(
      'What does the length of a bar in a bar chart represent?',
      ['Volume traded', 'Time duration', 'Trading range', 'Opening price'],
      2, 'Easy',
      'The bar length shows the range between high and low prices during the period.',
    ),
    q(
      'Which price point is NOT always included in all bar charts?',
      ['High', 'Low', 'Close', 'Open'],
      3, 'Moderate',
      'Some bar charts omit the opening price, though OHLC charts include it.',
    ),
    q(
      'What is the "range" in a bar chart?',
      ['Difference between open and close', 'Difference between high and low', 'Average price', 'Volume range'],
      1, 'Easy',
      'Range is defined as high minus low price for the period.',
    ),
    q(
      'Why were line charts historically sufficient in early markets?',
      ['Markets were highly volatile', 'Only closing prices were relevant', 'Prices were reported infrequently', 'Traders ignored intraday data'],
      2, 'Moderate',
      'Early markets had limited data availability, often only one or two price points per day.',
    ),
    q(
      'Which of the following is a limitation of line charts?',
      ['Too complex to interpret', 'Ignores intraday price movement', 'Cannot show trends', 'Requires large datasets'],
      1, 'Moderate',
      'Line charts only show closing prices and ignore intraday fluctuations.',
    ),
    q(
      'What is the main advantage of bar charts over line charts?',
      ['Easier to construct', 'Less data required', 'Show more price information', 'Eliminate noise'],
      2, 'Moderate',
      'Bar charts include high and low prices (and often open), providing more detail than line charts.',
    ),
    q(
      'Which factor historically contributed to the importance of the closing price?',
      ['It reflects intraday volatility', 'It determines bid-ask spread', 'It was used for margin calculations', 'It captures opening sentiment'],
      2, 'Hard',
      'Closing prices were used for capital requirements and margin calculations, increasing their importance.',
    ),
    q(
      'Time is plotted on which axis in most charts?',
      ['Vertical axis', 'Horizontal axis', 'Both axes', 'Neither axis'],
      1, 'Easy',
      'Time is consistently plotted on the horizontal (x) axis.',
    ),
    q(
      'What does a longer bar in a bar chart indicate?',
      ['Higher volume', 'Longer time period', 'Greater price volatility', 'Higher closing price'],
      2, 'Moderate',
      'A longer bar means a wider high-low range, indicating greater volatility.',
    ),
    q(
      'Which statement best explains why charts are useful beyond record-keeping?',
      ['They reduce transaction costs', 'They allow prediction without data', 'They reveal trends and patterns', 'They eliminate uncertainty'],
      2, 'Hard',
      'Charts transform raw data into visual insights, helping identify trends and patterns.',
    ),
    q(
      'What is a key advantage of hand-drawn charts?',
      ['Higher accuracy', 'Faster processing', 'Improved intuition for price action', 'Automatic pattern recognition'],
      2, 'Moderate',
      'Drawing charts manually can enhance understanding and intuition about price behavior.',
    ),
    q(
      'What does price at any point in time represent?',
      ['Historical average', 'Future expectation', 'Supply and demand balance', 'Market inefficiency'],
      2, 'Hard',
      'Price reflects the equilibrium between supply and demand at that moment.',
    ),
    q(
      'Which users can benefit from charts besides technical analysts?',
      ['Only traders', 'Only economists', 'Fundamental analysts', 'Regulators only'],
      2, 'Moderate',
      'Fundamental analysts can use charts to identify periods of major price movement.',
    ),
    q(
      'Which best explains the evolution of charting methods?',
      ['Shift toward fewer data points', 'Elimination of time-series data', 'Desire to capture more detailed price information', 'Focus only on closing prices'],
      2, 'Hard',
      'As markets evolved, charting aimed to capture more detailed and frequent price data.',
    ),
    // ── Case-Based MCQs (from PDF Case Q1–Q30) ──
    q(
      'A trader observes a chart that only connects daily closing prices over time. During volatile sessions, large intraday swings are not visible. Which chart type is being used?',
      ['Bar chart', 'Candlestick chart', 'Line chart', 'OHLC chart'],
      2, 'Moderate',
      'Line charts plot only closing prices, ignoring intraday volatility, which explains the missing swings.',
    ),
    q(
      'An analyst wants to study supply-demand balance shifts during a trading day. Which chart type is LEAST suitable?',
      ['Candlestick', 'Bar chart', 'Line chart', 'OHLC chart'],
      2, 'Hard',
      'Line charts only show closing prices and do not reflect intraday dynamics of supply and demand.',
    ),
    q(
      'A trader wants a quick visual of trend direction without noise. Which chart is most appropriate?',
      ['Candlestick', 'Bar chart', 'Line chart', 'Tick chart'],
      2, 'Easy',
      'Line charts filter noise by focusing only on closing prices, making trends clearer.',
    ),
    q(
      'A trader misinterprets a line chart as showing low volatility. What is the flaw?',
      ['Line charts exaggerate volatility', 'Line charts ignore intraday range', 'Line charts show volume', 'Line charts include OHLC'],
      1, 'Hard',
      'Line charts omit high-low data, hiding true volatility.',
    ),
    q(
      'An analyst concludes that volatility is low based only on a line chart. Which correction is most appropriate?',
      ['Use moving averages', 'Switch to candlestick or bar chart', 'Add volume', 'Ignore volatility'],
      1, 'Hard',
      'Bar or candlestick charts reveal full price range, correcting underestimation of volatility.',
    ),
    q(
      'Why might a technician prefer hand-drawn charts during learning?',
      ['Faster computation', 'Lower cost', 'Improved intuition and pattern recognition', 'Higher precision'],
      2, 'Hard',
      'Manual plotting enhances understanding of price action nuances.',
    ),
    q(
      'A trader wants to detect repetitive patterns in price behavior. Why are charts useful?',
      ['They eliminate randomness', 'They reveal recurring patterns', 'They guarantee prediction', 'They remove noise'],
      1, 'Moderate',
      'Charts help identify recurring patterns due to market behavior repetition.',
    ),
    q(
      'A fundamental analyst wants to identify periods of unusual price movement. Why might charts be useful?',
      ['They predict earnings', 'They highlight major price swings visually', 'They remove volatility', 'They show only averages'],
      1, 'Hard',
      'Charts help identify abnormal price movements for further fundamental analysis.',
    ),
    q(
      'A trader wants minimal data requirements and quick chart construction. Best choice?',
      ['Candlestick', 'Bar chart', 'Line chart', 'Renko chart'],
      2, 'Easy',
      'Line charts require only closing prices.',
    ),
    q(
      'A trader wants to assess volatility quickly across multiple periods. Which visual cue is most useful?',
      ['Color of candlesticks', 'Length of bars/shadows', 'Time axis', 'Chart title'],
      1, 'Moderate',
      'Range (bar length/shadows) reflects volatility directly.',
    ),
    q(
      'A series of small-bodied candles with long shadows suggests:',
      ['Strong trend', 'High certainty', 'Market indecision and volatility', 'No trading'],
      2, 'Hard',
      'Small bodies + long shadows = indecision with volatility.',
    ),
  ],

  // ── Subtopic 2: Bar Chart Construction ────────────────────────────────────
  'bar-chart-construction': [
    q(
      'In a bar chart, how is the closing price indicated?',
      ['Left tick mark', 'Right tick mark', 'Top of the bar', 'Bottom of the bar'],
      1, 'Moderate',
      'The right-side tick represents the closing price, while the left-side tick shows the opening price.',
    ),
    q(
      'A stock shows a long vertical bar with a small difference between open and close. What does this indicate?',
      ['High volatility with indecision', 'Strong bullish trend', 'Low trading activity', 'No price movement'],
      0, 'Moderate',
      'A long bar means large range (high volatility), while small open-close difference suggests indecision.',
    ),
    q(
      'On a bar chart, the right tick mark is above the left tick mark. What does this imply?',
      ['Open > Close', 'Close > Open', 'High < Low', 'No price movement'],
      1, 'Easy',
      'Right tick = close, left tick = open. If right is higher → bullish session.',
    ),
    q(
      'An analyst wants to identify intraday extremes but does not care about open-close relationships. Best chart choice?',
      ['Line chart', 'Bar chart', 'Candlestick chart', 'Moving average'],
      1, 'Moderate',
      'Bar charts clearly show high and low without emphasizing body structure.',
    ),
    q(
      'A very short bar appears on a bar chart. What does this imply?',
      ['High volatility', 'Narrow trading range', 'Strong trend', 'High volume'],
      1, 'Easy',
      'Short bar = small difference between high and low → low volatility.',
    ),
    q(
      'A chart shows increasing bar lengths over time. What is the most likely interpretation?',
      ['Decreasing volatility', 'Increasing volatility', 'Stable trend', 'Declining volume'],
      1, 'Hard',
      'Longer bars reflect wider ranges → rising volatility.',
    ),
    q(
      'If the close is exactly at the high of the bar, this indicates:',
      ['Strong bullish sentiment', 'Strong bearish sentiment', 'No movement', 'High volatility'],
      0, 'Moderate',
      'Closing at high shows buyers dominated until the end.',
    ),
    q(
      'A bar where open = low and close = high indicates:',
      ['Strong bearish session', 'Strong bullish session', 'No movement', 'High uncertainty'],
      1, 'Moderate',
      'Price rose throughout session → strong bullish control.',
    ),
    q(
      'A trader wants to identify the exact opening price visually. Which chart is MOST explicit?',
      ['Line chart', 'Bar chart', 'Candlestick chart', 'Both B and C'],
      3, 'Moderate',
      'Both bar (left tick) and candlestick (body start) show opening price clearly.',
    ),
    q(
      'Which of the following is TRUE about OHLC bar charts?',
      ['They exclude the opening price by default', 'They always include open, high, low, and close', 'They only show closing price', 'They ignore time dimension'],
      1, 'Moderate',
      'OHLC bar charts always include open, high, low, and close data.',
    ),
  ],

  // ── Subtopic 3: Candlestick Chart Basics ──────────────────────────────────
  'candlestick-chart-basics': [
    q(
      'Candlestick charts originated in:',
      ['United States', 'United Kingdom', 'Japan', 'Germany'],
      2, 'Easy',
      'Candlestick charts were first used in Japan in the 1700s for rice trading.',
    ),
    q(
      'What does the "real body" of a candlestick represent?',
      ['High and low prices', 'Open and close prices', 'Volume traded', 'Trend direction only'],
      1, 'Moderate',
      'The real body connects the opening and closing prices.',
    ),
    q(
      'A bullish candlestick is formed when:',
      ['Open > Close', 'Close > Open', 'High = Low', 'Volume increases'],
      1, 'Easy',
      'A bullish (white/open) candlestick occurs when the closing price is higher than the opening price.',
    ),
    q(
      'What are the thin lines above and below the candlestick body called?',
      ['Bars', 'Ticks', 'Shadows (wicks)', 'Ranges'],
      2, 'Easy',
      'The upper and lower shadows show the high and low prices.',
    ),
    q(
      'What does a filled (black/red) candlestick indicate?',
      ['Close > Open', 'Open = Close', 'Close < Open', 'High = Close'],
      2, 'Moderate',
      'A filled candlestick indicates a bearish period where closing price is below opening price.',
    ),
    q(
      'Compared to bar charts, candlestick charts:',
      ['Use less information', 'Display the same data differently', 'Ignore opening prices', 'Only show trends'],
      1, 'Moderate',
      'Candlesticks present the same OHLC data but in a more visual and intuitive format.',
    ),
    q(
      'Why do traders often prefer candlestick charts?',
      ['They reduce data complexity', 'They eliminate noise', 'They make patterns easier to identify', 'They show volume automatically'],
      2, 'Hard',
      'Candlesticks visually emphasize relationships between open and close, making patterns easier to detect.',
    ),
    q(
      'Which chart type provides the most detailed intraday information among line, bar, and candlestick?',
      ['Line chart', 'Bar chart', 'Candlestick chart', 'All equally'],
      2, 'Moderate',
      'Candlestick charts always include OHLC data and highlight open-close relationships more clearly.',
    ),
    q(
      'What is another term for the shadows in candlestick charts?',
      ['Bodies', 'Tails', 'Wicks', 'Bars'],
      2, 'Easy',
      'Shadows are also called wicks.',
    ),
    q(
      'Which statement best differentiates candlestick and bar charts?',
      ['Candlesticks show less data', 'Bar charts are newer', 'Candlesticks emphasize open-close relationship visually', 'Bar charts ignore closing prices'],
      2, 'Hard',
      'Both show similar data, but candlesticks visually highlight the open-close relationship via the real body.',
    ),
    q(
      'A candlestick has a long upper shadow and small real body near the bottom. What does this suggest?',
      ['Strong buying pressure throughout', 'Rejection of higher prices', 'Strong bearish trend continuation', 'No volatility'],
      1, 'Moderate',
      'Price moved higher but was pushed down before close → sellers dominated at higher levels.',
    ),
    q(
      'A candlestick is filled (red) with a long lower shadow. What does this indicate?',
      ['Strong bearish control throughout', 'Buyers stepped in after selling pressure', 'No price movement', 'Gap up opening'],
      1, 'Moderate',
      'Long lower shadow shows prices dropped but recovered — buying interest emerged.',
    ),
    q(
      'An analyst compares a bar chart and a candlestick chart of the same data. Why might the candlestick chart be preferred?',
      ['It contains more data', 'It eliminates volatility', 'It visually highlights open-close relationships', 'It ignores intraday prices'],
      2, 'Hard',
      'Candlesticks enhance interpretation by emphasizing open-close dynamics visually.',
    ),
    q(
      'If a candlestick has no real body, what does it indicate?',
      ['High volatility', 'Open equals close', 'Strong bullish trend', 'Strong bearish trend'],
      1, 'Easy',
      'No body → open = close → indecision.',
    ),
    q(
      'A candlestick closes near its high with little lower shadow. What does this suggest?',
      ['Selling pressure dominated', 'Strong buying pressure', 'Indecision', 'Gap down'],
      1, 'Moderate',
      'Close near high indicates buyers controlled the session.',
    ),
    q(
      'A sequence of candles shows long upper shadows repeatedly. What does this imply?',
      ['Persistent buying strength', 'Resistance at higher levels', 'No volatility', 'Strong downtrend'],
      1, 'Hard',
      'Repeated rejection at highs indicates resistance.',
    ),
    q(
      'If the close is exactly at the high of the candlestick:',
      ['Strong bullish sentiment', 'Strong bearish sentiment', 'No movement', 'High volatility'],
      0, 'Moderate',
      'Closing at high shows buyers dominated until the end.',
    ),
    q(
      'A trader notices that the closing price is consistently higher than the opening price over several periods. On a candlestick chart, this would appear as:',
      ['Series of filled candles', 'Series of hollow/green candles', 'No candles', 'Equal bodies'],
      1, 'Moderate',
      'Close > Open → bullish candles (white/green).',
    ),
    q(
      'Why are candlestick charts considered faster for pattern recognition?',
      ['Less data', 'Color-coded structure', 'Simpler axes', 'No time dimension'],
      1, 'Moderate',
      'Color and body size make interpretation intuitive and fast.',
    ),
    q(
      'A bullish candlestick with no upper shadow suggests:',
      ['Sellers dominated', 'Buyers controlled entire session', 'No volatility', 'Gap down'],
      1, 'Easy',
      'Price closed at high → continuous buying pressure.',
    ),
    q(
      'A market shows alternating bullish and bearish candlesticks with similar sizes. This most likely indicates:',
      ['Strong trend', 'Consolidation', 'Breakout', 'Panic selling'],
      1, 'Hard',
      'Alternating candles indicate balance between buyers and sellers → consolidation.',
    ),
    q(
      'A long lower shadow indicates:',
      ['Strong buying at highs', 'Selling pressure at close', 'Rejection of lower prices', 'No trading activity'],
      2, 'Easy',
      'Price dropped but recovered → buyers rejected lower levels.',
    ),
  ],
};

// ─── MAIN ─────────────────────────────────────────────────────────────────────
// All questions from this PDF belong to:
//   Chapter : "Unit II: Charts: Market Price Data" (slug: unit-ii-charts-market-price-data)
//   Subtopic: "2.1 An Overview of Charting"        (slug: 21-an-overview-of-charting)
// The QUESTIONS keys (chart-types-and-data, bar-chart-construction, candlestick-chart-basics)
// are logical groupings only — they all map to the single subtopic above.

async function main() {
  console.log('Seeding: An Overview of Charting — PDF MCQs\n');

  // Target: Unit II chapter, subtopic 2.1
  const chapter = await prisma.chapter.findFirst({
    where: { slug: 'unit-ii-charts-market-price-data', isDeleted: false },
  });

  if (!chapter) {
    console.error('ERROR: Chapter "unit-ii-charts-market-price-data" not found. Run seed-cmt-level1.mjs first.');
    process.exit(1);
  }

  const targetSubtopic = await prisma.subtopic.findFirst({
    where: { chapterId: chapter.id, slug: '21-an-overview-of-charting', isDeleted: false },
  });

  if (!targetSubtopic) {
    console.error('ERROR: Subtopic "21-an-overview-of-charting" not found under Unit II.');
    process.exit(1);
  }

  console.log(`Chapter  : ${chapter.title}`);
  console.log(`Subtopic : ${targetSubtopic.title}\n`);

  // All question groups → same subtopic
  const subtopicMap = {
    'chart-types-and-data': targetSubtopic,
    'bar-chart-construction': targetSubtopic,
    'candlestick-chart-basics': targetSubtopic,
  };

  let created = 0;
  let skipped = 0;

  for (const [groupKey, questions] of Object.entries(QUESTIONS)) {
    const subtopic = subtopicMap[groupKey];

    console.log(`\n  Group [${groupKey}] — seeding ${questions.length} questions into "${subtopic.title}"`);

    for (const qdata of questions) {
      // Skip if an identical question already exists (idempotent re-runs)
      const promptText = qdata.promptJson.content[0]?.content[0]?.text ?? '';
      const existing = await prisma.question.findFirst({
        where: {
          chapterId: chapter.id,
          subtopicId: subtopic.id,
          promptJson: { path: ['content', '0', 'content', '0', 'text'], equals: promptText },
        },
      });

      if (existing) {
        skipped++;
        continue;
      }

      const question = await prisma.question.create({
        data: {
          level: chapter.level,
          chapterId: chapter.id,
          subtopicId: subtopic.id,
          promptJson: qdata.promptJson,
          explanationJson: qdata.explanationJson,
          questionType: 'SINGLE_CHOICE',
          difficulty: qdata.difficulty,
          isPublished: true,
          isDeleted: false,
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

      created++;
    }
  }

  console.log(`\n✓ Questions created : ${created}`);
  console.log(`  Questions skipped : ${skipped} (already exist)`);
  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
