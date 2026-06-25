import crypto from 'crypto';

const PROPERTY_ID = process.env.GA4_PROPERTY_ID ?? '541762615';

async function getToken(): Promise<string> {
  const email = process.env.GA4_CLIENT_EMAIL;
  if (!email) throw new Error('MISSING_CREDENTIALS');

  // Support both base64-encoded key (GA4_PRIVATE_KEY_B64) and raw PEM (GA4_PRIVATE_KEY)
  let key: string | undefined;
  if (process.env.GA4_PRIVATE_KEY_B64) {
    key = Buffer.from(process.env.GA4_PRIVATE_KEY_B64, 'base64').toString('utf8');
  } else if (process.env.GA4_PRIVATE_KEY) {
    key = process.env.GA4_PRIVATE_KEY
      .replace(/^["']|["']$/g, '')
      .replace(/\\n/g, '\n');
  }
  if (!key) throw new Error('MISSING_CREDENTIALS');

  const now = Math.floor(Date.now() / 1000);
  const hdr = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
  const pay = Buffer.from(JSON.stringify({
    iss: email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  })).toString('base64url');

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(`${hdr}.${pay}`);
  const sig = signer.sign(key).toString('base64url');

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${hdr}.${pay}.${sig}`,
    }),
  });
  const json = await res.json() as { access_token?: string; error?: string };
  if (!json.access_token) throw new Error(json.error ?? 'token_failed');
  return json.access_token;
}

type GARow = { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] };
type GAReport = { rows?: GARow[] };

async function runReport(token: string, body: object): Promise<GAReport> {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
    {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    },
  );
  return res.json() as Promise<GAReport>;
}

const mv = (row: GARow, i: number) => Number(row.metricValues?.[i]?.value ?? 0);
const dv = (row: GARow, i: number) => row.dimensionValues?.[i]?.value ?? '';

export async function fetchGA4Summary() {
  const token = await getToken();

  const [overview, todayRpt, yesterday, channels, pages, geo, devices, events] = await Promise.all([
    runReport(token, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      metrics: [
        { name: 'activeUsers' }, { name: 'newUsers' },
        { name: 'sessions' }, { name: 'screenPageViews' },
        { name: 'averageSessionDuration' }, { name: 'bounceRate' },
      ],
    }),
    runReport(token, {
      dateRanges: [{ startDate: 'today', endDate: 'today' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'sessions' }],
    }),
    runReport(token, {
      dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
      metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
    }),
    runReport(token, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [{ name: 'sessions' }, { name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 8,
    }),
    runReport(token, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'pagePath' }],
      metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'averageSessionDuration' }],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 10,
    }),
    runReport(token, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 8,
    }),
    runReport(token, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [{ name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    }),
    runReport(token, {
      dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 10,
    }),
  ]);

  const ov = overview.rows?.[0];
  const td = todayRpt.rows?.[0];
  const yd = yesterday.rows?.[0];

  return {
    today: { users: td ? mv(td, 0) : 0, views: td ? mv(td, 1) : 0, sessions: td ? mv(td, 2) : 0 },
    yesterday: { users: yd ? mv(yd, 0) : 0, views: yd ? mv(yd, 1) : 0 },
    thirtyDay: ov ? {
      users: mv(ov, 0), newUsers: mv(ov, 1),
      sessions: mv(ov, 2), views: mv(ov, 3),
      avgDuration: mv(ov, 4), bounceRate: mv(ov, 5),
    } : null,
    channels: (channels.rows ?? []).map(r => ({ name: dv(r, 0), sessions: mv(r, 0), users: mv(r, 1) })),
    pages: (pages.rows ?? []).map(r => ({ path: dv(r, 0), views: mv(r, 0), users: mv(r, 1), avgDuration: mv(r, 2) })),
    geo: (geo.rows ?? []).map(r => ({ country: dv(r, 0), users: mv(r, 0) })),
    devices: (devices.rows ?? []).map(r => ({ device: dv(r, 0), sessions: mv(r, 0) })),
    events: (events.rows ?? []).map(r => ({ name: dv(r, 0), count: mv(r, 0) })),
    fetchedAt: new Date().toISOString(),
  };
}
