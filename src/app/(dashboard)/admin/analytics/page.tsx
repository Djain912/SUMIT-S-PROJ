'use client';

import { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink, AlertCircle, Activity } from 'lucide-react';

type SevenDay = {
  users: number; newUsers: number; sessions: number; views: number; avgDuration: number;
};
type GA4Data = {
  today: { users: number; newUsers: number };
  sevenDay: SevenDay | null;
  channels: { name: string; sessions: number }[];
  pages: { path: string; views: number; users: number; avgDuration: number }[];
  totalViews: number;
  geo: { country: string; users: number }[];
  events: { name: string; count: number }[];
  fetchedAt: string;
};

function fmtDur(secs: number): string {
  if (secs < 60) return `${Math.round(secs)}s`;
  const m = Math.floor(secs / 60);
  const s = Math.round(secs % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

function fmtNum(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}K` : String(n);
}

const CHANNEL_COLORS: Record<string, string> = {
  Direct: '#534AB7',
  'Organic Social': '#1D9E75',
  'Organic Search': '#BA7517',
  Referral: '#185FA5',
  Email: '#D85A30',
};
function channelColor(name: string) { return CHANNEL_COLORS[name] ?? '#888780'; }

function Bar({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-zinc-100">
      <div className="h-1 rounded-full" style={{ width: `${Math.max(pct, 1)}%`, background: color, minWidth: '4px' }} />
    </div>
  );
}

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-zinc-50 p-4">
      <p className="mb-1.5 text-[11px] tracking-wide text-zinc-400">{label}</p>
      <p className="text-2xl font-medium text-zinc-900 leading-none mb-1">{value}</p>
      {sub && <p className="text-[11px] text-zinc-400">{sub}</p>}
    </div>
  );
}

function SectionCard({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5">
      <p className="text-[13px] font-medium text-zinc-900 mb-0.5">{title}</p>
      <p className="text-[11px] text-zinc-400 mb-4">{sub}</p>
      {children}
    </div>
  );
}

function SetupGuide() {
  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 space-y-4">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900">GA4 credentials not set up yet</p>
          <p className="text-sm text-amber-700 mt-1">
            Add these 3 environment variables to your <code className="bg-amber-100 px-1 rounded text-xs">.env.local</code> file to connect this dashboard to live Google Analytics data.
          </p>
        </div>
      </div>
      <div className="rounded-xl bg-white border border-amber-200 p-4 font-mono text-xs text-zinc-700 space-y-1">
        <p className="text-zinc-400"># Add to .env.local</p>
        <p>GA4_PROPERTY_ID=<span className="text-emerald-600">541762615</span></p>
        <p>GA4_CLIENT_EMAIL=<span className="text-zinc-400">your-service-account@project.iam.gserviceaccount.com</span></p>
        <p>GA4_PRIVATE_KEY=<span className="text-zinc-400">&quot;-----BEGIN PRIVATE KEY-----\n...&quot;</span></p>
      </div>
      <div className="space-y-2 text-sm text-amber-800">
        <p className="font-medium">How to get these values:</p>
        <ol className="list-decimal list-inside space-y-1 text-amber-700">
          <li>Go to <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline">console.cloud.google.com</a> → IAM &amp; Admin → Service Accounts</li>
          <li>Create a new service account → Generate JSON key → download it</li>
          <li>Copy <code className="bg-amber-100 px-1 rounded text-xs">client_email</code> → <code className="bg-amber-100 px-1 rounded text-xs">GA4_CLIENT_EMAIL</code></li>
          <li>Copy <code className="bg-amber-100 px-1 rounded text-xs">private_key</code> value → <code className="bg-amber-100 px-1 rounded text-xs">GA4_PRIVATE_KEY</code></li>
          <li>In <a href="https://analytics.google.com" target="_blank" rel="noreferrer" className="underline">Google Analytics</a> → Admin → Property Access Management → Add the service account email as a Viewer</li>
          <li>Restart the dev server / redeploy</li>
        </ol>
      </div>
    </div>
  );
}

function Skeleton() {
  return (
    <div className="space-y-5 animate-pulse">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[1, 2, 3, 4].map(i => <div key={i} className="h-20 rounded-xl bg-zinc-100" />)}
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-52 rounded-2xl bg-zinc-100" />
        <div className="h-52 rounded-2xl bg-zinc-100" />
      </div>
      <div className="h-64 rounded-2xl bg-zinc-100" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="h-48 rounded-2xl bg-zinc-100" />
        <div className="h-48 rounded-2xl bg-zinc-100" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<GA4Data | null>(null);
  const [loading, setLoading] = useState(true);
  const [missingCreds, setMissingCreds] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setMissingCreds(false);
    try {
      const res = await fetch('/api/admin/analytics');
      const json = await res.json() as { success: boolean; data?: GA4Data; error?: { code?: string; message?: string } };
      if (!json.success) {
        if (json.error?.code === 'MISSING_CREDENTIALS') { setMissingCreds(true); return; }
        throw new Error(json.error?.message ?? 'Failed to load');
      }
      setData(json.data ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const sd = data?.sevenDay;
  const totalSessions = data?.channels.reduce((s, c) => s + c.sessions, 0) ?? 1;
  const totalGeoUsers = data?.geo.reduce((s, g) => s + g.users, 0) ?? 1;
  const maxEvents = data?.events[0]?.count ?? 1;

  return (
    <main className="min-h-screen bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
      <div className="mx-auto max-w-6xl space-y-5">

        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Live Data</p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">Analytics</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              Last 7 days · chartix.in
              {data?.fetchedAt && (
                <span className="ml-2 text-zinc-400">
                  · refreshed {new Date(data.fetchedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <a
              href="https://analytics.google.com/analytics/web/#/a398037835p541762615/reports/intelligenthome"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open in GA4
            </a>
            <button
              onClick={load}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* States */}
        {loading && <Skeleton />}
        {!loading && missingCreds && <SetupGuide />}
        {!loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">
            <span className="font-medium">Error: </span>{error}
          </div>
        )}

        {/* Dashboard */}
        {!loading && data && sd && (
          <>
            {/* KPIs */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <KpiCard label="Today · users" value={String(data.today.users)} sub={`${data.today.newUsers} new`} />
              <KpiCard label="7 days · users" value={fmtNum(sd.users)} sub={`${sd.newUsers} new`} />
              <KpiCard label="7 days · page views" value={fmtNum(sd.views)} sub={`${sd.sessions} sessions`} />
              <KpiCard label="Avg session time" value={fmtDur(sd.avgDuration)} sub="per session" />
            </div>

            {/* Channels + Events */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <SectionCard title="Traffic channels" sub={`Sessions · last 7 days · ${totalSessions} total`}>
                <div className="space-y-3">
                  {data.channels.map(ch => (
                    <div key={ch.name}>
                      <div className="flex justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="inline-block h-2 w-2 rounded-sm flex-shrink-0" style={{ background: channelColor(ch.name) }} />
                          <span className="text-xs text-zinc-600">{ch.name}</span>
                        </div>
                        <span className="text-xs font-medium text-zinc-900">
                          {ch.sessions} <span className="text-zinc-400 font-normal">({Math.round(ch.sessions / totalSessions * 100)}%)</span>
                        </span>
                      </div>
                      <Bar pct={ch.sessions / totalSessions * 100} color={channelColor(ch.name)} />
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Events" sub={`Last 7 days · ${data.events.reduce((s, e) => s + e.count, 0).toLocaleString()} total`}>
                <div className="space-y-3">
                  {data.events.map(ev => (
                    <div key={ev.name}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-zinc-600 font-mono">{ev.name}</span>
                        <span className="text-xs font-medium text-zinc-900">{ev.count.toLocaleString()}</span>
                      </div>
                      <Bar pct={ev.count / maxEvents * 100} color="#534AB7" />
                    </div>
                  ))}
                </div>
              </SectionCard>

            </div>

            {/* Top pages */}
            <SectionCard title="Top pages" sub={`Last 7 days · ${data.totalViews.toLocaleString()} total views`}>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      {['#', 'Page', 'Views', 'Users', 'Avg time'].map(h => (
                        <th key={h} className="pb-2 text-left text-[10px] font-semibold uppercase tracking-wider text-zinc-400 pr-4 last:pr-0">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {data.pages.map((pg, i) => (
                      <tr key={pg.path}>
                        <td className="py-2.5 pr-4 text-xs text-zinc-400 tabular-nums">{i + 1}</td>
                        <td className="py-2.5 pr-4 font-mono text-xs text-zinc-800 max-w-[220px] truncate">{pg.path}</td>
                        <td className="py-2.5 pr-4 text-xs font-medium text-zinc-900 tabular-nums">{pg.views}</td>
                        <td className="py-2.5 pr-4 text-xs text-zinc-500 tabular-nums">{pg.users}</td>
                        <td className={`py-2.5 text-xs tabular-nums ${pg.avgDuration > 90 ? 'font-medium text-emerald-700' : 'text-zinc-500'}`}>
                          {fmtDur(pg.avgDuration)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </SectionCard>

            {/* Geo + Live indicator */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <SectionCard title="Geography" sub="Active users · last 7 days">
                <div className="space-y-3">
                  {data.geo.map(g => (
                    <div key={g.country}>
                      <div className="flex justify-between mb-1.5">
                        <span className="text-xs text-zinc-600">{g.country}</span>
                        <span className="text-xs font-medium text-zinc-900">
                          {g.users} <span className="text-zinc-400 font-normal">({Math.round(g.users / totalGeoUsers * 100)}%)</span>
                        </span>
                      </div>
                      <Bar pct={g.users / totalGeoUsers * 100} color={g === data.geo[0] ? '#534AB7' : '#1D9E75'} />
                    </div>
                  ))}
                </div>
              </SectionCard>

              <SectionCard title="Key signals" sub="Based on current data">
                <div className="space-y-4">
                  {data.channels.find(c => c.name === 'Organic Social') && (
                    <div className="flex gap-3">
                      <Activity className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-zinc-900">Social is your fastest channel</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Keep posting — organic social is driving new users without ad spend</p>
                      </div>
                    </div>
                  )}
                  {data.pages.find(p => p.path.includes('index-builder')) && (
                    <div className="flex gap-3">
                      <Activity className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-zinc-900">Index Builder is your viral tool</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {data.pages.find(p => p.path.includes('index-builder'))?.users} unique users this week — most of any tool page
                        </p>
                      </div>
                    </div>
                  )}
                  {sd.users > 0 && (
                    <div className="flex gap-3">
                      <Activity className="h-4 w-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-zinc-900">{sd.newUsers} new users in 7 days</p>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          {Math.round(sd.newUsers / sd.users * 100)}% of all users are brand new — strong acquisition
                        </p>
                      </div>
                    </div>
                  )}
                  {data.pages.find(p => p.path === '/sign-up') && (
                    <div className="flex gap-3">
                      <Activity className="h-4 w-4 text-violet-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-zinc-900">{data.pages.find(p => p.path === '/sign-up')?.users} users on /sign-up</p>
                        <p className="text-xs text-zinc-500 mt-0.5">Conversion funnel is active — monitor form_start vs sign-ups weekly</p>
                      </div>
                    </div>
                  )}
                </div>
              </SectionCard>

            </div>
          </>
        )}

      </div>
    </main>
  );
}
