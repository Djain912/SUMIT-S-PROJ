import { notFound } from 'next/navigation';
import { type IndicatorKey } from '@/components/tools/indicator-tool';
import { IndicatorLab } from '@/components/tools/indicator-lab';
import { ScrollPopup } from '@/components/marketing/ScrollPopup';
import { LabHeader, LabFooter, LabCta } from '@/components/tools/lab-header';

export const dynamic = 'force-dynamic';

const VALID: IndicatorKey[] = ['roc', 'macd', 'rsi', 'stochastics', 'adl', 'mfi', 'ppo', 'dmi', 'obv', 'cmf', 'rvol', 'sma', 'ema', 'lwma', 'wilderma', 'distma', 'bb'];
const NAMES: Record<IndicatorKey, string> = {
  roc: 'Rate of Change (ROC)', macd: 'MACD', rsi: 'RSI', stochastics: 'Stochastics',
  adl: 'Accumulation / Distribution', mfi: 'Money Flow Index', ppo: 'PPO', dmi: 'DMI / ADX',
  obv: 'On Balance Volume', cmf: 'Chaikin Money Flow', rvol: 'Relative Volume',
  sma: 'Simple Moving Average', ema: 'Exponential Moving Average',
  lwma: 'Linearly Weighted Moving Average', wilderma: 'Wilder Moving Average', distma: 'Distance from MA (%)',
  bb: 'Bollinger Bands®',
};

// Short descriptions for the intro paragraph shown below H1
const INTROS: Partial<Record<IndicatorKey, string>> = {
  rsi:        'Enter any price series and the tool calculates RSI step-by-step — average gain, average loss, RS ratio, and the final oscillator value — with a live chart overlay.',
  macd:       'See exactly how MACD is built: the 12-period EMA, 26-period EMA, the signal line, and the histogram — calculated live from the price data you enter.',
  bb:         'Calculates the middle band (SMA), upper band (+2σ), and lower band (−2σ) in real time. Adjust the period and standard-deviation multiplier to see how the bands react.',
  sma:        'Enter price data and period — the tool shows each SMA value with its component prices highlighted, making the rolling-average mechanic immediately visible.',
  ema:        'See how EMA weights recent prices more heavily than SMA: the tool shows the smoothing factor, each period\'s calculation, and the EMA plotted against price.',
  dmi:        'Calculates +DI, −DI, and the ADX trend-strength line together. A great way to understand how directional movement converts into a single trend reading.',
  stochastics:'Shows the %K and %D lines with the 80/20 overbought-oversold zones marked — calculated from the highest high and lowest low over your chosen look-back.',
  obv:        'Running total of volume with sign: adds volume on up days, subtracts on down days. A pure cumulative measure of buying and selling pressure.',
};

export async function generateMetadata({ params }: { params: Promise<{ indicator: string }> }) {
  const { indicator } = await params;
  const name = NAMES[indicator as IndicatorKey] ?? 'Indicator';
  const title = `${name} Calculator — Free Online Tool | Chartix`;
  const description = `Free online ${name} calculator with a live price chart, step-by-step calculation table, and a plain-English explanation. Understand exactly how ${name} works — no login required.`;
  return {
    title,
    description,
    keywords: [`${name} calculator`, `${name} online`, `${name} formula`, `CMT ${name}`, 'technical analysis calculator'],
    alternates: { canonical: `/tools/${indicator}` },
    openGraph: {
      title,
      description,
      url: `/tools/${indicator}`,
      type: 'website' as const,
    },
    twitter: {
      card: 'summary_large_image' as const,
      title,
      description,
    },
  };
}

export default async function PublicIndicatorPage({ params }: { params: Promise<{ indicator: string }> }) {
  const { indicator } = await params;
  if (!VALID.includes(indicator as IndicatorKey)) notFound();
  const key = indicator as IndicatorKey;

  return (
    <div className="min-h-screen bg-[#FAFAF8] text-stone-900">
      <LabHeader backToLab />

      <main className="mx-auto max-w-6xl px-4 pb-16 pt-10 sm:px-6 sm:pt-14 lg:px-8">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@type': 'WebApplication',
              name: `${NAMES[key]} Calculator`,
              url: `https://chartix.in/tools/${key}`,
              applicationCategory: 'FinanceApplication',
              operatingSystem: 'Any',
              description: `Free online ${NAMES[key]} calculator with a live price chart, step-by-step calculation table, and plain-English explanation. No login required.`,
              offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
            }),
          }}
        />

        <IndicatorLab indicator={key} intro={INTROS[key]} />

        <div className="mt-24">
          <LabCta />
        </div>
      </main>

      <LabFooter />

      <ScrollPopup />
    </div>
  );
}
