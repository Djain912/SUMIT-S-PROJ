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
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 120);
}

// Empty TipTap-compatible JSON doc for note shell
const emptyDoc = { type: 'doc', content: [] };

const CMT_LEVEL_1 = [
  {
    unitNum: 'I',
    orderIndex: 1,
    title: 'Theory and History of Technical Analysis',
    subtopics: [
      {
        num: '1.1', orderIndex: 1, title: 'A Brief History of Technical Analysis',
        topics: [
          'Mileposts in Technical Analysis',
          'MTA: Bringing Recognition to the Practice of Technical Analysis',
          '9/11: A Turning Point for the MTA',
          'Regulatory Recognition',
          'From MTA to CMT: Today\'s CMT Association',
        ],
      },
      {
        num: '1.2', orderIndex: 2, title: 'The Dow Theory',
        topics: [
          'Basic Tenets',
          'Dow Theory Remains Relevant to This Day',
        ],
      },
      {
        num: '1.3', orderIndex: 3, title: 'Markets, Instruments, Data and the Technical Analyst',
        topics: [
          'Behind the Scenes of Market Data',
        ],
      },
      {
        num: '1.4', orderIndex: 4, title: 'The Opportunity of the Efficient Markets Hypothesis',
        topics: [
          'The Opportunity of the Efficient Markets Hypothesis',
          'Three Forms of the EMH',
          'Challenges to the EMH',
          'The Nature of Randomness and the Arcsine Law',
          'Additional Challenges and Alternatives to the EMH',
          'Using Technical Analysis Within a Randomized Market',
          "Fama's Revision of the Three Forms",
          'Conclusion',
        ],
      },
      {
        num: '1.5', orderIndex: 5, title: 'The Fibonacci Sequence and The Golden Ratio',
        topics: [
          'The Man',
          'The Numbers and Sequence',
          'The Golden Ratio',
          'Fibonacci Retracements',
          'Fibonacci Extensions',
          'Final Thoughts',
        ],
      },
    ],
  },
  {
    unitNum: 'II',
    orderIndex: 2,
    title: 'Charts: Market Price Data',
    subtopics: [
      {
        num: '2.1', orderIndex: 1, title: 'An Overview of Charting',
        topics: [
          'A Brief History of Charting',
          'Line Charts',
          'Bar Charts',
          'Candlestick Charts',
        ],
      },
      {
        num: '2.2', orderIndex: 2, title: 'The X Axis',
        topics: [
          'Time-Based Charting',
          'A Closer Look at Time-Based Data Intervals',
          'Activity-Based Intervals',
          'Price-Based Intervals',
        ],
      },
      {
        num: '2.3', orderIndex: 3, title: 'The Y Axis',
        topics: [
          'Why Does the Scale of the Y-Axis Matter?',
          'Understanding Arithmetic vs. Logarithmic Scaling',
          'When Not to Use Semi-Log Charts',
        ],
      },
      {
        num: '2.4', orderIndex: 4, title: 'Charting Volume and Open Interest',
        topics: [
          'Volume',
          'Open Interest',
        ],
      },
    ],
  },
  {
    unitNum: 'III',
    orderIndex: 3,
    title: 'Trend Analysis',
    subtopics: [
      {
        num: '3.1', orderIndex: 1, title: 'Trend Primer: What is a Trend',
        topics: [
          'Trends',
          'Primary Price Movements and the Fractal Nature of Trends',
          'Support and Resistance',
        ],
      },
      {
        num: '3.2', orderIndex: 2, title: "Trend Primer: A Trend's Four Phases",
        topics: [
          'Market Structure',
        ],
      },
      {
        num: '3.3', orderIndex: 3, title: 'Trend Primer: Trend Identification and Following',
        topics: [
          'Why Trends Are Important',
          'Trend Identification',
        ],
      },
      {
        num: '3.4', orderIndex: 4, title: 'Introduction to Volume Analysis',
        topics: [
          'Volume Terminology',
          'Importance of Volume in Market Analysis',
        ],
      },
      {
        num: '3.5', orderIndex: 5, title: 'Volume, Open Interest, and Price',
        topics: [
          'Decoding Volume',
          'VWAP: Volume-Weighted Average Price',
          'Volume and Open Interest in the Futures Markets',
          'Seasonal Volume Tendencies',
        ],
      },
      {
        num: '3.6', orderIndex: 6, title: 'Market Internals',
        topics: [
          'Introduction — What Are Market Internals?',
        ],
      },
    ],
  },
  {
    unitNum: 'IV',
    orderIndex: 4,
    title: 'Chart Pattern Analysis',
    subtopics: [
      {
        num: '4.1', orderIndex: 1, title: 'Classical Chart Patterns',
        topics: [
          'Reversal Chart Patterns',
          'Continuation Chart Patterns',
          'Behavior and Emotions Behind Chart Patterns',
          'Support and Resistance',
          'Short-Term Patterns',
          'Gaps',
        ],
      },
      {
        num: '4.2', orderIndex: 2, title: 'Introduction to Candlesticks',
        topics: [
          'Introduction to Candlestick Charts',
          'Construction of Candlestick Charts: The Four Key Data Points',
          'Time Frames: The Versatility of Candlestick Charts',
          'Interpreting Candlesticks: Insights into Market Sentiment',
          'Application Across Markets',
        ],
      },
      {
        num: '4.3', orderIndex: 3, title: 'Candlestick Pattern Analysis',
        topics: [
          'Analyzing Candle Patterns: Reversals, Continuations, and Market Psychology',
          'The Importance of the Doji in Candlestick Analysis',
          'Strengths and Weaknesses of Candlesticks',
          'Conclusion',
        ],
      },
      {
        num: '4.4', orderIndex: 4, title: 'Point-and-Figure Charting Basics',
        topics: [
          'What is Point-and-Figure Charting?',
          'How to Build a Point-and-Figure Chart',
          'Basic Chart Patterns',
          'Trendlines',
          'Summary',
        ],
      },
    ],
  },
  {
    unitNum: 'V',
    orderIndex: 5,
    title: 'Technical Indicators',
    subtopics: [
      {
        num: '5.1', orderIndex: 1, title: 'Moving Averages',
        topics: [
          'Types Of Moving Averages',
          'Strategies for Using Moving Averages',
        ],
      },
      {
        num: '5.2', orderIndex: 2, title: 'Technical Indicator Construction',
        topics: [
          'Technical Momentum',
          'Momentum Indicator Construction',
          'Volume Indicator Construction',
          'Price and Volume Indicator Construction',
          'Normalized Indicator Construction',
          'Trend Strength Indicator Construction',
        ],
      },
      {
        num: '5.3', orderIndex: 3, title: 'Introduction to Bollinger Bands',
        topics: [
          'The Origin of Bollinger Bands',
          'Developing Bollinger Bands',
          'First Principles',
          'Calculating Bollinger Bands',
          'Basic Interpretation',
          'In Conclusion',
        ],
      },
    ],
  },
  {
    unitNum: 'VI',
    orderIndex: 6,
    title: 'Statistics for Technicians',
    subtopics: [
      {
        num: '6.1', orderIndex: 1, title: 'Introduction to Statistics Part 1',
        topics: [
          'Descriptive Versus Inferential Statistics',
          'Measures of Central Tendency',
          'Measures of Dispersion',
        ],
      },
      {
        num: '6.2', orderIndex: 2, title: 'Introduction to Statistics Part 2',
        topics: [
          'Data Visualization',
          'Correlation',
          'Linear Regression',
          'Putting It All Together',
          'Microsoft Excel Functions Used',
        ],
      },
      {
        num: '6.3', orderIndex: 3, title: 'Introduction to Probability',
        topics: [
          'The Search for the High-Probability Trade',
          'Properties of Probability',
          'The Probability Distribution',
        ],
      },
    ],
  },
  {
    unitNum: 'VII',
    orderIndex: 7,
    title: 'Behavioral Finance',
    subtopics: [
      {
        num: '7.1', orderIndex: 1, title: 'Behavioral Finance',
        topics: [
          'Introduction to Behavioral Finance and Prospect Theory',
          'Belief Preservation Biases',
          'Information Processing Biases',
          'Emotional Biases',
          'Behavioral Biases and Chart Patterns',
          'Case Study',
        ],
      },
    ],
  },
  {
    unitNum: 'VIII',
    orderIndex: 8,
    title: 'Sentiment',
    subtopics: [
      {
        num: '8.1', orderIndex: 1, title: 'Market Sentiment and Technical Analysis',
        topics: [
          'Sentiment Drives Market Prices',
        ],
      },
      {
        num: '8.2', orderIndex: 2, title: 'Sentiment Measured from Market Data',
        topics: [
          'VIX',
          'Open Interest',
          'Commitments of Traders Data',
          'Insider Trading',
          'Short Interest',
        ],
      },
      {
        num: '8.3', orderIndex: 3, title: 'Sentiment Measures from External Data',
        topics: [
          'AAII Survey',
          'Investors Intelligence',
          'Magazine Covers',
          'Mutual Fund Cash/Assets Ratio',
          'Money Market Fund Assets',
        ],
      },
    ],
  },
  {
    unitNum: 'IX',
    orderIndex: 9,
    title: 'Cycle Analysis',
    subtopics: [
      {
        num: '9.1', orderIndex: 1, title: 'Foundations of Cycle Theory',
        topics: [
          'Cycle Characteristics',
          'Principles',
          'What Is a Dominant Cycle?',
          'Fixed Cycle Tools',
        ],
      },
      {
        num: '9.2', orderIndex: 2, title: 'Common Cycles',
        topics: [
          'Natural Cycles',
          'Notable Cycles',
        ],
      },
    ],
  },
  {
    unitNum: 'X',
    orderIndex: 10,
    title: 'Comparative Market Analysis',
    subtopics: [
      {
        num: '10.1', orderIndex: 1, title: 'Equities',
        topics: [
          'What Are Equities?',
          'Benefits for Investors',
          'Other Forms of Equity',
          'What Does a Technical Analyst Need?',
          'Segmenting the Market for Analysis',
        ],
      },
      {
        num: '10.2', orderIndex: 2, title: 'Indexes',
        topics: [
          'What Are Indexes?',
          'Benefits for Investors',
          'Other Indexes',
          'Index Construction and Weighting',
          'Survivorship Bias',
          'Using Indexes',
          'Data Types Available',
          'What Does a Technical Analyst Need?',
        ],
      },
      {
        num: '10.3', orderIndex: 3, title: 'Fixed Income/Bonds',
        topics: [
          'What Are Bonds?',
          'Benefits for Investors',
          'Major Issuers of Bonds',
          'Components of a Bond',
          'Typical Information in a Bond Quote',
          'Yield Curve',
        ],
      },
      {
        num: '10.4', orderIndex: 4, title: 'Futures',
        topics: [
          'What Are Futures?',
          'Benefits for Investors',
          'Futures Terminology',
          'Futures Markets by Asset Class',
          'What Does a Technical Analyst Need?',
          'Challenges for a Technician',
        ],
      },
      {
        num: '10.5', orderIndex: 5, title: 'Exchange-Traded Products (ETPs)',
        topics: [
          'What Are Exchange-Traded Products?',
          'Benefits for Investors',
          'ETFs Versus ETNs',
          'Leveraged and Inverse ETFs',
          'No Risk-Free Basket',
          'Real Estate Investment Trusts (REITs)',
          'What Does a Technical Analyst Need?',
        ],
      },
      {
        num: '10.6', orderIndex: 6, title: 'Foreign Exchange (Currencies)',
        topics: [
          'What Is Foreign Exchange?',
          'Benefits for Investors',
          'Base Currency',
          'Pips and Spreads',
          'Available Data',
          'What Does a Technical Analyst Need?',
        ],
      },
      {
        num: '10.7', orderIndex: 7, title: 'Digital Assets',
        topics: [
          'What Are Digital Assets?',
          'The Evolution of Digital Assets',
          'Why Do They Exist?',
          'The Economics and Governance of Blockchain Networks',
          'Categorizing Digital Assets',
          'Unique Data for Cryptocurrencies',
          'Do Digital Assets Have Intrinsic Value or Fundamentals?',
          'The Evolving Market Structure of Digital Asset Trading',
          'Unique Events in the Digital Asset Market',
          'Why Technical Analysis (TA) is Perfectly Suited for Cryptocurrencies and Digital Assets',
          'Conclusion',
          'Resources',
        ],
      },
      {
        num: '10.8', orderIndex: 8, title: 'Options',
        topics: [
          'What Are Options?',
          'Benefits for Investors',
          'Options Terminology',
          'Using the Options Market',
          'Major Components of Options Prices',
          'Implied Volatility (IV)',
          'Pricing Models',
          'Warrants',
          'What Does a Technical Analyst Need?',
        ],
      },
      {
        num: '10.9', orderIndex: 9, title: 'Introduction to Relative Strength',
        topics: [
          'Introduction',
          'Relative Strength History',
          'Assessing Relative Strength',
          'Relative Strength Considerations',
          'Ranking with Relative Strength',
          'Difference between Institutional and Private Investors',
        ],
      },
      {
        num: '10.10', orderIndex: 10, title: 'Relative Strength and its Uses',
        topics: [
          'Introduction to Relative Strength',
          'Relative Strength to Assess the Market Environment',
          'Relative Strength for Stock Picking',
        ],
      },
    ],
  },
  {
    unitNum: 'XI',
    orderIndex: 11,
    title: 'Volatility Analysis',
    subtopics: [
      {
        num: '11.1', orderIndex: 1, title: 'The Meaning of Volatility to a Technician',
        topics: [
          'Definition of Volatility',
          'The Importance of Measuring Volatility',
          'Types of Volatility',
          'Volatility Skew',
        ],
      },
      {
        num: '11.2', orderIndex: 2, title: 'Measuring Historical Volatility',
        topics: [
          'Standard Deviation of Closing Prices',
          'Average True Range',
          'Bollinger Bands',
          'Keltner Channels',
        ],
      },
      {
        num: '11.3', orderIndex: 3, title: 'Options Derived Volatility',
        topics: [
          'Calculation of Implied Volatility',
          'Application to Price Movements',
        ],
      },
      {
        num: '11.4', orderIndex: 4, title: 'The VIX',
        topics: [
          'VIX through Bull and Bear Cycles',
          'VIX and Seasonality',
          'Various Published VIX Indexes',
          'What Causes VIX Spikes',
          'Using VIX for Signals',
        ],
      },
    ],
  },
  {
    unitNum: 'XII',
    orderIndex: 12,
    title: 'Systems and Quantitative Methods',
    subtopics: [
      {
        num: '12.1', orderIndex: 1, title: 'Introduction to Quantitative Methods',
        topics: [
          'Introduction',
          'The Investment Process',
          'The Scientific Method and Its Application',
          'Preparing for Quantitative Analysis',
          'The Quantitative Process',
          'Quant for Discretionary Analysts',
          'The Importance of Context',
        ],
      },
    ],
  },
];

async function main() {
  console.log('Seeding CMT Level I curriculum...\n');

  let chapterCount = 0;
  let subtopicCount = 0;
  let noteCount = 0;

  for (const unit of CMT_LEVEL_1) {
    const chapterTitle = `Unit ${unit.unitNum}: ${unit.title}`;
    const chapterSlug = toSlug(`unit-${unit.unitNum}-${unit.title}`);

    const chapter = await prisma.chapter.upsert({
      where: { level_slug: { level: 'LEVEL_1', slug: chapterSlug } },
      create: {
        level: 'LEVEL_1',
        title: chapterTitle,
        slug: chapterSlug,
        orderIndex: unit.orderIndex,
        isPublished: true,
        isDeleted: false,
      },
      update: {
        title: chapterTitle,
        orderIndex: unit.orderIndex,
        isPublished: true,
        isDeleted: false,
      },
    });

    chapterCount++;
    console.log(`  ✓ ${chapterTitle}`);

    for (const sub of unit.subtopics) {
      const subTitle = `${sub.num} ${sub.title}`;
      const subSlug = toSlug(`${sub.num}-${sub.title}`);

      const subtopic = await prisma.subtopic.upsert({
        where: { chapterId_slug: { chapterId: chapter.id, slug: subSlug } },
        create: {
          chapterId: chapter.id,
          title: subTitle,
          slug: subSlug,
          orderIndex: sub.orderIndex,
          isPublished: true,
          isDeleted: false,
        },
        update: {
          title: subTitle,
          orderIndex: sub.orderIndex,
          isPublished: true,
          isDeleted: false,
        },
      });

      subtopicCount++;
      console.log(`      ✓ ${subTitle}`);

      // Seed nested topics as Note shells numbered X.Y.Z
      for (let i = 0; i < sub.topics.length; i++) {
        const topicNum = `${sub.num}.${i + 1}`;
        const topicTitle = `${topicNum} ${sub.topics[i]}`;
        const noteSlug = toSlug(`${topicNum}-${sub.topics[i]}`);

        // Check if note already exists by subtopicId + title to keep idempotent
        const existing = await prisma.note.findFirst({
          where: { subtopicId: subtopic.id, title: topicTitle },
        });

        if (!existing) {
          await prisma.note.create({
            data: {
              subtopicId: subtopic.id,
              title: topicTitle,
              contentJson: emptyDoc,
              orderIndex: i + 1,
              isPublished: false,
              isDeleted: false,
            },
          });
        } else {
          await prisma.note.update({
            where: { id: existing.id },
            data: {
              title: topicTitle,
              orderIndex: i + 1,
            },
          });
        }

        noteCount++;
        console.log(`          ✓ ${topicTitle}`);
      }
    }

    console.log('');
  }

  console.log(`Done! Seeded ${chapterCount} units, ${subtopicCount} sections, and ${noteCount} topics for CMT Level I.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
