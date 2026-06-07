'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Download, Users, Mail, Chrome, RefreshCw, Crown, Shield, Infinity as InfinityIcon, Loader2 } from 'lucide-react';

type User = {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isPremium: boolean;
  premiumUntil: string | null;
  signInMethod: 'Email' | 'Google';
  quizAttempts: number;
  joinedAt: string;
};

// Works out a user's current access state for display.
function accessInfo(u: User): { label: string; tone: 'admin' | 'lifetime' | 'temp' | 'expired' | 'free' } {
  if (u.role === 'ADMIN') return { label: 'Admin', tone: 'admin' };
  if (u.isPremium && !u.premiumUntil) return { label: 'Lifetime', tone: 'lifetime' };
  if (u.isPremium && u.premiumUntil) {
    const until = new Date(u.premiumUntil);
    if (until > new Date()) {
      return { label: `Until ${until.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}`, tone: 'temp' };
    }
    return { label: 'Expired', tone: 'expired' };
  }
  return { label: 'Free', tone: 'free' };
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

export function UsersTable({ initialUsers, initialMeta }: { initialUsers: User[]; initialMeta: Meta }) {
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [meta, setMeta] = useState<Meta>(initialMeta);
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'Email' | 'Google' | 'premium'>('all');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
          u.id === userId ? { ...u, isPremium: json.data.isPremium, premiumUntil: json.data.premiumUntil } : u,
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

  const filtered = users.filter((u) => {
    if (filter === 'Email') return u.signInMethod === 'Email';
    if (filter === 'Google') return u.signInMethod === 'Google';
    if (filter === 'premium') return u.isPremium;
    return true;
  });

  const googleCount = users.filter((u) => u.signInMethod === 'Google').length;
  const emailCount = users.filter((u) => u.signInMethod === 'Email').length;
  const premiumCount = users.filter((u) => u.isPremium).length;

  // CSV export
  const exportCSV = () => {
    const header = ['Email', 'Name', 'Sign-in Method', 'Role', 'Premium', 'Quiz Attempts', 'Joined Date'];
    const rows = filtered.map((u) => [
      u.email,
      u.fullName ?? '',
      u.signInMethod,
      u.role,
      u.isPremium ? 'Yes' : 'No',
      u.quizAttempts,
      new Date(u.joinedAt).toLocaleDateString('en-GB'),
    ]);
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
        <StatCard icon={Mail} label="Email Sign-ups" value={emailCount} color="bg-zinc-700" />
        <StatCard icon={Chrome} label="Google Sign-ups" value={googleCount} color="bg-blue-600" />
        <StatCard icon={Crown} label="Premium Users" value={premiumCount} color="bg-amber-500" />
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
        <div className="flex gap-1.5">
          {(['all', 'Email', 'Google', 'premium'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition ${
                filter === f
                  ? 'bg-emerald-700 text-white'
                  : 'border border-zinc-200 bg-white text-zinc-500 hover:border-zinc-300 hover:text-zinc-800'
              }`}
            >
              {f === 'all' ? 'All' : f === 'premium' ? '⭐ Premium' : f}
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
                {['#', 'Email', 'Name', 'Sign-in', 'Access', 'Quizzes', 'Joined', 'Action'].map((h) => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-sm text-zinc-400">
                    No users found
                  </td>
                </tr>
              ) : (
                filtered.map((u, i) => (
                  <tr key={u.id} className="hover:bg-zinc-50 transition">
                    <td className="px-4 py-3 text-xs text-zinc-400 tabular-nums">{i + 1}</td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-zinc-900">{u.email}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{u.fullName ?? <span className="text-zinc-300">—</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                        u.signInMethod === 'Google'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-zinc-100 text-zinc-600'
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
                    <td className="px-4 py-3">
                      {(() => {
                        const a = accessInfo(u);
                        const styles: Record<string, string> = {
                          admin: 'bg-red-50 text-red-600',
                          lifetime: 'bg-violet-50 text-violet-700',
                          temp: 'bg-amber-50 text-amber-600',
                          expired: 'bg-zinc-100 text-zinc-400 line-through',
                          free: 'bg-zinc-100 text-zinc-500',
                        };
                        const Icon = a.tone === 'admin' ? Shield : a.tone === 'lifetime' ? InfinityIcon : a.tone === 'temp' ? Crown : null;
                        return (
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${styles[a.tone]}`}>
                            {Icon && <Icon className="h-3 w-3" />} {a.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-4 py-3 text-sm tabular-nums text-zinc-500">{u.quizAttempts}</td>
                    <td className="px-4 py-3 text-xs tabular-nums text-zinc-400">
                      {new Date(u.joinedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3">
                      {u.role === 'ADMIN' ? (
                        <span className="text-[11px] text-zinc-300">—</span>
                      ) : updatingId === u.id ? (
                        <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
                      ) : u.isPremium && !u.premiumUntil ? (
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
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
