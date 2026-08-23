'use client';

import { useEffect, useState, useCallback } from 'react';
import { RefreshCw, Users, Eye, MousePointer, Clock, TrendingUp, TrendingDown, Globe, Smartphone, Monitor, Tablet, ExternalLink } from 'lucide-react';

type GAData = {
  today: { users: number; views: number; sessions: number };
  yesterday: { users: number; views: number };
  thirtyDay: {
    users: number; newUsers: number; sessions: number; views: number;
    avgDuration: number; bounceRate: number;
  } | null;
  channels: { name: string; sessions: number; users: number }[];
  pages: { path: string; views: number; users: number; avgDuration: number }[];
  geo: { country: string; users: number }[];
  devices: { device: string; sessions: number }[];
  events: { name: string; count: number }[];
  fetchedAt: string;
};

function fmt(n: number) { return n.toLocaleString(); }
function fmtDur(s: number) {
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
}
function fmtPct(n: number) { return (n * 100).toFixed(1) + '%'; }
function delta(today: number, yesterday: number) {
  if (!yesterday) return null;
  const pct = ((today - yesterday) / yesterday) * 100;
  return pct;
}

function KpiCard({ label, value, sub, icon: Icon, trend }: {
  label: string; value: string; sub?: string; icon: React.ElementType; trend?: number | null;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">{label}</span>
        <div className="rounded-lg bg-zinc-50 p-2"><Icon className="h-4 w-4 text-zinc-500" /></div>
      </div>
      <p className="text-3xl font-bold tracking-tight text-zinc-900">{value}</p>
      <div className="mt-1 flex items-center gap-2">
        {trend !== null && trend !== undefined && (
          <span className={`flex items-center gap-0.5 text-xs font-semibold ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {trend >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {Math.abs(trend).toFixed(1)}% vs yesterday
          </span>
        )}
        {sub && <span className="text-xs text-zinc-400">{sub}</span>}
      </div>
    </div>
  );
}

function Bar({ label, value, max, sub }: { label: string; value: number; max: number; sub?: string }) {
  const pct = max > 0 ? (value / max) * 100 : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="truncate font-medium text-zinc-700 max-w-[200px]">{label}</span>
        <span className="ml-2 shrink-0 font-semibold text-zinc-900">{fmt(value)}{sub ? <span className="text-xs text-zinc-400 font-normal ml-1">{sub}</span> : null}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-zinc-100">
        <div className="h-1.5 rounded-full bg-zinc-800 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function deviceIcon(d: string) {
  if (d === 'mobile') return <Smartphone className="h-4 w-4" />;
  if (d === 'tablet') return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

export default function AnalyticsPage() {
  const [data, setData] = useState<GAData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/analytics');
      const json = await res.json();
      if (!json.success) {
        setError(json.error?.code === 'MISSING_CREDENTIALS' ? 'credentials_missing' : (json.error?.message ?? 'Failed to load'));
      } else {
        setData(json.data);
      }
    } catch {
      setError('Network error');
    } finally {
      setLoading(false); setRefreshing(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const td = data?.thirtyDay;
  const totalSessions = data?.channels.reduce((a, c) => a + c.sessions, 0) ?? 1;
  const totalGeo = data?.geo.reduce((a, c) => a + c.users, 0) ?? 1;
  const maxPage = data?.pages[0]?.views ?? 1;

  if (loading) return (
    <div className="flex h-64 items-center justify-center">
      <RefreshCw className="h-6 w-6 animate-spin text-zinc-400" />
    </div>
  );

  if (error === 'credentials_missing') return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
      <p className="text-lg font-semibold text-amber-800">GA4 credentials not set</p>
      <p className="mt-1 text-sm text-amber-700">Add <code className="font-mono bg-amber-100 px-1 rounded">GA4_PRIVATE_KEY_B64</code> and <code className="font-mono bg-amber-100 px-1 rounded">GA4_CLIENT_EMAIL</code> to Vercel environment variables.</p>
    </div>
  );

  if (error) return (
    <div className="rounded-2xl border border-red-200 bg-red-50 p-8 text-center">
      <p className="font-semibold text-red-700">Error: {error}</p>
      <button onClick={() => load()} className="mt-4 rounded-lg bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">Retry</button>
    </div>
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Analytics</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Last 30 days · chartix.in</p>
        </div>
        <div className="flex items-center gap-3">
          <a
            href="https://analytics.google.com/analytics/web/#/p541762615/reports/intelligenthome"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-xs font-semibold text-zinc-600 hover:bg-zinc-50"
          >
            <ExternalLink className="h-3.5 w-3.5" /> Open GA4
          </a>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-lg bg-zinc-900 px-3 py-2 text-xs font-semibold text-white hover:bg-zinc-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? 'animate-spin' : ''}`} /> Refresh
          </button>
        </div>
      </div>

      {/* Today strip */}
      <div className="rounded-2xl border border-zinc-200 bg-zinc-950 px-6 py-4 text-white">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">Today</p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { label: 'Active Users', value: fmt(data?.today.users ?? 0) },
            { label: 'Page Views', value: fmt(data?.today.views ?? 0) },
            { label: 'Sessions', value: fmt(data?.today.sessions ?? 0) },
          ].map(item => (
            <div key={item.label}>
              <p className="text-2xl font-bold">{item.value}</p>
              <p className="text-xs text-zinc-400 mt-0.5">{item.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 30-day KPIs */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-3">
        <KpiCard label="Users" value={fmt(td?.users ?? 0)} icon={Users}
          trend={delta(data?.today.users ?? 0, data?.yesterday.users ?? 0)}
          sub="30-day total" />
        <KpiCard label="New Users" value={fmt(td?.newUsers ?? 0)} icon={TrendingUp}
          sub={td ? `${((td.newUsers / td.users) * 100).toFixed(0)}% of total` : undefined} />
        <KpiCard label="Page Views" value={fmt(td?.views ?? 0)} icon={Eye}
          trend={delta(data?.today.views ?? 0, data?.yesterday.views ?? 0)}
          sub="30-day total" />
        <KpiCard label="Sessions" value={fmt(td?.sessions ?? 0)} icon={MousePointer} />
        <KpiCard label="Avg Session" value={fmtDur(td?.avgDuration ?? 0)} icon={Clock} />
        <KpiCard label="Bounce Rate" value={fmtPct(td?.bounceRate ?? 0)} icon={TrendingDown} />
      </div>

      {/* Channels + Devices */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">Traffic channels</h2>
          <div className="space-y-3">
            {(data?.channels ?? []).map(c => (
              <Bar key={c.name} label={c.name || 'Direct'} value={c.sessions} max={totalSessions}
                sub={`${((c.sessions / totalSessions) * 100).toFixed(0)}%`} />
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">Devices</h2>
          <div className="space-y-4">
            {(data?.devices ?? []).map(d => {
              const total = data?.devices.reduce((a, x) => a + x.sessions, 0) ?? 1;
              const pct = ((d.sessions / total) * 100).toFixed(0);
              return (
                <div key={d.device} className="flex items-center gap-3">
                  <div className="rounded-lg bg-zinc-100 p-2 text-zinc-600">{deviceIcon(d.device)}</div>
                  <div className="flex-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium capitalize text-zinc-700">{d.device}</span>
                      <span className="font-semibold text-zinc-900">{pct}%</span>
                    </div>
                    <div className="mt-1 h-1.5 w-full rounded-full bg-zinc-100">
                      <div className="h-1.5 rounded-full bg-zinc-800" style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <h2 className="mb-4 mt-6 text-sm font-bold uppercase tracking-widest text-zinc-400">Top countries</h2>
          <div className="space-y-3">
            {(data?.geo ?? []).slice(0, 5).map(g => (
              <div key={g.country} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <Globe className="h-3.5 w-3.5 text-zinc-400" />
                  <span className="font-medium text-zinc-700">{g.country}</span>
                </div>
                <span className="font-semibold text-zinc-900">{fmt(g.users)} <span className="text-xs text-zinc-400 font-normal">({((g.users / totalGeo) * 100).toFixed(0)}%)</span></span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Top pages */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">Top pages — 30 days</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-left text-xs font-semibold uppercase tracking-wider text-zinc-400">
                <th className="pb-3 pr-4">#</th>
                <th className="pb-3 pr-4">Page</th>
                <th className="pb-3 pr-4 text-right">Views</th>
                <th className="pb-3 pr-4 text-right">Users</th>
                <th className="pb-3 text-right">Avg time</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {(data?.pages ?? []).map((p, i) => (
                <tr key={p.path} className="group hover:bg-zinc-50">
                  <td className="py-3 pr-4 text-zinc-400 font-medium">{i + 1}</td>
                  <td className="py-3 pr-4 max-w-[260px]">
                    <div className="truncate font-medium text-zinc-800">{p.path}</div>
                    <div className="mt-0.5 h-1 w-full rounded-full bg-zinc-100">
                      <div className="h-1 rounded-full bg-zinc-300" style={{ width: `${(p.views / maxPage) * 100}%` }} />
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-right font-semibold text-zinc-900">{fmt(p.views)}</td>
                  <td className="py-3 pr-4 text-right text-zinc-600">{fmt(p.users)}</td>
                  <td className="py-3 text-right text-zinc-500">{fmtDur(p.avgDuration)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Events */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-widest text-zinc-400">Top events — 30 days</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {(data?.events ?? []).map(e => (
            <div key={e.name} className="rounded-xl border border-zinc-100 bg-zinc-50 p-4">
              <p className="text-xl font-bold text-zinc-900">{fmt(e.count)}</p>
              <p className="mt-1 truncate text-xs text-zinc-500">{e.name}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="text-center text-xs text-zinc-400">
        Last fetched: {data ? new Date(data.fetchedAt).toLocaleString() : '—'}
      </p>
    </div>
  );
}
