/**
 * Seed: Behavioral Finance — PDF MCQs
 *
 * Target:
 *   Chapter  : "Unit VII: Behavioral Finance" (slug: unit-vii-behavioral-finance)
 *   Subtopic : "7.1 Behavioral Finance"       (slug: 71-behavioral-finance)
 *
 * Run with: node prisma/seed-behavioral-finance-mcqs.mjs
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

// q(prompt, [A, B, C, D], correctIndex 0-based, 'Easy'|'Moderate'|'Hard', explanation)
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

const QUESTIONS = [
  // ── Standard MCQs Q1–Q30 ──────────────────────────────────────────────────

  q(
    'Traditional economic theory assumes that investors are:',
    ['Emotional and irrational', 'Risk-averse only', 'Rational and self-interested', 'Random decision-makers'],
    2, 'Easy',
    'Traditional economics assumes "homo economicus," meaning rational, self-interested decision-making.',
  ),
  q(
    'Behavioral finance primarily integrates:',
    ['Mathematics and physics', 'Psychology and economics', 'Accounting and finance', 'Statistics and trading'],
    1, 'Easy',
    'Behavioral finance incorporates psychological insights into economic decision-making.',
  ),
  q(
    'Prospect theory suggests that investors:',
    ['Prefer gains over losses equally', 'Are risk-neutral', 'Feel losses more strongly than gains', 'Ignore probability'],
    2, 'Easy',
    'Losses have a greater psychological impact than equivalent gains.',
  ),
  q(
    'Loss aversion implies that:',
    ['Investors seek risk', 'Investors avoid gains', 'Losses are felt more than gains', 'Gains are more important'],
    2, 'Easy',
    'Investors dislike losses more than they enjoy gains of equal size.',
  ),
  q(
    'Given a choice between a guaranteed $50,000 and a 50% chance of $100,000, most investors choose the guaranteed option due to:',
    ['Overconfidence', 'Loss aversion', 'Anchoring', 'Recency bias'],
    1, 'Moderate',
    'Investors prefer certainty due to fear of loss — a direct consequence of loss aversion described in prospect theory.',
  ),
  q(
    'Which statement is TRUE about decision-making in financial markets?',
    ['Mostly rational', 'Mostly emotional', 'Always logical', 'Fully predictable'],
    1, 'Easy',
    'Behavioral finance shows decisions are largely driven by emotions and cognitive biases rather than pure rationality.',
  ),
  q(
    'Belief preservation biases lead investors to:',
    ['Trade frequently', 'Change views quickly', 'Stick to existing beliefs', 'Ignore past data'],
    2, 'Easy',
    'Investors cling to prior beliefs even when new information contradicts them.',
  ),
  q(
    'Conservatism bias results in:',
    ['Overreaction to news', 'Underreaction to new information', 'High trading frequency', 'Random decisions'],
    1, 'Easy',
    'Investors fail to update beliefs sufficiently when new evidence arrives.',
  ),
  q(
    'Confirmation bias leads investors to:',
    ['Seek opposing views', 'Ignore supporting evidence', 'Focus on information confirming their existing beliefs', 'Trade randomly'],
    2, 'Easy',
    'Investors favor information that supports their existing beliefs and discount contradictory evidence.',
  ),
  q(
    'Representativeness bias involves:',
    ['Ignoring history entirely', 'Over-relying on small or unrepresentative samples', 'Using large datasets correctly', 'Avoiding all patterns'],
    1, 'Moderate',
    'Investors generalize from limited or non-representative data, assuming small samples reflect the whole population.',
  ),
  q(
    'Illusion of control leads to:',
    ['Reduced trading activity', 'Belief in controlling random outcomes', 'Increased risk aversion', 'Better performance'],
    1, 'Moderate',
    'Investors believe they can influence outcomes that are actually governed by chance.',
  ),
  q(
    'Hindsight bias causes investors to:',
    ['Accurately predict the future', 'Believe past events were obviously predictable after they occur', 'Ignore past data', 'Avoid all trading'],
    1, 'Easy',
    'After events occur, they seem inevitable in retrospect — "I knew it all along" thinking.',
  ),
  q(
    'Cognitive dissonance results in:',
    ['Readily accepting new information', 'Ignoring information that conflicts with existing beliefs', 'Increased trading frequency', 'Improved risk reduction'],
    1, 'Moderate',
    'Investors avoid or rationalize away information that contradicts their current beliefs to reduce mental discomfort.',
  ),
  q(
    'Anchoring bias occurs when investors:',
    ['Focus only on current market data', 'Fixate on an irrelevant reference point such as purchase price', 'Consistently ignore past prices', 'Trade very frequently'],
    1, 'Easy',
    'Investors anchor to a reference value (e.g., purchase price or 52-week high) that has no rational bearing on future price.',
  ),
  q(
    'Availability bias leads investors to:',
    ['Use all available information equally', 'Focus on information that is easily recalled', 'Ignore recent market events', 'Avoid all mental shortcuts'],
    1, 'Easy',
    'Easily recalled information — especially vivid or recent events — is perceived as more likely or more important than it actually is.',
  ),
  q(
    'Self-attribution bias results in:',
    ['Blaming oneself equally for gains and losses', 'Attributing success to personal skill and failure to external bad luck', 'Ignoring performance entirely', 'Reducing confidence over time'],
    1, 'Moderate',
    'Investors credit their own skill for successes but blame external factors for failures, reinforcing overconfidence over time.',
  ),
  q(
    'Framing bias occurs when:',
    ['Decisions are independent of how information is presented', 'The way information is presented influences the decision made', 'Only raw data matters to investors', 'Risk is always correctly assessed'],
    1, 'Easy',
    'The presentation or context of information affects decisions even when the underlying facts are identical.',
  ),
  q(
    'Mental accounting refers to:',
    ['Treating all money as perfectly interchangeable', 'Treating money differently depending on its source or intended purpose', 'Ignoring investment gains', 'Ignoring realized losses'],
    1, 'Easy',
    'Investors mentally assign money to separate "accounts" and apply different rules to each — e.g., treating a bonus differently from a salary.',
  ),
  q(
    'Recency bias causes investors to:',
    ['Focus on long-term historical trends', 'Overweight recent events in decision-making', 'Deliberately ignore recent data', 'Reduce trading frequency'],
    1, 'Easy',
    'Recent information dominates decision-making disproportionately, causing investors to extrapolate short-term trends.',
  ),
  q(
    'Outcome bias refers to:',
    ['Judging decisions based on the quality of the process', 'Judging decisions based on their results rather than the logic used', 'Ignoring outcomes completely', 'Avoiding any forecasting'],
    1, 'Moderate',
    'Investors evaluate the quality of a decision by its outcome rather than by whether the decision process was sound at the time.',
  ),
  q(
    'Loss aversion often leads investors to:',
    ['Selling winning positions early', 'Holding losing positions for too long', 'Maintaining perfectly risk-neutral behavior', 'Building well-balanced portfolios'],
    1, 'Easy',
    'To avoid realizing a loss, investors hold onto losing positions far longer than is rational, leading to larger drawdowns.',
  ),
  q(
    'Endowment bias implies that:',
    ['Investors underprice the assets they own', 'Investors overvalue assets simply because they own them', 'Ownership has no effect on valuation', 'All assets are valued equally'],
    1, 'Moderate',
    'Investors assign a higher value to things merely because they own them, making them reluctant to sell even at fair prices.',
  ),
  q(
    'Overconfidence bias leads investors to:',
    ['Trade less frequently than optimal', 'Trade excessively and take on too much risk', 'Actively avoid risk in all situations', 'Make accurately calibrated probability forecasts'],
    1, 'Easy',
    'Overconfident investors believe their judgment and information are superior, resulting in excessive trading and underdiversification.',
  ),
  q(
    'Regret aversion causes investors to:',
    ['Act quickly and decisively', 'Avoid making decisions to prevent future regret', 'Increase risk exposure', 'Ignore losses entirely'],
    1, 'Moderate',
    'Fear of regret leads to inaction — investors avoid decisions where the outcome might cause them to feel regret.',
  ),
  q(
    'Conjunction fallacy involves:',
    ['Correctly assessing joint probabilities', 'Overestimating the probability of unlikely combined events', 'Ignoring probability entirely', 'Relying on large representative samples'],
    1, 'Hard',
    'Investors incorrectly judge a specific detailed scenario as more probable than a broader general one — violating basic probability rules.',
  ),
  q(
    'Self-control bias leads to:',
    ['A focus on long-term investment goals', 'Short-term impulsive decisions at the expense of long-term goals', 'Perfect risk neutrality', 'Disciplined systematic investing'],
    1, 'Moderate',
    'Investors prioritize short-term gratification over long-term financial goals due to lack of self-control.',
  ),
  q(
    'Status quo bias results in:',
    ['Frequent portfolio rebalancing', 'Maintaining current positions even when change would be beneficial', 'Active risk-seeking behavior', 'Excessive trading'],
    1, 'Easy',
    'Investors prefer no change and default to the current state, even when alternatives would improve outcomes.',
  ),
  q(
    'Affinity bias occurs when investors:',
    ['Diversify globally across all asset classes', 'Invest in assets aligned with personal preferences or identity', 'Ignore emotions in decision-making', 'Focus purely on fundamental valuation'],
    1, 'Moderate',
    'Investors choose assets based on personal connections, brand loyalty, or identity rather than objective analysis.',
  ),
  q(
    'Behavioral biases often contribute to:',
    ['Perfectly efficient markets', 'Observable chart patterns and price trends', 'Perfect market predictions', 'Reduced price volatility'],
    1, 'Moderate',
    'Systematic behavioral biases drive price, volume, and sentiment patterns that technical analysts study in charts.',
  ),
  q(
    '"Breakeven mentality" in trading is primarily driven by:',
    ['Purely rational analysis', 'Mental accounting and anchoring to the purchase price', 'Probability theory calculations', 'Correlation-based strategies'],
    1, 'Hard',
    'Investors aim to "get back to even," anchoring to their entry price and treating it as a mental account reference — this creates observable support and resistance levels in charts.',
  ),

  // ── Case Study MCQs ────────────────────────────────────────────────────────

  // Case Study 1: The Losing Position
  q(
    'An investor buys a stock at $50. The stock falls to $35, but the investor refuses to sell, saying "I\'ll sell when it gets back to my purchase price." Which bias BEST explains this behavior?',
    ['Overconfidence', 'Anchoring', 'Availability bias', 'Recency bias'],
    1, 'Moderate',
    'The investor is anchored to the $50 purchase price, which is irrelevant to future price movement.',
  ),
  q(
    'An investor holds a losing stock from $50 down to $35, waiting to break even. This behavior is MOST likely to result in:',
    ['Higher diversification', 'Lower portfolio volatility', 'Larger drawdowns', 'Better market timing'],
    2, 'Moderate',
    'Refusing to sell a losing position increases risk exposure and leads to larger cumulative losses.',
  ),
  q(
    'An investor anchored to a $50 purchase price refuses to sell at $35. Which additional bias is also present?',
    ['Mental accounting', 'Framing bias', 'Outcome bias', 'Self-control bias'],
    0, 'Hard',
    'The investor treats the purchase price as a mental account reference and wants to "break even" within that account.',
  ),
  q(
    'From a technical analysis perspective, investors anchored to their purchase price and selling when price recovers creates:',
    ['Breakout signals', 'Support levels', 'Resistance levels', 'Trend reversals'],
    2, 'Hard',
    'Investors waiting to sell at breakeven create overhead supply at prior entry levels, forming resistance zones.',
  ),

  // Case Study 2: The Overconfident Trader
  q(
    'A trader with strong returns over the past year begins significantly increasing position sizes, believing their skill is the primary driver of success. Which bias is MOST evident?',
    ['Regret aversion', 'Overconfidence', 'Conservatism bias', 'Availability bias'],
    1, 'Easy',
    'The trader attributes success to personal skill rather than recognizing the role of market conditions or luck.',
  ),
  q(
    'A trader increases position sizes dramatically after a strong year, believing their skill is superior. This behavior most likely leads to:',
    ['Undertrading and caution', 'Improved risk-adjusted performance', 'Overtrading and excessive risk-taking', 'Greater diversification'],
    2, 'Easy',
    'Overconfidence leads to excessive position sizing, overtrading, and significantly elevated risk exposure.',
  ),
  q(
    'A trader attributes all recent gains to skill and scales up positions. Which related bias reinforces this overconfidence?',
    ['Self-attribution bias', 'Anchoring bias', 'Framing bias', 'Status quo bias'],
    0, 'Moderate',
    'Self-attribution bias causes the trader to credit all successes to personal skill, further reinforcing overconfidence.',
  ),
  q(
    'Widespread overconfidence among traders in a market most likely leads to:',
    ['Stable price trends', 'Reduced market volatility', 'Extreme price swings and speculation', 'Efficient pricing'],
    2, 'Moderate',
    'Overconfidence drives excessive speculation, creating boom-bust cycles and extreme price swings.',
  ),

  // Case Study 3: Ignoring New Information
  q(
    'An analyst remains bullish on a stock despite clear technical breakdowns and deteriorating price action. Which bias is MOST evident?',
    ['Recency bias', 'Conservatism bias', 'Availability bias', 'Framing bias'],
    1, 'Moderate',
    'The analyst underweights new contradictory information and clings to prior bullish beliefs.',
  ),
  q(
    'An analyst ignores negative price signals and maintains a bullish view. Which additional bias may also apply?',
    ['Confirmation bias', 'Mental accounting', 'Endowment bias', 'Outcome bias'],
    0, 'Moderate',
    'The analyst may be selectively seeking confirming information and dismissing evidence that contradicts the bullish thesis.',
  ),
  q(
    'An analyst who refuses to update views despite clear trend breakdowns is MOST likely to result in:',
    ['Early position exits', 'Lower drawdowns', 'Holding through major trend reversals', 'Increased portfolio diversification'],
    2, 'Moderate',
    'Failure to update beliefs when evidence changes leads to holding losing positions through significant trend reversals.',
  ),
  q(
    'Belief preservation biases such as conservatism and confirmation bias most often lead to which market effect?',
    ['High trading volume and liquidity', 'Reduced trading activity and price momentum', 'Increased market efficiency', 'Higher correlation across assets'],
    1, 'Hard',
    'Investors anchored to prior beliefs trade less frequently, contributing to underreaction to news and price momentum.',
  ),

  // Case Study 4: Emotional Decision Making
  q(
    'A trader, after a stressful personal event, sells a fundamentally sound position despite positive data. Which bias BEST explains this?',
    ['Recency bias', 'Framing bias', 'Anchoring bias', 'Availability bias'],
    1, 'Moderate',
    'External emotional context (personal stress) frames the decision negatively, influencing an otherwise sound investment decision.',
  ),
  q(
    'A trader selling based on personal stress despite positive fundamentals highlights that decisions are:',
    ['Fully rational and optimal', 'Purely data-driven', 'Influenced by irrelevant external information', 'Independent of emotional state'],
    2, 'Easy',
    'Framing bias demonstrates that irrelevant contextual factors — including emotional state — systematically influence decisions.',
  ),
  q(
    'Selling a sound position due to personal emotional distress most likely results in:',
    ['Optimal portfolio decisions', 'Poor portfolio performance from emotion-driven exits', 'Reduced portfolio volatility', 'Improved market timing'],
    1, 'Easy',
    'Emotional decisions that override sound analysis typically lead to suboptimal portfolio outcomes.',
  ),
  q(
    'Selling based on emotional framing rather than data belongs to which category of behavioral bias?',
    ['Belief preservation bias', 'Information processing bias', 'Emotional bias', 'Statistical bias'],
    1, 'Moderate',
    'Framing is classified as an information processing bias — it affects how information is interpreted and acted upon.',
  ),

  // Case Study 5: The Hot Streak Investor
  q(
    'An investor buys stocks that have performed well recently, assuming they will continue to outperform. Which bias is MOST evident?',
    ['Anchoring bias', 'Recency bias', 'Conservatism bias', 'Hindsight bias'],
    1, 'Easy',
    'Recent strong performance dominates the investor\'s outlook, leading to the assumption that the trend will continue.',
  ),
  q(
    'Chasing recently outperforming stocks based on recent returns is MOST likely to result in:',
    ['Buying undervalued assets', 'Buying overvalued assets', 'Reduced portfolio risk', 'Lower portfolio volatility'],
    1, 'Moderate',
    'Chasing recent winners typically means buying after significant price appreciation, leading to overvaluation exposure.',
  ),
  q(
    'An investor buying recent winners due to recency bias may also exhibit which additional bias?',
    ['Outcome bias', 'Illusion of control', 'Endowment bias', 'Status quo bias'],
    0, 'Moderate',
    'Outcome bias leads the investor to judge the quality of the investment based on recent results rather than the underlying analysis.',
  ),
  q(
    'From a market perspective, widespread recency bias and momentum-chasing most likely contributes to:',
    ['Market efficiency and fair pricing', 'Trend persistence and asset price bubbles', 'Reduced price volatility', 'Random and unpredictable pricing'],
    1, 'Moderate',
    'When many investors chase recent performance, it fuels momentum, trend persistence, and eventually asset bubbles.',
  ),

  // Case Study 6: The Break Even Mentality
  q(
    'Investors who bought a stock at higher prices sell aggressively when price returns to their entry level. Which biases are MOST relevant?',
    ['Anchoring and mental accounting', 'Overconfidence and recency bias', 'Availability and framing', 'Status quo and regret aversion'],
    0, 'Hard',
    'Investors anchor to their purchase price as a reference point and mentally account for the loss, driving selling at breakeven.',
  ),
  q(
    'Mass selling by investors at their breakeven price level most directly creates:',
    ['Price support levels', 'Price resistance levels', 'Trend acceleration', 'Lower trading volume'],
    1, 'Moderate',
    'Concentrated selling at prior entry prices creates an excess of supply at that level, forming technical resistance.',
  ),
  q(
    'The pattern of investors creating selling pressure at their prior entry price is known in technical analysis as:',
    ['Capitulation', 'Overhead supply', 'Price momentum', 'Statistical arbitrage'],
    1, 'Moderate',
    'Overhead supply describes the selling pressure created by investors who bought at higher prices and are waiting to exit at breakeven.',
  ),
  q(
    'Why is selling at breakeven considered an irrational behavior?',
    ['Because price always reflects past decisions', 'Because the purchase price has no bearing on future value', 'Because markets are always efficient', 'Because losses are economically irrelevant'],
    1, 'Hard',
    'Future price movement is entirely independent of any individual\'s entry price. The purchase price is a sunk cost.',
  ),

  // Case Study 7: Refusing to Sell Losers
  q(
    'An investor holds a losing position despite clearly better investment opportunities elsewhere. Which bias BEST explains this?',
    ['Endowment bias', 'Regret aversion', 'Availability bias', 'Outcome bias'],
    1, 'Moderate',
    'Fear of regret — specifically regret from crystallizing a loss — prevents the investor from making a rational switch.',
  ),
  q(
    'Refusing to sell a losing position despite better alternatives primarily leads to:',
    ['Efficient capital allocation', 'Significant opportunity cost', 'Reduced portfolio risk', 'Higher long-term returns'],
    1, 'Moderate',
    'Capital remains trapped in a poor investment when it could be deployed more productively elsewhere.',
  ),
  q(
    'An investor refuses to sell a losing position due to regret aversion. Which emotional bias is also reinforcing this behavior?',
    ['Loss aversion', 'Anchoring bias', 'Framing bias', 'Representativeness bias'],
    0, 'Moderate',
    'Loss aversion makes the pain of realizing the loss feel disproportionately large, reinforcing the refusal to sell.',
  ),
  q(
    'The combined effect of regret aversion and loss aversion when holding losing positions typically results in:',
    ['Selling winners early and holding losers too long', 'Holding both winners and losers equally', 'Building well-balanced portfolios', 'Making consistently optimal decisions'],
    0, 'Easy',
    'This is the classic disposition effect: investors sell winners prematurely to lock in gains while holding losers to avoid regret.',
  ),

  // Case Study 8: Market Panic and Capitulation
  q(
    'During a severe market crash, investors panic and sell aggressively near market lows. Which bias BEST explains this behavior?',
    ['Overconfidence bias', 'Loss aversion', 'Anchoring bias', 'Availability bias'],
    1, 'Easy',
    'The intense emotional pain of mounting losses triggers panic selling — a direct consequence of loss aversion overriding rational analysis.',
  ),
  q(
    'Mass panic selling near market lows with extreme high volume is MOST associated with which market event?',
    ['Market tops with euphoria', 'Market bottoms and capitulation', 'Stable trending markets', 'Low volatility consolidation'],
    1, 'Moderate',
    'Capitulation — exhausted sellers driving prices to extremes on high volume — typically marks market bottoms, as described in behavioral analysis of emotional biases.',
  ),
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('Seeding: Behavioral Finance — PDF MCQs\n');

  const chapter = await prisma.chapter.findFirst({
    where: { slug: 'unit-vii-behavioral-finance', isDeleted: false },
  });

  if (!chapter) {
    console.error('ERROR: Chapter "unit-vii-behavioral-finance" not found. Run seed-cmt-level1.mjs first.');
    process.exit(1);
  }

  const subtopic = await prisma.subtopic.findFirst({
    where: { chapterId: chapter.id, slug: '71-behavioral-finance', isDeleted: false },
  });

  if (!subtopic) {
    console.error('ERROR: Subtopic "71-behavioral-finance" not found under Unit VII.');
    process.exit(1);
  }

  console.log(`Chapter  : ${chapter.title}`);
  console.log(`Subtopic : ${subtopic.title}`);
  console.log(`Total Qs : ${QUESTIONS.length}\n`);

  let created = 0;
  let skipped = 0;

  for (const qdata of QUESTIONS) {
    const promptText = qdata.promptJson.content[0]?.content[0]?.text ?? '';

    // Idempotent: skip if identical question already exists
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

  console.log(`✓ Questions created : ${created}`);
  console.log(`  Questions skipped : ${skipped} (already exist)`);
  console.log('\nDone!');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
