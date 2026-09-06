'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, Download, Users, Crown, Shield, Loader2, Trash2,
  ChevronDown, ChevronUp, ArrowUpDown, X, ExternalLink,
  TrendingUp, Clock, Zap, Mail, Chrome,
} from 'lucide-react';

type CmtLevel = 'LEVEL_1' | 'LEVEL_2' | 'LEVEL_3';
const LEVEL_LABEL: Record<CmtLevel, string> = { LEVEL_1: 'L1', LEVEL_2: 'L2', LEVEL_3: 'L3' };
const LEVEL_FULL: Record<CmtLevel, string> = { LEVEL_1: 'Level 1', LEVEL_2: 'Level 2', LEVEL_3: 'Level 3' };

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

type Meta = { total: number; page: number; limit: number };
type Segment = 'all' | 'paid' | 'trial' | 'free';
type LevelFilter = 'any' | CmtLevel;
type SortKey = 'newest' | 'lastActive' | 'name' | 'quizzes';

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    return parts.length >= 2
      ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
      : parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function accessInfo(u: User): { label: string; tone: 'admin' | 'lifetime' | 'paid' | 'trial' | 'expired' | 'free' } {
  if (u.role === 'ADMIN') return { label: 'Admin', tone: 'admin' };
  if (u.isPremium && !u.premiumUntil) return { label: 'Lifetime', tone: 'lifetime' };
  if (u.isPremium && u.premiumUntil) {
    const until = new Date(u.premiumUntil);
    if (until > new Date()) return { label: `Paid`, tone: 'paid' };
    return { label: 'Expired', tone: 'expired' };
  }
  if (u.entitlementExpiry && new Date(u.entitlementExpiry) > new Date()) {
    return { label: 'Coupon', tone: 'paid' };
  }
  if (u.levels.some((l) => l.status === 'trial-active')) return { label: 'Trial', tone: 'trial' };
  if (u.levels.some((l) => l.status === 'trial-expired')) return { label: 'Trial ended', tone: 'expired' };
  return { label: 'Free', tone: 'free' };
}

function timeAgo(iso: string | null): string {
  if (!iso) return 'Never';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' });
}

function isActiveRecently(iso: string | null, days: number): boolean {
  if (!iso) return false;
  return Date.now() - new Date(iso).getTime() <= days * 86400000;
}

const TONE_STYLES: Record<string, string> = {
  admin: 'bg-red-50 text-red-700 ring-red-100',
  lifetime: 'bg-violet-50 text-violet-700 ring-violet-100',
  paid: 'bg-emerald-50 text-emerald-700 ring-emerald-100',
  trial: 'bg-amber-50 text-amber-700 ring-amber-100',
  expired: 'bg-zinc-100 text-zinc-400 ring-zinc-200',
  free: 'bg-zinc-50 text-zinc-500 ring-zinc-200',
};

const AVATAR_COLORS = [
  'bg-emerald-600', 'bg-teal-600', 'bg-cyan-600', 'bg-blue-600',
  'bg-indigo-600', 'bg-violet-600', 'bg-purple-600', 'bg-pink-600',
  'bg-rose-600', 'bg-orange-600', 'bg-amber-600',
];

function avatarColor(email: string): string {
  let hash = 0;
  for (let i = 0; i < email.length; i++) hash = ((hash << 5) - hash + email.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function LevelPill({ badge }: { badge: LevelBadge }) {
  if (badge.status === 'none') return null;
  const label = LEVEL_LABEL[badge.level];
  if (badge.status === 'entitled') {
    return (
      <span className="inline-flex items-center gap-0.5 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 ring-1 ring-emerald-200/60">
        {label} <CheckIcon />
      </span>
    );
  }
  if (badge.status === 'trial-active') {
    return (
      <span
        className="inline-flex items-center gap-0.5 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 ring-1 ring-amber-200/60"
        title={`Day ${badge.dayOfTrial}, ${badge.daysRemaining}d left`}
      >
        {label} d{badge.dayOfTrial}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-0.5 rounded-md bg-zinc-100 px-1.5 py-0.5 text-[10px] font-bold text-zinc-400 line-through ring-1 ring-zinc-200/40">
      {label}
    </span>
  );
}

function CheckIcon() {
  return (
    <svg className="h-2.5 w-2.5" viewBox="0 0 12 12" fill="none">
      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function UserCard({
  u, index, expanded, onToggle, onGrant, onRevoke, onRemove, updating,
}: {
  u: User; index: number; expanded: boolean;
  onToggle: () => void; onGrant: () => void; onRevoke: () => void; onRemove: () => void;
  updating: boolean;
}) {
  const a = accessInfo(u);
  const activeLevels = u.levels.filter((l) => l.status !== 'none');
  const coupon = u.entitlementCoupon || (u.couponRedeemed && u.couponRedeemed !== 'LIFETIME_ADMIN' ? u.couponRedeemed : null);
  const expiry = u.premiumUntil ?? u.entitlementExpiry;
  const isActive7d = isActiveRecently(u.lastLoginAt, 7);

  return (
    <div className={`group rounded-xl border transition-all duration-200 ${expanded ? 'border-emerald-200 bg-white shadow-md shadow-emerald-50' : 'border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-sm'}`}>
      {/* Main row */}
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-3 px-4 py-3 text-left sm:gap-4 sm:px-5"
      >
        {/* Index */}
        <span className="hidden w-6 shrink-0 text-right text-xs tabular-nums text-zinc-300 sm:block">{index}</span>

        {/* Avatar */}
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${avatarColor(u.email)}`}>
          {getInitials(u.fullName, u.email)}
        </div>

        {/* Name + Email */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-zinc-900">
              {u.fullName || u.email.split('@')[0]}
            </span>
            <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${TONE_STYLES[a.tone]}`}>
              {a.tone === 'admin' && <Shield className="mr-0.5 h-2.5 w-2.5" />}
              {(a.tone === 'lifetime' || a.tone === 'paid') && <Crown className="mr-0.5 h-2.5 w-2.5" />}
              {a.label}
            </span>
          </div>
          <div className="mt-0.5 flex items-center gap-2">
            <span className="truncate text-xs text-zinc-400">{u.email}</span>
          </div>
        </div>

        {/* Level pills — desktop only */}
        <div className="hidden items-center gap-1 lg:flex">
          {u.fullAccess ? (
            <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-200/60">All</span>
          ) : activeLevels.length > 0 ? (
            activeLevels.map((l) => <LevelPill key={l.level} badge={l} />)
          ) : (
            <span className="text-[10px] text-zinc-300">-</span>
          )}
        </div>

        {/* Last active */}
        <div className="hidden w-20 shrink-0 text-right sm:block">
          <span className={`text-xs ${isActive7d ? 'font-medium text-emerald-600' : 'text-zinc-400'}`}>
            {timeAgo(u.lastLoginAt)}
          </span>
        </div>

        {/* Quizzes */}
        <div className="hidden w-14 shrink-0 text-right md:block">
          <span className="text-xs tabular-nums text-zinc-500">{u.quizAttempts || '-'}</span>
        </div>

        {/* Expand chevron */}
        <div className="shrink-0 text-zinc-300 group-hover:text-zinc-500">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="border-t border-zinc-100 px-5 py-4">
          <div className="grid grid-cols-2 gap-x-8 gap-y-3 sm:grid-cols-3 lg:grid-cols-4">
            <DetailItem label="Sign-in" value={u.signInMethod} icon={u.signInMethod === 'Google' ? <GoogleIcon /> : <Mail className="h-3 w-3 text-zinc-400" />} />
            <DetailItem label="Joined" value={new Date(u.joinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} />
            <DetailItem label="Last active" value={u.lastLoginAt ? `${new Date(u.lastLoginAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })} (${u.loginCount} logins)` : 'Never'} />
            <DetailItem
              label="Practice"
              value={u.mcqAttempted > 0 || u.mockAttempted > 0
                ? `${u.mcqAttempted} MCQs, ${u.mockAttempted} mocks across ${u.quizAttempts} sessions`
                : 'No practice yet'}
            />
            {coupon && <DetailItem label="Coupon" value={coupon} mono />}
            {expiry && (
              <DetailItem
                label="Access expires"
                value={new Date(expiry).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                warn={new Date(expiry) <= new Date()}
              />
            )}
          </div>

          {/* Levels detail */}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-[11px] font-medium uppercase tracking-wider text-zinc-400">Levels</span>
            {u.role === 'ADMIN' ? (
              <span className="text-xs text-zinc-400">Full admin access</span>
            ) : u.fullAccess ? (
              <>
                <span className="rounded-md bg-violet-50 px-2 py-0.5 text-[11px] font-bold text-violet-700 ring-1 ring-violet-200/60">All levels</span>
                {u.purchasedLevels.length > 0 && (
                  <span className="text-[11px] text-zinc-400">
                    Bought: {u.purchasedLevels.map((l) => LEVEL_LABEL[l]).join(', ')}
                  </span>
                )}
              </>
            ) : (
              u.levels.map((l) => {
                if (l.status === 'none') return (
                  <span key={l.level} className="rounded-md bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-300 ring-1 ring-zinc-100">
                    {LEVEL_FULL[l.level]}
                  </span>
                );
                return (
                  <span key={l.level} className="flex items-center gap-1">
                    <LevelPill badge={l} />
                    {l.status === 'trial-active' && (
                      <span className="text-[10px] text-amber-600">{l.daysRemaining}d left</span>
                    )}
                  </span>
                );
              })
            )}
          </div>

          {/* Actions */}
          {u.role !== 'ADMIN' && (
            <div className="mt-4 flex items-center gap-2 border-t border-zinc-100 pt-4">
              {updating ? (
                <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
              ) : (
                <>
                  {u.isPremium && !u.premiumUntil ? (
                    <button
                      onClick={(e) => { e.stopPropagation(); onRevoke(); }}
                      className="rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-500 transition hover:border-red-300 hover:text-red-600"
                    >
                      Revoke access
                    </button>
                  ) : (
                    <button
                      onClick={(e) => { e.stopPropagation(); onGrant(); }}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
                    >
                      <Crown className="h-3 w-3" />
                      Grant lifetime
                    </button>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); onRemove(); }}
                    className="rounded-lg border border-zinc-200 p-1.5 text-zinc-400 transition hover:border-red-300 hover:text-red-500"
                    title="Remove account"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DetailItem({ label, value, icon, mono, warn }: { label: string; value: string; icon?: React.ReactNode; mono?: boolean; warn?: boolean }) {
  return (
    <div>
      <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      <p className={`mt-0.5 flex items-center gap-1 text-sm ${warn ? 'text-red-500 line-through' : 'text-zinc-800'} ${mono ? 'font-mono text-xs' : ''}`}>
        {icon}
        {value}
      </p>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-3 w-3" viewBox="0 0 24 24">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function UsersTable({ initialUsers, initialMeta, revenueLabel }: { initialUsers: User[]; initialMeta: Meta; revenueLabel: string }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [revenue] = useState(revenueLabel);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [segment, setSegment] = useState<Segment>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('any');
  const [sortBy, setSortBy] = useState<SortKey>('newest');
  const [expandedId, setExpandedId] = useState<string | null>(null);
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
        setExpandedId(null);
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
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchUsers(search), 300);
    return () => clearTimeout(t);
  }, [search, fetchUsers]);

  // Stats
  const stats = useMemo(() => {
    const active7d = users.filter((u) => isActiveRecently(u.lastLoginAt, 7)).length;
    const paid = users.filter((u) => u.isPremium || (u.entitlementExpiry && new Date(u.entitlementExpiry) > new Date())).length;
    const trial = users.filter((u) => u.levels.some((l) => l.status === 'trial-active')).length;
    const free = users.filter((u) => !u.isPremium && !u.levels.some((l) => l.status === 'trial-active') && !(u.entitlementExpiry && new Date(u.entitlementExpiry) > new Date())).length;
    const google = users.filter((u) => u.signInMethod === 'Google').length;
    const levelCounts = (['LEVEL_1', 'LEVEL_2', 'LEVEL_3'] as CmtLevel[]).map((level) => ({
      level,
      total: users.filter((u) => u.fullAccess || u.levels.some((l) => l.level === level && l.status !== 'none')).length,
      trial: users.filter((u) => u.levels.some((l) => l.level === level && l.status === 'trial-active')).length,
      paid: users.filter((u) => u.fullAccess ? u.purchasedLevels.includes(level) : u.levels.some((l) => l.level === level && l.status === 'entitled')).length,
    }));
    return { active7d, paid, trial, free, google, levelCounts };
  }, [users]);

  // Filter + sort
  const filtered = useMemo(() => {
    let list = users;
    if (segment === 'paid') list = list.filter((u) => u.isPremium || (u.entitlementExpiry && new Date(u.entitlementExpiry) > new Date()));
    else if (segment === 'trial') list = list.filter((u) => u.levels.some((l) => l.status === 'trial-active'));
    else if (segment === 'free') list = list.filter((u) => {
      const isPaid = u.isPremium || (u.entitlementExpiry && new Date(u.entitlementExpiry) > new Date());
      const isTrial = u.levels.some((l) => l.status === 'trial-active');
      return !isPaid && !isTrial && u.role !== 'ADMIN';
    });

    if (levelFilter !== 'any') {
      list = list.filter((u) =>
        u.fullAccess || u.levels.some((l) => l.level === levelFilter && l.status !== 'none')
      );
    }

    const sorted = [...list];
    if (sortBy === 'newest') sorted.sort((a, b) => new Date(b.joinedAt).getTime() - new Date(a.joinedAt).getTime());
    else if (sortBy === 'lastActive') sorted.sort((a, b) => {
      const at = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
      const bt = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
      return bt - at;
    });
    else if (sortBy === 'name') sorted.sort((a, b) => (a.fullName ?? a.email).localeCompare(b.fullName ?? b.email));
    else if (sortBy === 'quizzes') sorted.sort((a, b) => b.quizAttempts - a.quizAttempts);

    return sorted;
  }, [users, segment, levelFilter, sortBy]);

  // CSV export
  const exportCSV = () => {
    const header = ['Email', 'Name', 'Sign-in', 'Access', 'Levels', 'Coupon', 'Expiry', 'Quiz Attempts', 'MCQs', 'Mocks', 'Last Active', 'Logins', 'Joined'];
    const rows = filtered.map((u) => {
      const a = accessInfo(u);
      const coupon = u.entitlementCoupon || (u.couponRedeemed && u.couponRedeemed !== 'LIFETIME_ADMIN' ? u.couponRedeemed : '');
      const expiry = u.premiumUntil ?? u.entitlementExpiry;
      const levelsStr = u.fullAccess ? 'All' : u.levels.filter((l) => l.status !== 'none').map((l) => `${LEVEL_LABEL[l.level]}:${l.status}`).join('; ');
      return [u.email, u.fullName ?? '', u.signInMethod, a.label, levelsStr, coupon, expiry ? new Date(expiry).toLocaleDateString('en-GB') : '', u.quizAttempts, u.mcqAttempted, u.mockAttempted, u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString('en-GB') : 'Never', u.loginCount, new Date(u.joinedAt).toLocaleDateString('en-GB')];
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

  const SEGMENTS: { key: Segment; label: string; count: number }[] = [
    { key: 'all', label: 'All', count: meta.total },
    { key: 'paid', label: 'Paid', count: stats.paid },
    { key: 'trial', label: 'Trial', count: stats.trial },
    { key: 'free', label: 'Free', count: stats.free },
  ];

  const SORTS: { key: SortKey; label: string }[] = [
    { key: 'newest', label: 'Newest first' },
    { key: 'lastActive', label: 'Last active' },
    { key: 'name', label: 'Name A-Z' },
    { key: 'quizzes', label: 'Most quizzes' },
  ];

  return (
    <div className="space-y-6">
      {/* Confirm Remove dialog */}
      {confirmRemove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="mx-4 w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-base font-bold text-zinc-900">Remove this account?</h2>
            <p className="mt-2 text-sm text-zinc-500">
              <span className="font-medium text-zinc-800">{confirmRemove.email}</span> will be permanently deleted.
            </p>
            <div className="mt-5 flex gap-3 justify-end">
              <button onClick={() => setConfirmRemove(null)} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-50">
                Cancel
              </button>
              <button onClick={() => removeUser(confirmRemove.id)} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700">
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">Users & Leads</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {meta.total} registered accounts
          </p>
        </div>
        <button
          onClick={exportCSV}
          className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-50"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </button>
      </div>

      {/* Metric strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        <MetricCard icon={Users} label="Total" value={meta.total} />
        <MetricCard icon={Zap} label="Active 7d" value={stats.active7d} accent />
        <MetricCard icon={Crown} label="Paid" value={stats.paid} />
        <MetricCard icon={Clock} label="On trial" value={stats.trial} />
        <MetricCard icon={TrendingUp} label="Revenue" value={revenue} wide />
      </div>

      {/* Search + Segments + Sort */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
          <input
            type="search"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border border-zinc-200 bg-white py-2.5 pl-10 pr-9 text-sm text-zinc-800 placeholder:text-zinc-400 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          {isLoading && (
            <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-zinc-400" />
          )}
        </div>

        {/* Segment tabs */}
        <div className="flex rounded-xl bg-zinc-100 p-1">
          {SEGMENTS.map((s) => (
            <button
              key={s.key}
              onClick={() => setSegment(s.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                segment === s.key
                  ? 'bg-white text-zinc-900 shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
            >
              {s.label}
              <span className={`ml-1.5 ${segment === s.key ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.count}</span>
            </button>
          ))}
        </div>

        {/* Sort */}
        <div className="relative">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortKey)}
            className="appearance-none rounded-xl border border-zinc-200 bg-white py-2.5 pl-3 pr-8 text-xs font-medium text-zinc-600 focus:border-emerald-400 focus:outline-none focus:ring-2 focus:ring-emerald-100"
          >
            {SORTS.map((s) => (
              <option key={s.key} value={s.key}>{s.label}</option>
            ))}
          </select>
          <ArrowUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-zinc-400" />
        </div>
      </div>

      {/* Level filter */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Level</span>
        {([{ key: 'any' as LevelFilter, label: 'Any level', count: meta.total }, ...stats.levelCounts.map((s) => ({
          key: s.level as LevelFilter,
          label: LEVEL_FULL[s.level],
          count: s.total,
          trial: s.trial,
          paid: s.paid,
        }))]).map((item) => (
          <button
            key={item.key}
            onClick={() => setLevelFilter(item.key)}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              levelFilter === item.key
                ? 'bg-emerald-700 text-white shadow-sm'
                : 'border border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-800'
            }`}
          >
            {item.label}
            <span className={`tabular-nums ${levelFilter === item.key ? 'text-emerald-200' : 'text-zinc-400'}`}>{item.count}</span>
            {'trial' in item && item.key !== 'any' && (
              <span className={`text-[10px] tabular-nums ${levelFilter === item.key ? 'text-emerald-300' : 'text-zinc-300'}`}>
                ({item.trial}t / {item.paid}p)
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs text-zinc-400">
        Showing <span className="font-semibold text-zinc-600">{filtered.length}</span>
        {filtered.length !== meta.total && <> of {meta.total}</>}
      </p>

      {/* User list */}
      <div className="space-y-2">
        {/* List header — desktop */}
        <div className="hidden items-center gap-3 px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-zinc-400 sm:flex sm:gap-4">
          <span className="hidden w-6 sm:block">#</span>
          <span className="w-9" />
          <span className="flex-1">User</span>
          <span className="hidden lg:block lg:w-24">Levels</span>
          <span className="w-20 text-right">Active</span>
          <span className="hidden w-14 text-right md:block">Quizzes</span>
          <span className="w-4" />
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-16">
            <Users className="h-8 w-8 text-zinc-200" />
            <p className="text-sm text-zinc-400">No users found</p>
          </div>
        ) : (
          filtered.map((u, i) => (
            <UserCard
              key={u.id}
              u={u}
              index={i + 1}
              expanded={expandedId === u.id}
              onToggle={() => setExpandedId(expandedId === u.id ? null : u.id)}
              onGrant={() => updateAccess(u.id, 'grant_lifetime')}
              onRevoke={() => updateAccess(u.id, 'revoke')}
              onRemove={() => setConfirmRemove(u)}
              updating={updatingId === u.id}
            />
          ))
        )}
      </div>
    </div>
  );
}

function MetricCard({ icon: Icon, label, value, accent, wide }: { icon: React.ElementType; label: string; value: number | string; accent?: boolean; wide?: boolean }) {
  return (
    <div className={`flex items-center gap-3 rounded-xl border border-zinc-200/80 bg-white px-4 py-3 ${wide ? 'col-span-2 sm:col-span-1' : ''}`}>
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${accent ? 'bg-emerald-50 text-emerald-600' : 'bg-zinc-50 text-zinc-500'}`}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className={`text-lg font-bold tabular-nums ${accent ? 'text-emerald-700' : 'text-zinc-900'}`}>{value}</p>
        <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">{label}</p>
      </div>
    </div>
  );
}
