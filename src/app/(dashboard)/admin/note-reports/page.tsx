'use client';

import { useCallback, useEffect, useState } from 'react';
import { Flag, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type ReportStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED';

interface NoteReport {
  id: string;
  noteId: string;
  userId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  note: {
    id: string;
    title: string;
    subtopic: {
      id: string;
      title: string;
      chapter: {
        id: string;
        title: string;
      } | null;
    } | null;
  };
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

interface ReportsResponse {
  success: boolean;
  data: {
    reports: NoteReport[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
  error?: { message: string };
}

export default function NoteReportsPage() {
  const [reports, setReports] = useState<NoteReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('PENDING');
  const [searchNoteId, setSearchNoteId] = useState('');

  const fetchReports = useCallback(async (pageNum: number, status: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        pageSize: pageSize.toString(),
        ...(status && { status }),
        ...(searchNoteId && { noteId: searchNoteId }),
      });

      const response = await fetch(`/api/admin/note-reports?${params}`);
      const data: ReportsResponse = await response.json();

      if (!data.success) {
        setError(data.error?.message || 'Failed to fetch reports');
        return;
      }

      setReports(data.data.reports);
      setTotalPages(data.data.pagination.totalPages);
      setError(null);
    } catch (err) {
      setError('Error fetching reports');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [pageSize, searchNoteId]);

  useEffect(() => {
    setPage(1);
    fetchReports(1, statusFilter);
  }, [statusFilter, searchNoteId]);

  const updateReportStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      const response = await fetch('/api/admin/note-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: newStatus }),
      });

      const data = await response.json();
      if (!data.success) {
        alert(data.error?.message || 'Failed to update report');
        return;
      }

      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert('Error updating report');
      console.error(err);
    }
  };

  const getStatusColor = (status: ReportStatus): string => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'REVIEWED':
        return 'bg-blue-100 text-blue-800';
      case 'DISMISSED':
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-[2rem] border border-white/70 bg-white/85 p-6 shadow-soft backdrop-blur sm:p-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
              <Flag className="h-4 w-4" />
              Note reports
            </div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Keep study notes polished and accurate.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              Review reported notes, identify issues quickly, and keep the learning flow reliable.
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Queue</p>
            <p className="mt-2 text-2xl font-semibold text-zinc-950">{reports.length}</p>
          </div>
        </div>
      </div>

      <Card className="border-white/70 bg-white/90 p-5 shadow-sm">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-700">Status</label>
              <Select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as ReportStatus | '')}
              >
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="REVIEWED">Reviewed</option>
                <option value="DISMISSED">Dismissed</option>
              </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-700">Note ID</label>
              <Input
                type="text"
                placeholder="Search by note ID"
                value={searchNoteId}
                onChange={(e) => setSearchNoteId(e.target.value)}
              />
          </div>
          <div className="flex items-end">
            <div className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              <Search className="h-4 w-4" />
              <span>Scan note issues quickly</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        {loading ? (
          <Card className="p-12 text-center shadow-sm">
            <p className="text-zinc-600">Loading reports...</p>
          </Card>
        ) : error ? (
          <Card className="border-red-200 bg-red-50 p-6">
            <p className="text-red-800">{error}</p>
          </Card>
        ) : reports.length === 0 ? (
          <Card className="p-12 text-center shadow-sm">
            <div className="mx-auto mb-4 inline-flex rounded-full bg-emerald-50 p-3 text-emerald-600">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <p className="text-zinc-600">No reports found</p>
          </Card>
        ) : (
          <>
            <Card className="overflow-hidden border-white/70 bg-white/90 shadow-sm">
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-zinc-100 bg-zinc-50">
                    <tr>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-zinc-900">Note</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-zinc-900">Reporter</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-zinc-900">Reason</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-zinc-900">Status</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-zinc-900">Date</th>
                      <th className="px-5 py-4 text-left text-sm font-semibold text-zinc-900">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {reports.map((report) => (
                      <tr key={report.id} className="hover:bg-zinc-50/80">
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-col gap-1">
                            <span className="text-sm font-semibold text-zinc-900">
                              {report.note.title}
                            </span>
                            <div className="mt-1 text-xs text-zinc-500">
                              {report.note.subtopic?.chapter?.title && (
                                <span>{report.note.subtopic.chapter.title}</span>
                              )}
                              {report.note.subtopic?.title && (
                                <span> › {report.note.subtopic.title}</span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="text-sm">
                            <div className="font-semibold text-zinc-900">
                              {report.user.fullName || 'Unknown'}
                            </div>
                            <div className="text-zinc-500">{report.user.email}</div>
                          </div>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="max-w-xs text-sm leading-6 text-zinc-700">{report.reason}</p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(report.status)}`}>
                            {report.status}
                          </span>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <p className="text-sm text-zinc-600">
                            {new Date(report.createdAt).toLocaleDateString()}
                          </p>
                        </td>
                        <td className="px-5 py-4 align-top">
                          <div className="flex flex-wrap gap-2">
                            {report.status !== 'REVIEWED' && (
                              <Button
                                size="sm"
                                onClick={() => updateReportStatus(report.id, 'REVIEWED')}
                                className="bg-blue-600 hover:bg-blue-700"
                              >
                                Mark Reviewed
                              </Button>
                            )}
                            {report.status !== 'DISMISSED' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => updateReportStatus(report.id, 'DISMISSED')}
                              >
                                Dismiss
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {totalPages > 1 && (
              <div className="mt-6 flex items-center justify-between">
                <p className="text-sm text-slate-600">
                  Page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page === 1}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage(Math.min(totalPages, page + 1))}
                    disabled={page === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}