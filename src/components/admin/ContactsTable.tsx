'use client';

import { useState } from 'react';
import { Mail, Phone, Clock, ChevronDown, ChevronUp, Loader2, MessageSquare, Inbox } from 'lucide-react';

type ContactStatus = 'NEW' | 'IN_PROGRESS' | 'RESOLVED' | 'SPAM';

type ContactSubmission = {
  id: string;
  fullName: string;
  email: string;
  mobile: string | null;
  subject: string;
  queryType: string;
  message: string;
  status: ContactStatus;
  ipAddress: string | null;
  createdAt: string;
};

const QUERY_LABELS: Record<string, string> = {
  GENERAL: 'General',
  COURSE_INFO: 'Course Info',
  TECHNICAL_SUPPORT: 'Tech Support',
  BILLING: 'Billing',
  PARTNERSHIP: 'Partnership',
  OTHER: 'Other',
};

const STATUS_CONFIG: Record<ContactStatus, { label: string; dot: string; bg: string }> = {
  NEW: { label: 'New', dot: 'bg-blue-500', bg: 'bg-blue-50 text-blue-700 ring-blue-100' },
  IN_PROGRESS: { label: 'In Progress', dot: 'bg-amber-500', bg: 'bg-amber-50 text-amber-700 ring-amber-100' },
  RESOLVED: { label: 'Resolved', dot: 'bg-emerald-500', bg: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
  SPAM: { label: 'Spam', dot: 'bg-red-400', bg: 'bg-red-50 text-red-600 ring-red-100' },
};

const STATUS_OPTIONS: ContactStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'];

function timeAgo(iso: string): string {
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

function ContactCard({ item, onStatusChange }: { item: ContactSubmission; onStatusChange: (id: string, status: ContactStatus) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);
  const cfg = STATUS_CONFIG[item.status];

  async function handleStatusChange(newStatus: ContactStatus) {
    if (newStatus === item.status) return;
    setUpdating(true);
    try {
      await onStatusChange(item.id, newStatus);
    } finally {
      setUpdating(false);
    }
  }

  return (
    <div className={`group rounded-xl border transition-all duration-200 ${
      expanded ? 'border-emerald-200 bg-white shadow-md shadow-emerald-50' : 'border-zinc-200/80 bg-white hover:border-zinc-300 hover:shadow-sm'
    } ${item.status === 'NEW' ? 'border-l-2 border-l-blue-400' : ''}`}>
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-start gap-3 px-4 py-3.5 text-left sm:px-5"
      >
        {/* Dot indicator */}
        <div className="mt-1.5 shrink-0">
          <div className={`h-2 w-2 rounded-full ${cfg.dot}`} />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-zinc-900">{item.fullName}</span>
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ring-1 ${cfg.bg}`}>
              {cfg.label}
            </span>
            <span className="rounded-full bg-zinc-50 px-2 py-0.5 text-[10px] font-medium text-zinc-500 ring-1 ring-zinc-100">
              {QUERY_LABELS[item.queryType] ?? item.queryType}
            </span>
          </div>
          <p className="mt-1 text-sm text-zinc-700 line-clamp-1">{item.subject}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              {item.email}
            </span>
            {item.mobile && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {item.mobile}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(item.createdAt)}
            </span>
          </div>
        </div>

        {/* Status dropdown + expand */}
        <div className="flex shrink-0 items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {updating ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <select
              value={item.status}
              onChange={(e) => handleStatusChange(e.target.value as ContactStatus)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-[11px] font-medium text-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-100"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-1 shrink-0 text-zinc-300 group-hover:text-zinc-500">
          {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-zinc-100 px-5 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">Message</p>
          <p className="mt-2 text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">{item.message}</p>
          <div className="mt-3 flex items-center gap-4 text-[11px] text-zinc-400">
            <span>{new Date(item.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Kolkata' })}</span>
            {item.ipAddress && <span>IP: {item.ipAddress}</span>}
          </div>
          <div className="mt-3">
            <a
              href={`mailto:${item.email}?subject=Re: ${encodeURIComponent(item.subject)}`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-emerald-600"
            >
              <Mail className="h-3 w-3" />
              Reply via email
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

export function ContactsTable({ initialItems }: { initialItems: ContactSubmission[] }) {
  const [items, setItems] = useState(initialItems);
  const [filterStatus, setFilterStatus] = useState<ContactStatus | 'ALL'>('ALL');
  const [error, setError] = useState('');

  async function handleStatusChange(id: string, status: ContactStatus) {
    setError('');
    try {
      const res = await fetch('/api/admin/contacts', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error('Failed to update');
      setItems((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
    } catch {
      setError('Failed to update status. Please try again.');
    }
  }

  const filtered = filterStatus === 'ALL' ? items : items.filter((i) => i.status === filterStatus);
  const newCount = items.filter((i) => i.status === 'NEW').length;

  const SEGMENTS: { key: ContactStatus | 'ALL'; label: string; count: number }[] = [
    { key: 'ALL', label: 'All', count: items.length },
    { key: 'NEW', label: 'New', count: items.filter((i) => i.status === 'NEW').length },
    { key: 'IN_PROGRESS', label: 'In Progress', count: items.filter((i) => i.status === 'IN_PROGRESS').length },
    { key: 'RESOLVED', label: 'Resolved', count: items.filter((i) => i.status === 'RESOLVED').length },
    { key: 'SPAM', label: 'Spam', count: items.filter((i) => i.status === 'SPAM').length },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 sm:text-2xl">Contact Messages</h1>
          <p className="mt-1 text-sm text-zinc-500">
            {items.length} total
            {newCount > 0 && <> &middot; <span className="font-semibold text-blue-600">{newCount} new</span></>}
          </p>
        </div>
      </div>

      {/* Segment tabs */}
      <div className="flex rounded-xl bg-zinc-100 p-1">
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            onClick={() => setFilterStatus(s.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              filterStatus === s.key
                ? 'bg-white text-zinc-900 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >
            {s.label}
            {s.count > 0 && <span className={`ml-1.5 ${filterStatus === s.key ? 'text-zinc-500' : 'text-zinc-400'}`}>{s.count}</span>}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      {/* Messages */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-zinc-200 py-16">
          <Inbox className="h-8 w-8 text-zinc-200" />
          <p className="text-sm text-zinc-400">No messages found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <ContactCard key={item.id} item={item} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
