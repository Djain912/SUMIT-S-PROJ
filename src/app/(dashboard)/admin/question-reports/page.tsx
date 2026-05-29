'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Flag, Search, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';

type ReportStatus = 'PENDING' | 'REVIEWED' | 'DISMISSED';

interface QuestionReport {
  id: string;
  questionId: string;
  userId: string;
  reason: string;
  status: ReportStatus;
  createdAt: string;
  question: {
    id: string;
    promptJson: Record<string, unknown>;
    difficulty: string | null;
    level: string | null;
    chapter?: {
      id: string;
      title: string;
    } | null;
    subtopic?: {
      id: string;
      title: string;
    } | null;
  } | null;
  user: {
    id: string;
    email: string;
    fullName: string | null;
  };
}

interface ReportsResponse {
  success: boolean;
  data: {
    reports: QuestionReport[];
    pagination: {
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    };
  };
  error?: { message: string };
}

export default function QuestionReportsPage() {
  const [reports, setReports] = useState<QuestionReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const [totalPages, setTotalPages] = useState(0);
  const [statusFilter, setStatusFilter] = useState<ReportStatus | ''>('PENDING');
  const [searchQuestionId, setSearchQuestionId] = useState('');

  const fetchReports = useCallback(async (pageNum: number, status: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pageNum.toString(),
        pageSize: pageSize.toString(),
        ...(status && { status }),
        ...(searchQuestionId && { questionId: searchQuestionId }),
      });

      const response = await fetch(`/api/admin/question-reports?${params}`);
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
  }, [pageSize, searchQuestionId]);

  useEffect(() => {
    if (page !== 1) {
      setPage(1);
    }
  }, [statusFilter, searchQuestionId, page]);

  useEffect(() => {
    void fetchReports(page, statusFilter);
  }, [fetchReports, page, statusFilter]);

  const updateReportStatus = async (reportId: string, newStatus: ReportStatus) => {
    try {
      const response = await fetch('/api/admin/question-reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reportId, status: newStatus }),
      });

      const data = await response.json();
      if (!data.success) {
        alert(data.error?.message || 'Failed to update report');
        return;
      }

      // Update local state
      setReports((prev) =>
        prev.map((r) => (r.id === reportId ? { ...r, status: newStatus } : r))
      );
    } catch (err) {
      alert('Error updating report');
      console.error(err);
    }
  };

  const getQuestionPreview = (promptJson: Record<string, unknown> | string): string => {
    if (!promptJson) return '[No question content]';
    if (typeof promptJson === 'string') return promptJson.substring(0, 150);
    
    const json = promptJson as Record<string, unknown>;
    
    // Handle TipTap/ProseMirror JSON format: {"type":"doc","content":[{"type":"paragraph","content":[...]}]}
    if (json.content && Array.isArray(json.content)) {
      const content = json.content as Array<{ type?: string; content?: unknown[]; text?: string }>;
      for (const block of content) {
        // Check for text property directly
        if (block.text) return String(block.text).substring(0, 150);
        // Check nested content array for text
        if (block.content && Array.isArray(block.content)) {
          for (const inner of block.content) {
            if (typeof inner === 'object' && inner !== null) {
              const text = (inner as { text?: string }).text;
              if (text) return text.substring(0, 150);
            }
          }
        }
      }
    }
    
    // Handle legacy blocks format
    if (json.blocks && Array.isArray(json.blocks)) {
      const blocks = json.blocks as Array<{ text?: string; content?: unknown }>;
      for (const block of blocks) {
        if (block.text) return block.text.substring(0, 150);
      }
    }
    
    // Handle text directly
    if (json.text) return String(json.text).substring(0, 150);
    if (json.prompt) return String(json.prompt).substring(0, 150);
    
    // If nothing found, return a placeholder
    return '[Empty question content]';
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
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.22em] text-orange-700">
              <Flag className="h-4 w-4" />
              Question reports
            </div>
            <h1 className="font-heading text-3xl font-semibold tracking-tight text-zinc-950 sm:text-4xl">
              Review reports, fix content, keep quizzes trustworthy.
            </h1>
            <p className="max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
              See what users reported, who reported it, and what needs a correction before the next quiz session.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[20rem] lg:grid-cols-1 xl:grid-cols-2">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-blue-700">Reports</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950">{reports.length}</p>
            </div>
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700">Status</p>
              <p className="mt-2 text-2xl font-semibold text-zinc-950">{statusFilter || 'All'}</p>
            </div>
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
              <option value="">All status</option>
              <option value="PENDING">Pending</option>
              <option value="REVIEWED">Reviewed</option>
              <option value="DISMISSED">Dismissed</option>
            </Select>
          </div>
          <div>
            <label className="mb-2 block text-sm font-semibold text-zinc-700">Question ID</label>
            <Input
              type="text"
              placeholder="Search by question ID"
              value={searchQuestionId}
              onChange={(e) => setSearchQuestionId(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <div className="flex w-full items-center gap-2 rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-500">
              <Search className="h-4 w-4" />
              <span>Use filters to focus the review queue</span>
            </div>
          </div>
        </div>
      </Card>

      <div className="space-y-6">
        {loading ? (
          <Card className="border-white/70 bg-white/90 p-6 shadow-sm">
            <div className="space-y-4 animate-pulse">
              {Array.from({ length: 6 }).map((_, index) => (
                <div key={index} className="grid grid-cols-6 gap-3 rounded-xl border border-zinc-100 p-4">
                  <div className="col-span-2 h-4 rounded bg-zinc-200" />
                  <div className="col-span-1 h-4 rounded bg-zinc-200" />
                  <div className="col-span-1 h-4 rounded bg-zinc-200" />
                  <div className="col-span-1 h-4 rounded bg-zinc-200" />
                  <div className="col-span-1 h-4 rounded bg-zinc-200" />
                </div>
              ))}
            </div>
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
                      <th className="px-5 py-4 text-left text-sm font-semibold text-zinc-900">Question</th>
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
                            <span className="text-xs text-zinc-400">ID: {report.questionId}</span>
                            {report.question ? (
                              <>
                                <Link
                                  href={`/admin/questions/${report.questionId}`}
                                  className="text-sm font-semibold text-blue-600 hover:underline"
                                >
                                  {getQuestionPreview(report.question.promptJson)}
                                </Link>
                                <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                                  <span className="inline-flex items-center rounded bg-blue-50 px-1.5 py-0.5 text-xs font-medium text-blue-700">
                                    {report.question.level?.replace('_', ' ') || 'N/A'}
                                  </span>
                                  {report.question.difficulty && (
                                    <span className="inline-flex items-center rounded bg-amber-50 px-1.5 py-0.5 text-xs font-medium text-amber-700">
                                      {report.question.difficulty}
                                    </span>
                                  )}
                                  <span className="text-xs text-zinc-500">
                                    {report.question.chapter?.title}
                                    {report.question.subtopic?.title && ` › ${report.question.subtopic.title}`}
                                  </span>
                                </div>
                              </>
                            ) : (
                              <span className="text-sm font-semibold text-red-600">Question was deleted</span>
                            )}
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

            {/* Pagination */}
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
