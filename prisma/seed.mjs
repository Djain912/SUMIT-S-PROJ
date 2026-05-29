import { readFileSync } from 'node:fs';
import { PrismaClient } from '@prisma/client';
import { createClient } from '@supabase/supabase-js';

const prisma = new PrismaClient();

const SAMPLE_ADMIN = {
  email: 'admin@financeprep.com',
  password: 'Admin@123456',
  fullName: 'Super Admin',
  role: 'ADMIN',
};

const SAMPLE_USER = {
  email: 'student@financeprep.com',
  password: 'Student@123456',
  fullName: 'Sample Learner',
  role: 'USER',
};

function loadEnvFile() {
  const content = readFileSync('.env', 'utf8');

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const rawValue = trimmed.slice(separatorIndex + 1).trim();
    const value = rawValue.replace(/^["']|["']$/g, '');

    if (value || !process.env[key]) {
      process.env[key] = value;
    }
  }
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getServiceRoleKey() {
  return (
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_SERVICE_KEY ??
    process.env.SERVICE_ROLE_KEY ??
    ''
  );
}

function emptyDoc() {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  };
}

async function recreateAuthUser(supabase, account) {
  const { data: existingUsers, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });

  if (listError) {
    throw listError;
  }

  const existingUser = existingUsers.users.find(
    (user) => user.email?.toLowerCase() === account.email.toLowerCase(),
  );

  if (existingUser) {
    const { error: deleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
    if (deleteError) {
      throw deleteError;
    }
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email: account.email,
    password: account.password,
    email_confirm: true,
    user_metadata: {
      full_name: account.fullName,
    },
  });

  if (error) {
    throw error;
  }

  if (!data.user) {
    throw new Error(`Supabase did not return a user for ${account.email}`);
  }

  return data.user;
}

async function cleanAppDatabase() {
  await prisma.$transaction([
    prisma.quizAttemptItem.deleteMany(),
    prisma.quizAttempt.deleteMany(),
    prisma.questionOption.deleteMany(),
    prisma.question.deleteMany(),
    prisma.note.deleteMany(),
    prisma.mediaAsset.deleteMany(),
    prisma.subtopic.deleteMany(),
    prisma.chapter.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function seedUsers(adminAuthUser, learnerAuthUser) {
  const [adminUser, learnerUser] = await Promise.all([
    prisma.user.create({
      data: {
        supabaseUserId: adminAuthUser.id,
        email: SAMPLE_ADMIN.email,
        fullName: SAMPLE_ADMIN.fullName,
        role: 'ADMIN',
      },
    }),
    prisma.user.create({
      data: {
        supabaseUserId: learnerAuthUser.id,
        email: SAMPLE_USER.email,
        fullName: SAMPLE_USER.fullName,
        role: 'USER',
      },
    }),
  ]);

  return { adminUser, learnerUser };
}

async function seedSampleContent(adminUser) {
  const chaptersData = [
    {
      level: 'LEVEL_1',
      title: 'Market Foundations',
      slug: 'market-foundations',
      description: 'Core market concepts including trends, price action, and market structure for Level 1 learners.',
      orderIndex: 1,
      subtopics: [
        {
          title: 'Trend and Price Action',
          slug: 'trend-and-price-action',
          description: 'Understanding basic trend structure and price behavior patterns.',
          orderIndex: 1,
          notes: [
            {
              title: 'What is a Trend?',
              contentHtml: `<h2>Understanding Trends in Financial Markets</h2>
<p>A trend represents the general direction in which a market or security is moving. Traders and analysts use trends to make decisions about when to enter or exit positions.</p>

<h3>Types of Trends</h3>
<p><strong>Uptrend:</strong> Characterized by successively higher highs and higher lows. This indicates bullish sentiment and buying pressure.</p>
<p><strong>Downtrend:</strong> Characterized by successively lower highs and lower lows. This indicates bearish sentiment and selling pressure.</p>
<p><strong>Sideways/Horizontal Trend:</strong> Price moves within a defined range without making significant higher highs or lower lows.</p>

<h3>Key Principles</h3>
<ul>
<li>The trend is your friend - trade in the direction of the trend</li>
<li>Higher timeframe trends often override lower timeframe trends</li>
<li>Trends can exist on multiple timeframes simultaneously</li>
<li>Trend changes often occur after climax moments or exhaustion</li>
</ul>`,
              orderIndex: 1,
            },
            {
              title: 'Support and Resistance',
              contentHtml: `<h2>Support and Resistance Levels</h2>
<p>Support and resistance levels are price zones where buying or selling pressure emerges, causing price to reverse or pause.</p>

<h3>Support</h3>
<p>A support level is a price area where demand exceeds supply, preventing further price decline. Key characteristics:</p>
<ul>
<li>Usually testing previous lows</li>
<li>Attracts buying interest from buyers who missed the first move</li>
<li>Can be breached but often holds multiple times</li>
</ul>

<h3>Resistance</h3>
<p>A resistance level is a price area where supply exceeds demand, preventing further price advance.</p>
<ul>
<li>Usually testing previous highs</li>
<li>Attracts selling interest from profit-taking traders</li>
<li>When broken, often converts to support</li>
</ul>

<h3>Trading Applications</h3>
<p>Traders use support and resistance to identify entry points, stop-loss locations, and profit targets. When price approaches these levels, watch for price action signals confirming the bounce or breakout.</p>`,
              orderIndex: 2,
            },
          ],
          questions: [
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'EASY',
              promptHtml: 'Which pattern best describes an uptrend?',
              explanation: 'An uptrend is characterized by higher highs and higher lows, showing buying pressure and bullish momentum.',
              options: [
                { text: 'Higher highs and higher lows', isCorrect: true },
                { text: 'Lower highs and lower lows', isCorrect: false },
                { text: 'Flat prices with no movement', isCorrect: false },
                { text: 'Random price gaps only', isCorrect: false },
              ],
            },
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'EASY',
              promptHtml: 'What happens when a support level is breached?',
              explanation: 'When support is breached, it often converts to resistance as previous buyers become sellers.',
              options: [
                { text: 'It becomes a resistance level', isCorrect: true },
                { text: 'The market closes permanently', isCorrect: false },
                { text: 'Trading volume decreases to zero', isCorrect: false },
                { text: 'It automatically recovers within hours', isCorrect: false },
              ],
            },
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'MEDIUM',
              promptHtml: 'What is the key characteristic of a strong support level?',
              explanation: 'Strong support levels are tested multiple times without being breached, indicating strong demand at that price level.',
              options: [
                { text: 'It is tested multiple times without breaking', isCorrect: true },
                { text: 'It only appears on daily charts', isCorrect: false },
                { text: 'It never gets tested by price', isCorrect: false },
                { text: 'It always breaks on the first test', isCorrect: false },
              ],
            },
          ],
        },
        {
          title: 'Candlestick Patterns',
          slug: 'candlestick-patterns',
          description: 'Reading price action through candlestick formations.',
          orderIndex: 2,
          notes: [
            {
              title: 'Introduction to Candlesticks',
              contentHtml: `<h2>Candlestick Chart Reading</h2>
<p>Candlestick charts originated in Japan in the 18th century and now dominate technical analysis worldwide.</p>

<h3>The Anatomy of a Candle</h3>
<ul>
<li><strong>Body:</strong> The difference between open and close prices</li>
<li><strong>Wick/Shadow:</strong> The high and low prices reached</li>
<li><strong>Green/White candle:</strong> Close higher than open (bullish)</li>
<li><strong>Red/Black candle:</strong> Close lower than open (bearish)</li>
</ul>

<h3>Why Candlesticks Matter</h3>
<p>Candlesticks show the battle between bulls and bears at each time period. The length and position of wicks, along with body size, reveal market sentiment and potential turning points.</p>`,
              orderIndex: 1,
            },
          ],
          questions: [
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'EASY',
              promptHtml: 'What does a green (white) candle indicate?',
              explanation: 'A green candle shows the close price is higher than the open price, indicating bullish movement.',
              options: [
                { text: 'Close was higher than open', isCorrect: true },
                { text: 'Close was lower than open', isCorrect: false },
                { text: 'High and low were the same', isCorrect: false },
                { text: 'Trading was halted', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      level: 'LEVEL_1',
      title: 'Technical Analysis Tools',
      slug: 'technical-analysis-tools',
      description: 'Essential technical indicators and analysis tools for trading.',
      orderIndex: 2,
      subtopics: [
        {
          title: 'Moving Averages',
          slug: 'moving-averages',
          description: 'Understanding and applying moving averages in trading.',
          orderIndex: 1,
          notes: [
            {
              title: 'Simple vs Exponential Moving Averages',
              contentHtml: `<h2>Moving Averages Explained</h2>
<p>Moving averages smooth out price data to reveal trends and potential support/resistance levels.</p>

<h3>Simple Moving Average (SMA)</h3>
<p>Calculates the arithmetic mean of prices over a specific period.</p>
<ul>
<li>Equal weight to all prices in the period</li>
<li>Slower to respond to recent price changes</li>
<li>Good for identifying long-term trends</li>
</ul>

<h3>Exponential Moving Average (EMA)</h3>
<p>Places more weight on recent prices, making it more responsive to price changes.</p>
<ul>
<li>Reacts faster to price movements</li>
<li>Preferred by short-term traders</li>
<li>More volatile than SMA</li>
</ul>

<h3>Common Period Settings</h3>
<ul>
<li>9-period: Short-term trend</li>
<li>21-period: Medium-term trend</li>
<li>50-period: Long-term trend</li>
<li>200-period: Major trend confirmation</li>
</ul>`,
              orderIndex: 1,
            },
          ],
          questions: [
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'EASY',
              promptHtml: 'What is the main difference between SMA and EMA?',
              explanation: 'EMA gives more weight to recent prices, making it more responsive to price changes than SMA.',
              options: [
                { text: 'EMA reacts faster to price changes', isCorrect: true },
                { text: 'SMA is always higher than EMA', isCorrect: false },
                { text: 'They calculate different things entirely', isCorrect: false },
                { text: 'EMA uses less data than SMA', isCorrect: false },
              ],
            },
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'MEDIUM',
              promptHtml: 'Which moving average period is commonly used for long-term trend identification?',
              explanation: 'The 50-period and 200-period moving averages are commonly used to identify long-term trends.',
              options: [
                { text: '50-period and 200-period', isCorrect: true },
                { text: '5-period and 9-period', isCorrect: false },
                { text: '1-period and 2-period', isCorrect: false },
                { text: '500-period', isCorrect: false },
              ],
            },
          ],
        },
        {
          title: 'RSI Indicator',
          slug: 'rsi-indicator',
          description: 'Relative Strength Index for measuring momentum.',
          orderIndex: 2,
          notes: [
            {
              title: 'Understanding RSI',
              contentHtml: `<h2>Relative Strength Index (RSI)</h2>
<p>The RSI is a momentum oscillator that measures the speed and change of price movements on a scale of 0 to 100.</p>

<h3>RSI Formula</h3>
<p>RSI = 100 - (100 / (1 + RS))</p>
<p>Where RS = Average Gain / Average Loss over the period</p>

<h3>Standard Settings</h3>
<ul>
<li>Default period: 14</li>
<li>Overbought: Above 70</li>
<li>Oversold: Below 30</li>
<li>Neutral: Between 30-70</li>
</ul>

<h3>How to Use RSI</h3>
<ul>
<li><strong>Overbought (above 70):</strong> Potential reversal or pullback expected</li>
<li><strong>Oversold (below 30):</strong> Potential bounce or recovery expected</li>
<li><strong>Divergence:</strong> Price makes new highs but RSI doesn't - bearish divergence</li>
<li><strong>RSI Divergence:</strong> Price makes new lows but RSI doesn't - bullish divergence</li>
</ul>

<h3>Important Notes</h3>
<p>RSI can remain in overbought or oversold territory for extended periods during strong trends. Always confirm signals with price action and other indicators.</p>`,
              orderIndex: 1,
            },
          ],
          questions: [
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'EASY',
              promptHtml: 'What RSI level typically indicates overbought conditions?',
              explanation: 'RSI above 70 is traditionally considered overbought, suggesting potential reversal or pullback.',
              options: [
                { text: 'Above 70', isCorrect: true },
                { text: 'Below 30', isCorrect: false },
                { text: 'At 50', isCorrect: false },
                { text: 'At 0', isCorrect: false },
              ],
            },
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'MEDIUM',
              promptHtml: 'What does bullish divergence refer to in RSI?',
              explanation: 'Bullish divergence occurs when price makes lower lows but RSI makes higher lows, suggesting upward momentum.',
              options: [
                { text: 'Price makes lower lows while RSI makes higher lows', isCorrect: true },
                { text: 'Both price and RSI make lower lows', isCorrect: false },
                { text: 'RSI stays above 70', isCorrect: false },
                { text: 'RSI stays below 30', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      level: 'LEVEL_1',
      title: 'Risk Management',
      slug: 'risk-management',
      description: 'Essential risk management and position sizing concepts.',
      orderIndex: 3,
      subtopics: [
        {
          title: 'Position Sizing',
          slug: 'position-sizing',
          description: 'How to calculate proper position size for trades.',
          orderIndex: 1,
          notes: [
            {
              title: 'Position Sizing Fundamentals',
              contentHtml: `<h2>Position Sizing Explained</h2>
<p>Position sizing determines how much capital to allocate to each trade. Proper position sizing is crucial for long-term trading success.</p>

<h3>Why Position Sizing Matters</h3>
<ul>
<li>Controls risk per trade</li>
<li>Prevents catastrophic losses</li>
<li>Allows for consistent risk-reward ratios</li>
<li>Enables trading longevity</li>
</ul>

<h3>Position Sizing Formula</h3>
<p>Position Size = (Account Risk Amount) / (Stop Loss in Pips × Pip Value)</p>

<h3>Risk Per Trade Guidelines</h3>
<ul>
<li>Conservative: 1-2% of account capital</li>
<li>Moderate: 2-3% of account capital</li>
<li>Aggressive: 3-5% of account capital</li>
</ul>

<h3>Common Mistakes</h3>
<ul>
<li>Risking too much per trade</li>
<li>Not adjusting position size after losses</li>
<li>Ignoring account size changes</li>
<li>Over-leveraging positions</li>
</ul>`,
              orderIndex: 1,
            },
          ],
          questions: [
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'EASY',
              promptHtml: 'What is the recommended risk per trade for conservative traders?',
              explanation: 'Conservative traders typically risk 1-2% of their account capital per trade to minimize drawdowns.',
              options: [
                { text: '1-2% of account capital', isCorrect: true },
                { text: '50% of account capital', isCorrect: false },
                { text: 'All available capital', isCorrect: false },
                { text: '10% of account capital', isCorrect: false },
              ],
            },
          ],
        },
        {
          title: 'Risk-Reward Ratio',
          slug: 'risk-reward-ratio',
          description: 'Understanding risk-reward ratios for profitable trading.',
          orderIndex: 2,
          notes: [
            {
              title: 'Risk-Reward Fundamentals',
              contentHtml: `<h2>Risk-Reward Ratio</h2>
<p>The risk-reward ratio compares the potential profit to potential loss for each trade.</p>

<h3>Understanding the Ratio</h3>
<p>A 1:2 risk-reward ratio means risking $1 to potentially make $2.</p>

<h3>Minimum Requirements</h3>
<ul>
<li>Minimum ratio: 1:1 to break even</li>
<li>Recommended minimum: 1:2 for consistent profits</li>
<li>Preferred: 1:3 or higher for higher probability wins</li>
</ul>

<h3>Win Rate vs Risk-Reward</h3>
<p>You can be profitable with a low win rate if your risk-reward is high enough.</p>
<ul>
<li>50% win rate + 1:1 = break even</li>
<li>40% win rate + 1:2 = profitable</li>
<li>30% win rate + 1:3 = highly profitable</li>
</ul>

<h3>Practical Application</h3>
<p>Always calculate your risk-reward before entering a trade. If the potential reward doesn't justify the risk, don't take the trade.</p>`,
              orderIndex: 1,
            },
          ],
          questions: [
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'MEDIUM',
              promptHtml: 'If you have a 40% win rate, what minimum risk-reward ratio do you need to be profitable?',
              explanation: 'With a 40% win rate, a 1:2 risk-reward ratio allows for profitability (40% win × 2 reward > 60% loss × 1 risk).',
              options: [
                { text: '1:2 or higher', isCorrect: true },
                { text: '1:0.5', isCorrect: false },
                { text: '1:1', isCorrect: false },
                { text: '1:0', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      level: 'LEVEL_2',
      title: 'Advanced Chart Patterns',
      slug: 'advanced-chart-patterns',
      description: 'Complex chart patterns for better trade entries.',
      orderIndex: 4,
      subtopics: [
        {
          title: 'Chart Pattern Recognition',
          slug: 'chart-pattern-recognition',
          description: 'Identifying and trading key chart patterns.',
          orderIndex: 1,
          notes: [
            {
              title: 'Continuation Patterns',
              contentHtml: `<h2>Chart Patterns: Continuation vs Reversal</h2>
<p>Chart patterns help traders predict future price movements based on historical price action.</p>

<h3>Continuation Patterns</h3>
<p>These patterns suggest the current trend will continue:</p>
<ul>
<li><strong>Flags:</strong> Small rectangular consolidations after strong moves</li>
<li><strong>Pennants:</strong> Small triangular consolidations</li>
<li><strong>Triangles:</strong> Ascending, descending, and symmetrical</li>
</ul>

<h3>Reversal Patterns</h3>
<p>These patterns suggest trend changes:</p>
<ul>
<li><strong>Head and Shoulders:</strong> Top reversal signal</li>
<li><strong>Double Top/Bottom:</strong> Classic reversal patterns</li>
<li><strong>Rounding Bottom:</strong> Slow trend reversal</li>
</ul>

<h3>Trading Patterns</h3>
<ul>
<li>Wait for pattern completion (breakout)</li>
<li>Confirm with volume analysis</li>
<li>Use appropriate stop-loss placement</li>
<li>Measure target using pattern height</li>
</ul>`,
              orderIndex: 1,
            },
          ],
          questions: [
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'EASY',
              promptHtml: 'What type of pattern is a flag considered?',
              explanation: 'A flag is a continuation pattern that typically breaks in the direction of the prior move.',
              options: [
                { text: 'Continuation pattern', isCorrect: true },
                { text: 'Reversal pattern', isCorrect: false },
                { text: 'Volatility pattern', isCorrect: false },
                { text: 'Volume pattern', isCorrect: false },
              ],
            },
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'MEDIUM',
              promptHtml: 'Which pattern is typically a reversal signal?',
              explanation: 'Head and shoulders is a classic reversal pattern indicating the trend may be ending.',
              options: [
                { text: 'Head and Shoulders', isCorrect: true },
                { text: 'Bull Flag', isCorrect: false },
                { text: 'Ascending Triangle', isCorrect: false },
                { text: 'Pennant', isCorrect: false },
              ],
            },
          ],
        },
        {
          title: 'Volume Analysis',
          slug: 'volume-analysis',
          description: 'Using volume to confirm price movements.',
          orderIndex: 2,
          notes: [
            {
              title: 'Volume in Trading',
              contentHtml: `<h2>Volume Analysis</h2>
<p>Volume represents the number of shares or contracts traded during a given period. It's a crucial confirming indicator.</p>

<h3>Volume Principles</h3>
<ul>
<li><strong>High volume confirms:</strong> Strong conviction in price move</li>
<li><strong>Low volume warns:</strong> Potential false move</li>
<li><strong>Volume precedes price:</strong> Changes in volume often predict price changes</li>
</ul>

<h3>Volume Patterns</h3>
<ul>
<li><strong>High Volume Breakout:</strong> Strong confirmation of breakout</li>
<li><strong>Low Volume Pullback:</strong> Likely to resume in original direction</li>
<li><strong>Volume Climax:</strong> Often signals exhaustion and potential reversal</li>
</ul>

<h3>Practical Tips</h3>
<p>Always confirm significant price moves with volume. A breakout on low volume is often false and may reverse quickly.</p>`,
              orderIndex: 1,
            },
          ],
          questions: [
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'EASY',
              promptHtml: 'What does high volume during a price breakout typically indicate?',
              explanation: 'High volume during a breakout indicates strong conviction and higher probability the move will sustain.',
              options: [
                { text: 'Strong conviction in the move', isCorrect: true },
                { text: 'Weak market sentiment', isCorrect: false },
                { text: 'The breakout will fail', isCorrect: false },
                { text: 'Trading should be avoided', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      level: 'LEVEL_2',
      title: 'Trading Psychology',
      slug: 'trading-psychology',
      description: 'Mental and emotional aspects of trading.',
      orderIndex: 5,
      subtopics: [
        {
          title: 'Trading Emotions',
          slug: 'trading-emotions',
          description: 'Managing emotions in trading decisions.',
          orderIndex: 1,
          notes: [
            {
              title: 'Emotional Trading',
              contentHtml: `<h2>Trading Psychology</h2>
<p>Emotional control is what separates successful traders from those who fail. Managing emotions is crucial for consistent performance.</p>

<h3>Common Trading Emotions</h3>
<ul>
<li><strong>Fear:</strong> Missing trades, taking losses, leaving profits on table</li>
<li><strong>Greed:</strong> Overtrading, oversized positions, revenge trading</li>
<li><strong>Hope:</strong> Holding losing positions hoping for recovery</li>
<li><strong>FOMO:</strong> Chasing price after missing entry</li>
</ul>

<h3>Managing Emotions</h3>
<ul>
<li>Follow your trading plan strictly</li>
<li>Accept losses as part of trading</li>
<li>Never risk more than planned</li>
<li>Take breaks after consecutive losses</li>
<li>Keep a trading journal</li>
</ul>

<h3>Building Discipline</h3>
<p>Discipline comes from having a clear plan and following it consistently. Every trade should have predefined entry, exit, and stop-loss levels.</p>`,
              orderIndex: 1,
            },
          ],
          questions: [
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'EASY',
              promptHtml: 'What is FOMO in trading?',
              explanation: 'FOMO stands for Fear Of Missing Out, causing traders to chase price after missing the original entry opportunity.',
              options: [
                { text: 'Fear Of Missing Out', isCorrect: true },
                { text: 'Fear Of Market Orders', isCorrect: false },
                { text: 'Finding Optimal Market Opportunity', isCorrect: false },
                { text: 'Following Only Main Orientations', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
    {
      level: 'LEVEL_2',
      title: 'Market Structure',
      slug: 'market-structure',
      description: 'Understanding how markets are structured and operate.',
      orderIndex: 6,
      subtopics: [
        {
          title: 'Market Participants',
          slug: 'market-participants',
          description: 'Types ofmarket participants and their roles.',
          orderIndex: 1,
          notes: [
            {
              title: 'Types of Market Participants',
              contentHtml: `<h2>Market Participants</h2>
<p>Understanding who participates in markets helps predict price movements and market behavior.</p>

<h3>Major Participants</h3>
<ul>
<li><strong>Retail Traders:</strong> Individual traders using personal accounts</li>
<li><strong>Hedge Funds:</strong> Professional money managers with large capital</li>
<li><strong> institutional Investors:</strong> Banks, pension funds, mutual funds</li>
<li><strong>Market Makers:</strong> Provide liquidity to markets</li>
<li><strong>Central Banks:</strong> Influence markets through policy</li>
</ul>

<h3>How Each Group Trades</h3>
<ul>
<li>Retail: Smaller positions, shorter timeframes</li>
<li>Hedge Funds: Large positions, various strategies</li>
<li>Institutions: Very large positions, long-term focus</li>
<li>Market Makers: Profit from spread, provide liquidity</li>
</ul>

<h3>Why This Matters</h3>
<p>Understanding who is buying or selling helps anticipate market moves. Large participants leave traces in price and volume.</p>`,
              orderIndex: 1,
            },
          ],
          questions: [
            {
              questionType: 'SINGLE_CHOICE',
              difficulty: 'EASY',
              promptHtml: 'What is the primary role of market makers?',
              explanation: 'Market makers provide liquidity to markets and profit from the bid-ask spread.',
              options: [
                { text: 'Provide liquidity', isCorrect: true },
                { text: 'Manipulate prices', isCorrect: false },
                { text: 'Predict market crashes', isCorrect: false },
                { text: 'Set interest rates', isCorrect: false },
              ],
            },
          ],
        },
      ],
    },
  ];

  for (const chapterData of chaptersData) {
    const { subtopics, ...chapterInfo } = chapterData;

    const chapter = await prisma.chapter.create({
      data: {
        level: chapterData.level,
        title: chapterInfo.title,
        slug: chapterInfo.slug,
        description: chapterInfo.description,
        orderIndex: chapterInfo.orderIndex,
        isPublished: true,
      },
    });

    for (const subtopicData of subtopics) {
      const { notes, questions, ...subtopicInfo } = subtopicData;

      const subtopic = await prisma.subtopic.create({
        data: {
          chapterId: chapter.id,
          title: subtopicData.title,
          slug: subtopicData.slug,
          description: subtopicData.description,
          orderIndex: subtopicData.orderIndex,
          isPublished: true,
        },
      });

      for (const note of notes) {
        await prisma.note.create({
          data: {
            subtopicId: subtopic.id,
            title: note.title,
            contentJson: emptyDoc(),
            contentHtml: note.contentHtml,
            orderIndex: note.orderIndex,
            isPublished: true,
            createdById: adminUser.id,
            updatedById: adminUser.id,
          },
        });
      }

      for (const question of questions) {
        await prisma.question.create({
          data: {
            level: chapterData.level,
            chapter: { connect: { id: chapter.id } },
            subtopic: { connect: { id: subtopic.id } },
            promptJson: emptyDoc(),
            explanationJson: emptyDoc(),
            questionType: question.questionType,
            difficulty: question.difficulty,
            isPublished: true,
            createdBy: { connect: { id: adminUser.id } },
            updatedBy: { connect: { id: adminUser.id } },
            options: {
              create: question.options.map((opt, idx) => ({
                contentJson: { text: opt.text },
                isCorrect: opt.isCorrect,
                orderIndex: idx,
              })),
            },
          },
        });
      }
    }
  }
}

async function main() {
  loadEnvFile();

  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getServiceRoleKey();

  if (!serviceRoleKey) {
    throw new Error(
      [
        'Missing SUPABASE_SERVICE_ROLE_KEY in .env.',
        'I can clean and seed Prisma data only after this key is available, because login credentials must be created in Supabase Auth.',
        'Get it from Supabase Dashboard -> Project Settings -> API -> service_role key.',
      ].join(' '),
    );
  }

  if (process.env.SUPER_ADMIN_EMAIL?.toLowerCase() !== SAMPLE_ADMIN.email) {
    throw new Error(
      `Set SUPER_ADMIN_EMAIL="${SAMPLE_ADMIN.email}" in .env before seeding so the seeded admin can access /admin.`,
    );
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const [adminAuthUser, learnerAuthUser] = await Promise.all([
    recreateAuthUser(supabase, SAMPLE_ADMIN),
    recreateAuthUser(supabase, SAMPLE_USER),
  ]);

  await cleanAppDatabase();
  const { adminUser } = await seedUsers(adminAuthUser, learnerAuthUser);
  await seedSampleContent(adminUser);

  console.log('\nDatabase reset and sample data created.\n');
  console.log('Super Admin');
  console.log(`  Email:    ${SAMPLE_ADMIN.email}`);
  console.log(`  Password: ${SAMPLE_ADMIN.password}`);
  console.log('  Login:    /admin/login\n');
  console.log('Sample Learner');
  console.log(`  Email:    ${SAMPLE_USER.email}`);
  console.log(`  Password: ${SAMPLE_USER.password}`);
  console.log('  Login:    /sign-in\n');
}

main()
  .catch((error) => {
    console.error('\nSeed failed:');
    console.error(error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });