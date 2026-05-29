'use client';

import { useState } from 'react';
import { Mail, Phone, Clock, ChevronDown, ChevronUp, CheckCircle2, Loader2, AlertCircle } from 'lucide-react';

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

const STATUS_CONFIG: Record<ContactStatus, { label: string; className: string }> = {
  NEW: { label: 'New', className: 'bg-blue-100 text-blue-800' },
  IN_PROGRESS: { label: 'In Progress', className: 'bg-yellow-100 text-yellow-800' },
  RESOLVED: { label: 'Resolved', className: 'bg-green-100 text-green-800' },
  SPAM: { label: 'Spam', className: 'bg-red-100 text-red-700' },
};

const STATUS_OPTIONS: ContactStatus[] = ['NEW', 'IN_PROGRESS', 'RESOLVED', 'SPAM'];

function StatusBadge({ status }: { status: ContactStatus }) {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${cfg.className}`}>
      {cfg.label}
    </span>
  );
}

function ContactRow({ item, onStatusChange }: { item: ContactSubmission; onStatusChange: (id: string, status: ContactStatus) => Promise<void> }) {
  const [expanded, setExpanded] = useState(false);
  const [updating, setUpdating] = useState(false);

  async function handleStatusChange(newStatus: ContactStatus) {
    if (newStatus === item.status) return;
    setUpdating(true);
    try {
      await onStatusChange(item.id, newStatus);
    } finally {
      setUpdating(false);
    }
  }

  const date = new Date(item.createdAt).toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  });

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      {/* Row header */}
      <div className="flex items-start gap-4 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-sm text-zinc-900">{item.fullName}</span>
            <StatusBadge status={item.status} />
            <span className="rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs text-zinc-500">
              {QUERY_LABELS[item.queryType] ?? item.queryType}
            </span>
          </div>
          <p className="mt-0.5 text-sm font-medium text-zinc-800">{item.subject}</p>
          <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-zinc-400">
            <span className="flex items-center gap-1">
              <Mail className="h-3 w-3" />
              <a href={`mailto:${item.email}`} className="hover:text-zinc-700 hover:underline">{item.email}</a>
            </span>
            {item.mobile && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {item.mobile}
              </span>
            )}
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {date}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-2">
          {updating ? (
            <Loader2 className="h-4 w-4 animate-spin text-zinc-400" />
          ) : (
            <select
              value={item.status}
              onChange={(e) => handleStatusChange(e.target.value as ContactStatus)}
              className="rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-700 focus:outline-none focus:ring-1 focus:ring-zinc-400"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
              ))}
            </select>
          )}
          <button
            onClick={() => setExpanded((v) => !v)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-zinc-200 text-zinc-400 transition hover:bg-zinc-50 hover:text-zinc-700"
          >
            {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Expanded message */}
      {expanded && (
        <div className="border-t border-zinc-100 bg-zinc-50 px-4 py-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-2">Message</p>
          <p className="text-sm leading-relaxed text-zinc-700 whitespace-pre-wrap">{item.message}</p>
          {item.ipAddress && (
            <p className="mt-3 text-xs text-zinc-400">IP: {item.ipAddress}</p>
          )}
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

  return (
    <div>
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-zinc-950">Contact Submissions</h1>
          <p className="mt-0.5 text-sm text-zinc-500">
            {items.length} total{newCount > 0 && ` · `}
            {newCount > 0 && <span className="font-semibold text-blue-700">{newCount} new</span>}
          </p>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1 rounded-xl border border-zinc-200 bg-zinc-50 p-1">
          {(['ALL', ...STATUS_OPTIONS] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                filterStatus === s
                  ? 'bg-white text-zinc-900 shadow-sm border border-zinc-200'
                  : 'text-zinc-500 hover:text-zinc-900'
              }`}
            >
              {s === 'ALL' ? 'All' : STATUS_CONFIG[s].label}
              {s !== 'ALL' && (
                <span className="ml-1.5 text-zinc-400">
                  {items.filter((i) => i.status === s).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
          <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 py-16 text-center">
          <CheckCircle2 className="h-10 w-10 text-zinc-300" />
          <p className="text-sm font-medium text-zinc-500">No submissions found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((item) => (
            <ContactRow key={item.id} item={item} onStatusChange={handleStatusChange} />
          ))}
        </div>
      )}
    </div>
  );
}
