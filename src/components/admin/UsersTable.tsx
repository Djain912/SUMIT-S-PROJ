'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Users, Mail, Chrome, RefreshCw, Crown, Shield, Infinity as InfinityIcon, Loader2, Ticket, Trash2, IndianRupee, Activity } from 'lucide-react';

type CmtLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
const LEVEL_LABEL: Record<CmtLevel, string> = { LEVEL_1: 'L1', LEVEL_2: 'L2', LEVEL_3: 'L3' };

type LevelBadge = {
  level: CmtLevel;
  status: 'trial-active' | 'trial-expired' | 'entitled' | 'none';
  dayOfTrial: number;
  daysRemaining: number;
};

type User = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isPremium: boolean;
  premiumUntil: string | null;
  couponRedeemed: string | null;
  entitlementCoupon: string | null;
  entitlementExpiry: string | null;
  signInMethod: 'Email' | 'Google';
  quizAttempts: number;
  joinedAt: string;
  fullAccess: boolean;
  purchasedLevels: CmtLevel[];
  levels: LevelBadge[];
  lastLoginAt: string | null;
  loginCount: number;
  mcqAttempted: number;
  mockAttempted: number;
};

// Works out a user's current access state for display.
function accessInfo(u: User): { label: string; tone: 'admin' | 'lifetime' | 'temp' | 'expired' | 'free' | 'coupon' } {
  if (u.role === 'ADMIN') return { label: 'Admin', tone: 'admin' };
  if (u.isPremium && !u.premiumUntil) return { label: 'Lifetime', tone: 'lifetime' };
  if (u.isPremium && u.premiumUntil) {
    const until = new Date(u.premiumUntil);
    if (until > new Date()) {
      return { label: `Until ${until.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`, tone: 'temp' };
    }
    return { label: 'Expired', tone: 'expired' };
  }
  // Scoped coupon (entitlement-based) — not isPremium but has active entitlement
  if (u.entitlementExpiry) {
    const until = new Date(u.entitlementExpiry);
    if (until > new Date()) {
      return { label: `Coupon until ${until.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`, tone: 'coupon' };
    }
  }
  return { label: 'Free', tone: 'free' };
}

// Which coupon code is actively in use for this user?
function activeCoupon(u: User): string | null {
  if (u.entitlementCoupon) return u.entitlementCoupon;
  if (u.couponRedeemed && u.couponRedeemed !== 'LIFETIME_ADMIN') return u.couponRedeemed;
  return null;
}

function formatRupees(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString('en-IN')}`;
}

function activeWithinDays(iso: string | null, days: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() <= days * 24 * 60 * 60 * 1000;
}

type Meta = { total: number; page: number; limit: number };

function StatCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: number | string; color: string }) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <div className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${color} mb-3`}>
        <Icon className="h-4.5 w-4.5 text-white" />
      </div>
      <p className="text-2xl font-bold text-zinc-900">{value}</p>
      <p className="mt-0.5 text-xs text-zinc-500">{label}</p>
    </div>
  );
}

// Small badge for one level's status on a user row. Skips levels with no
// signal at all (never trialed, never bought) to keep rows uncluttered.
function LevelPill({ badge }: { badge: LevelBadge }) {
  if (badge.status === 'none') return null;
  const label = LEVEL_LABEL[badge.level];
  if (badge.status === 'entitled') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
        {label} ✓
      </span>
    );
  }
  if (badge.status === 'trial-active') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-600" title={`Day ${badge.dayOfTrial} of trial, ${badge.daysRemaining}d left`}>
        {label} d{badge.dayOfTrial}
      </span>
    );
  }
  // trial-expired
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 line-through">
      {label}
    </span>
  );
}

function LevelsCell({ u }: { u: User }) {
  if (u.role === 'ADMIN') return <span className="text-zinc-300 text-[11px]">—</span>;
  if (u.fullAccess) {
    const bought = u.purchasedLevels.map((l) => LEVEL_LABEL[l]).join(', ');
    return (
      <span className="inline-flex flex-col gap-0.5">
        <span className="inline-flex items-center gap-1 rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-semibold text-violet-700 w-fit">
          All levels
        </span>
        {bought && <span className="text-[10px] text-zinc-400">bought: {bought}</span>}
      </span>
    );
  }
  const any = u.levels.some((l) => l.status !== 'none');
  if (!any) return <span className="text-zinc-300 text-[11px]">Not started</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {u.levels.map((l) => <LevelPill key={l.level} badge={l} />)}
    </span>
  );
}

export function UsersTable({ initialUsers, initialMeta, totalRevenuePaise }: { initialUsers: User[]; initialMeta: Meta; totalRevenuePaise: number }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [revenuePaise, setRevenuePaise] = useState(totalRevenuePaise);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'Email' | 'Google' | 'premium' | 'coupon' | 'free' | 'trial' | 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<User | null>(null);

  const updateAccess = useCallback(async (userId: string, action: 'grant_lifetime' | 'revoke') => {
    setUpdatingId(userId);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.map((u) =>
          u.id === userId ? { ...u, isPremium: json.data.isPremium, premiumUntil: json.data.premiumUntil, fullAccess: json.data.isPremium || u.role === 'ADMIN' } : u,
        ));
      } else {
        alert(json.error?.message ?? 'Update failed');
      }
    } catch {
      alert('Update failed. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const removeUser = useCallback(async (userId: string) => {
    setUpdatingId(userId);
    setConfirmRemove(null);
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, action: 'remove' }),
      });
      const json = await res.json();
      if (json.success) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setMeta((m) => ({ ...m, total: m.total - 1 }));
      } else {
        alert(json.error?.message ?? 'Remove failed');
      }
    } catch {
      alert('Remove failed. Please try again.');
    } finally {
      setUpdatingId(null);
    }
  }, []);

  const fetchUsers = useCallback(async (q: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/admin/users?search=${encodeURIComponent(q)}&limit=200`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data);
        setMeta(json.meta);
        if (typeof json.totalRevenuePaise === 'number') setRevenuePaise(json.totalRevenuePaise);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  const filtered = users.filter((u) => {
    if (filter === 'Email') return u.signInMethod === 'Email';
    if (filter === 'Google') return u.signInMethod === 'Google';
    if (filter === 'premium') return u.isPremium;
    if (filter === 'coupon') return !!(u.entitlementCoupon || (u.couponRedeemed && u.couponRedeemed !== 'LIFETIME_ADMIN'));
    if (filter === 'free') return !u.isPremium && !u.entitlementCoupon;
    if (filter === 'trial') return u.levels.some((l) => l.status === 'trial-active');
    if (filter === 'LEVEL_1' || filter === 'LEVEL_2' || filter === 'LEVEL_3') {
      return u.fullAccess || u.levels.some((l) => l.level === filter && l.status !== 'none');
    }
    return true;
  });

  const googleCount = users.filter((u) => u.signInMethod === 'Google').length;
  const emailCount = users.filter((u) => u.signInMethod === 'Email').length;
  const premiumCount = users.filter((u) => u.isPremium).length;
  const couponCount = users.filter((u) => !!(u.entitlementCoupon || (u.couponRedeemed && u.couponRedeemed !== 'LIFETIME_ADMIN'))).length;
  const trialCount = users.filter((u) => u.levels.some((l) => l.status === 'trial-active')).length;
  const activeThisWeek = users.filter((u) => activeWithinDays(u.lastLoginAt, 7)).length;

  const levelStats = (['LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as const).map((level) => ({
    level,
    trials: users.filter((u) => u.levels.some((l) => l.level === level && l.status !== 'none')).length,
    paid: users.filter((u) => u.fullAccess ? u.purchasedLevels.includes(level) : u.levels.some((l) => l.level === level && l.status === 'entitled')).length,
  }));

  // CSV export
  const exportCSV = () => {
    const header = ['Email', 'Name', 'Sign-in Method', 'Role', 'Access', 'Levels (trial/paid)', 'Coupon Used', 'Expiry Date', 'Quiz Attempts', 'MCQs', 'Mocks', 'Last Active', 'Joined Date'];
    const rows = filtered.map((u) => {
      const a = accessInfo(u);
      const coupon = activeCoupon(u) ?? '';
      const expiry = u.premiumUntil
        ? new Date(u.premiumUntil).toLocaleDateString('en-GB')
        : u.entitlementExpiry
        ? new Date(u.entitlementExpiry).toLocaleDateString('en-GB')
        : '';
      const levelsStr = u.fullAccess
        ? `All (bought: ${u.purchasedLevels.map((l) => LEVEL_LABEL[l]).join('/') || '—'})`
        : u.levels.filter((l) => l.status !== 'none').map((l) => `${LEVEL_LABEL[l.level]}:${l.status}`).join('; ');
      const lastActive = u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-GB') : 'Never';
      return [u.email, u.fullName ?? '', u.signInMethod, u.role, a.label, levelsStr, coupon, expiry, u.quizAttempts, u.mcqAttempted, u.mockAttempted, lastActive, new Date(u.joinedAt).toLocaleDateString('en-GB')];
    });
    const csv = [header, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chartix-users-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* Confirm Remove dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-zinc-900">Remove this account?</h2>
            <p className="mt-2 text-sm text-zinc-500">
              <span className="font-medium text-zinc-800">{confirmRemove.email}</span> will be permanently deleted.
              They can sign up again but will need to re-enter a coupon or pay.
            </p>
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={() => setConfirmRemove(null)}
                className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50"
              >
                Cancel
              </button>
              <button
                onClick={() => removeUser(confirmRemove.id)}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400">Lead Generation</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-950">Registered Users</h1>
          <p className="mt-0.5 text-sm text-zinc-500">Every account that has signed up on Chartix.in</p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={meta.total} color="bg-emerald-700" />
        <StatCard icon={Activity} label="Active (7d)" value={activeThisWeek} color="bg-teal-600" />
        <StatCard icon={Crown} label="Premium Users" value={premiumCount} color="bg-amber-500" />
        <StatCard icon={IndianRupee} label="Total Revenue" value={formatRupees(revenuePaise)} color="bg-emerald-600" />
        <StatCard icon={Mail} label="Email Sign-ups" value={emailCount} color="bg-zinc-700" />
        <StatCard icon={Chrome} label="Google Sign-ups" value={googleCount} color="bg-blue-600" />
        <StatCard icon={Ticket} label="Coupon Users" value={couponCount} color="bg-violet-600" />
        <StatCard icon={Users} label="Active Trials" value={trialCount} color="bg-orange-500" />
      </div>

      {/* Per-level breakdown — this is the "which level" answer at a glance */}
      <div className="rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
        <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-zinc-400">By CMT Level</p>
        <div className="grid grid-cols-3 gap-3">
          {levelStats.map((s) => (
            <div key={s.level} className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-4 py-3">
              <p className="text-sm font-bold text-zinc-800">{LEVEL_LABEL[s.level]}</p>
              <p className="mt-1 text-xs text-zinc-500">
                <span className="font-semibold text-orange-600">{s.trials}</span> trialed ·{' '}
                <span className="font-semibold text-emerald-600">{s.paid}</span> paid
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Search + Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search by email or name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-1 focus:ring-emerald-200"
          />
        </div>

        {/* Filter pills */}
        <div className="flex flex-wrap gap-1.5">
          {(['all', 'Email', 'Google', 'premium', 'coupon', 'free', 'trial', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? 'bg-emerald-700 text-white'
                  : 'border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
              }`}
            >
              {f === 'all' ? 'All' : f === 'premium' ? '⭐ Premium' : f === 'coupon' ? '🎟️ Coupon' : f === 'free' ? 'Free' : f === 'trial' ? '🔥 Trial' : f === 'LEVEL_1' ? 'Level 1' : f === 'LEVEL_2' ? 'Level 2' : f === 'LEVEL_3' ? 'Level 3' : f}
            </button>
          ))}
        </div>

        <button
          onClick={() => fetchUsers(search)}
          disabled={isLoading}
          className="flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium text-zinc-500 transition hover:bg-zinc-50 disabled:opacity-50"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Count */}
      <p className="text-xs text-zinc-400">
        Showing <span className="font-semibold text-zinc-700">{filtered.length}</span> of <span className="font-semibold text-zinc-700">{meta.total}</span> users
      </p>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-100">
            <thead className="bg-zinc-50">
              <tr>
                {['#', 'Email', 'Name', 'Sign-in', 'Access', 'Levels', 'Coupon', 'Expiry', 'Last Active', 'Quizzes', 'Joined', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-sm text-zinc-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((u, i) => {
                  const a = accessInfo(u);
                  const coupon = activeCoupon(u);
                  const expiry = u.premiumUntil ?? u.entitlementExpiry;
                  const styles: Record<string, string> = {
                    admin: 'bg-red-50 text-red-600',
                    lifetime: 'bg-violet-50 text-violet-700',
                    temp: 'bg-amber-50 text-amber-600',
                    coupon: 'bg-emerald-50 text-emerald-700',
                    expired: 'bg-zinc-100 text-zinc-400 line-through',
                    free: 'bg-zinc-100 text-zinc-500',
                  };
                  const Icon = a.tone === 'admin' ? Shield : a.tone === 'lifetime' ? InfinityIcon : (a.tone === 'temp' || a.tone === 'coupon') ? Crown : null;

                  return (
                    <tr key={u.id} className="hover:bg-zinc-50 transition">
                      <td className="px-4 py-3 text-xs text-zinc-400 tabular-nums">{i + 1}</td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-medium text-zinc-900">{u.email}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-zinc-500">{u.fullName ?? <span className="text-zinc-300">—</span>}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                          u.signInMethod === 'Google' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-600'
                        }`}>
                          {u.signInMethod === 'Google' ? (
                            <svg className="h-3 w-3" viewBox="0 0 24 24">
                              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                            </svg>
                          ) : (
                            <Mail className="h-3 w-3" />
                          )}
                          {u.signInMethod}
                        </span>
                      </td>

                      {/* Access */}
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[a.tone]}`}>
                          {Icon && <Icon className="h-3 w-3" />} {a.label}
                        </span>
                      </td>

                      {/* Levels — which CMT level(s) this user is trialing / has bought */}
                      <td className="px-4 py-3">
                        <LevelsCell u={u} />
                      </td>

                      {/* Coupon */}
                      <td className="px-4 py-3">
                        {coupon ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-mono font-semibold text-violet-700">
                            <Ticket className="h-3 w-3" />{coupon}
                          </span>
                        ) : u.couponRedeemed === 'LIFETIME_ADMIN' ? (
                          <span className="text-[11px] text-zinc-400">Admin granted</span>
                        ) : (
                          <span className="text-zinc-300 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Expiry */}
                      <td className="px-4 py-3 text-xs tabular-nums text-zinc-500">
                        {expiry ? (
                          (() => {
                            const d = new Date(expiry);
                            const expired = d <= new Date();
                            return (
                              <span className={expired ? 'text-red-400 line-through' : 'text-zinc-600'}>
                                {d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                              </span>
                            );
                          })()
                        ) : (
                          <span className="text-zinc-300">—</span>
                        )}
                      </td>

                      {/* Last Active */}
                      <td className="px-4 py-3 text-xs tabular-nums text-zinc-500">
                        {u.lastLoginAt ? (
                          <span className={activeWithinDays(u.lastLoginAt, 7) ? 'text-emerald-600 font-medium' : 'text-zinc-500'}>
                            {new Date(u.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                        ) : (
                          <span className="text-zinc-300">Never</span>
                        )}
                        {u.loginCount > 0 && <span className="ml-1 text-[10px] text-zinc-300">({u.loginCount}x)</span>}
                      </td>

                      <td className="px-4 py-3 text-sm tabular-nums text-zinc-500">
                        {u.quizAttempts}
                        {(u.mcqAttempted > 0 || u.mockAttempted > 0) && (
                          <span className="ml-1 text-[10px] text-zinc-300">({u.mcqAttempted} mcq, {u.mockAttempted} mock)</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs tabular-nums text-zinc-400">
                        {new Date(u.joinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        {u.role === 'ADMIN' ? (
                          <span className="text-[11px] text-zinc-300">—</span>
                        ) : updatingId === u.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                        ) : (
                          <div className="flex items-center gap-2">
                            {u.isPremium && !u.premiumUntil ? (
                              <button
                                onClick={() => updateAccess(u.id, 'revoke')}
                                className="rounded-lg border border-zinc-200 px-2.5 py-1 text-[11px] font-semibold text-zinc-500 transition hover:border-red-300 hover:text-red-600"
                              >
                                Revoke
                              </button>
                            ) : (
                              <button
                                onClick={() => updateAccess(u.id, 'grant_lifetime')}
                                className="inline-flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1 text-[11px] font-semibold text-white transition hover:bg-violet-700"
                              >
                                <InfinityIcon className="h-3 w-3" /> Grant Lifetime
                              </button>
                            )}
                            <button
                              onClick={() => setConfirmRemove(u)}
                              title="Remove account"
                              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 transition hover:border-red-300 hover:text-red-500"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
