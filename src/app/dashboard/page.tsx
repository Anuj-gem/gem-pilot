"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { VerdictBadge } from "@/components/ui/verdict-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { AnalysisJob, Verdict } from "@/types";

interface ReportSummary {
  show_id: string;
  verdict: Verdict | null;
  weighted_score: number | null;
  percentile: number | null;
  generated_at: string | null;
}

interface GEMSubmission {
  show_id: string;
  title: string | null;
  status: "pending_review" | "published";
  created_at: string;
}

interface JobWithReport extends AnalysisJob {
  report_summary?: ReportSummary;
  submission?: GEMSubmission;
}

// Left-border accent color per verdict tier
const verdictAccent: Record<Verdict, string> = {
  "STRONG SIGNAL": "#16a34a",   // emerald-600
  "WORTH THE READ": "#b45309",  // amber-700
  MIXED:           "transparent",
  PASS:            "transparent",
};

function verdictBorderStyle(verdict: Verdict | null) {
  if (!verdict) return {};
  const color = verdictAccent[verdict] ?? "transparent";
  return { borderLeft: `3px solid ${color}` };
}

function percentileLabel(p: number | null): string | null {
  if (p === null || p === undefined) return null;
  if (p >= 90) return `Top ${100 - p}%`;
  if (p <= 10) return `Bottom ${p + 1}%`;
  return `>${p}th pctl`;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobWithReport[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [jobsRes, reportsRes, submissionsRes] = await Promise.all([
          fetch("/api/jobs").catch(() => null),
          fetch("/api/reports").catch(() => null),
          fetch("/api/submissions").catch(() => null),
        ]);

        let jobList: AnalysisJob[] = [];
        let reportList: ReportSummary[] = [];
        let submissionList: GEMSubmission[] = [];

        if (jobsRes?.ok) {
          const data = await jobsRes.json();
          jobList = data.jobs || [];
        }

        if (reportsRes?.ok) {
          const data = await reportsRes.json();
          reportList = data.reports || [];
        }

        // Note: /api/submissions without a show_id returns admin-only data.
        // For writers, we get their submissions via the individual report fetches.
        // Here we just use it to surface pending_review status on the dashboard.
        if (submissionsRes?.ok) {
          const data = await submissionsRes.json();
          submissionList = data.submissions || [];
        }

        const submissionMap = new Map(submissionList.map((s) => [s.show_id, s]));

        const jobShowIds = new Set(jobList.map((j) => j.show_id));
        const enrichedJobs: JobWithReport[] = jobList.map((j) => ({
          ...j,
          report_summary: reportList.find((r) => r.show_id === j.show_id),
          submission: submissionMap.get(j.show_id),
        }));

        // Also surface pending_review submissions that may not have a job entry
        const pendingOnlySubmissions = submissionList.filter(
          (s) => s.status === "pending_review" && !jobShowIds.has(s.show_id)
        );
        const pendingJobs: JobWithReport[] = pendingOnlySubmissions.map((s) => ({
          job_id: `sub-${s.show_id}`,
          show_id: s.show_id,
          user_id: "",
          status: "pending" as const,
          created_at: s.created_at,
          filename: "",
          file_size: 0,
          error: null,
          report_id: null,
          completed_at: null,
          submission: s,
        }));

        const orphanReports = reportList.filter(
          (r) => !jobShowIds.has(r.show_id)
        );

        setJobs([...enrichedJobs, ...pendingJobs]);
        setReports(orphanReports);
      } catch {
        // Silent fail — empty dashboard
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const totalItems = jobs.length + reports.length;

  const prettyTitle = (id: string) =>
    id
      .replace(/-/g, " ")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

  // Tally verdicts across all completed items for the summary bar
  const allVerdicts: (Verdict | null)[] = [
    ...jobs.map((j) => j.report_summary?.verdict ?? null),
    ...reports.map((r) => r.verdict),
  ];

  const verdictCounts: Record<string, number> = {};
  for (const v of allVerdicts) {
    if (v) verdictCounts[v] = (verdictCounts[v] || 0) + 1;
  }
  const pendingCount = jobs.filter(
    (j) => j.submission?.status === "pending_review" ||
           j.status === "pending" ||
           j.status === "processing"
  ).length;

  const VERDICT_ORDER: Verdict[] = ["STRONG SIGNAL", "WORTH THE READ", "MIXED", "PASS"];
  const VERDICT_LABELS: Record<Verdict, string> = {
    "STRONG SIGNAL": "GEM Select",
    "WORTH THE READ": "On Our Radar",
    MIXED: "Development Notes",
    PASS: "Keep Writing",
  };

  return (
    <div className="min-h-screen flex flex-col bg-zinc-50">
      <Navbar />

      <main className="flex-1 py-12">
        <div className="gem-container">

          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-semibold text-zinc-950">My Scripts</h1>
              <p className="text-sm text-zinc-500 mt-1">
                {totalItems} {totalItems === 1 ? "submission" : "submissions"} to date
              </p>
            </div>
            <Link href="/upload" className="gem-btn-primary">
              Submit New Script
            </Link>
          </div>

          {/* Verdict summary bar */}
          {!loading && totalItems > 0 && (
            <div className="flex items-center gap-6 mb-8 px-5 py-3 rounded-2xl bg-white border border-zinc-200 text-sm shadow-sm">
              {VERDICT_ORDER.map((v) =>
                verdictCounts[v] ? (
                  <span key={v} className="flex items-center gap-2">
                    <span
                      className="inline-block w-2 h-2 rounded-full"
                      style={{ background: verdictAccent[v] || "#71717a" }}
                    />
                    <span className="font-semibold text-zinc-950">
                      {verdictCounts[v]}
                    </span>
                    <span className="text-zinc-500">{VERDICT_LABELS[v]}</span>
                  </span>
                ) : null
              )}
              {pendingCount > 0 && (
                <span className="flex items-center gap-2 ml-auto">
                  <span className="inline-block w-2 h-2 rounded-full bg-zinc-300 animate-pulse" />
                  <span className="text-zinc-500">{pendingCount} under review</span>
                </span>
              )}
            </div>
          )}

          {loading && (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={32} />
            </div>
          )}

          {/* Empty state */}
          {!loading && totalItems === 0 && (
            <div className="gem-card p-16 text-center shadow-sm">
              <div className="w-16 h-16 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-zinc-400">&#9998;</span>
              </div>
              <h2 className="text-xl font-semibold text-zinc-950 mb-2">
                No scripts yet
              </h2>
              <p className="text-sm text-zinc-500 max-w-md mx-auto mb-6">
                Submit your first pilot script to get detailed feedback — completely free.
              </p>
              <Link href="/upload" className="gem-btn-primary">
                Submit Your First Script
              </Link>
            </div>
          )}

          {/* Script list */}
          {totalItems > 0 && (
            <div className="space-y-2">

              {/* Jobs */}
              {jobs.map((job) => {
                const isPendingReview = job.submission?.status === "pending_review";
                const isComplete = job.status === "completed" && job.report_summary;
                // Always link to /report — it handles both pending and published states
                const href = `/report/${job.show_id}`;
                const verdict = job.report_summary?.verdict ?? null;
                const percentile = job.report_summary?.percentile ?? null;
                const pctLabel = percentileLabel(percentile);
                const displayTitle = job.submission?.title || prettyTitle(job.show_id);

                return (
                  <Link
                    key={job.job_id}
                    href={href}
                    className="gem-card p-5 flex items-center justify-between hover:border-zinc-300 hover:shadow-sm transition-all block"
                    style={isPendingReview ? { borderLeft: "3px solid #d4d4d8" } : verdictBorderStyle(verdict)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zinc-950 truncate">
                        {displayTitle}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-0.5">
                        {new Date(job.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {job.filename && ` · ${job.filename}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 ml-4">
                      {isPendingReview ? (
                        <span className="flex items-center gap-1.5 text-sm text-zinc-500">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-400 animate-pulse" />
                          Under Review
                        </span>
                      ) : isComplete && job.report_summary ? (
                        <>
                          {pctLabel && (
                            <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
                              {pctLabel}
                            </span>
                          )}
                          <span className="font-mono text-sm text-zinc-600">
                            {job.report_summary.weighted_score?.toFixed(1)}
                          </span>
                          {job.report_summary.verdict && (
                            <VerdictBadge
                              verdict={job.report_summary.verdict}
                              size="sm"
                            />
                          )}
                        </>
                      ) : job.status === "processing" ? (
                        <span className="text-sm text-emerald-700 animate-pulse">
                          Analyzing...
                        </span>
                      ) : job.status === "failed" ? (
                        <span className="text-sm text-red-600">Failed</span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}

              {/* Orphan reports (CLI-generated) */}
              {reports.map((r) => {
                const pctLabel = percentileLabel(r.percentile);
                return (
                  <Link
                    key={r.show_id}
                    href={`/report/${r.show_id}`}
                    className="gem-card p-5 flex items-center justify-between hover:border-zinc-300 hover:shadow-sm transition-all block"
                    style={verdictBorderStyle(r.verdict)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-zinc-950 truncate">
                        {prettyTitle(r.show_id)}
                      </h3>
                      <p className="text-sm text-zinc-400 mt-0.5">
                        {r.generated_at
                          ? new Date(r.generated_at).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 ml-4">
                      {pctLabel && (
                        <span className="text-xs font-mono text-zinc-400 hidden sm:inline">
                          {pctLabel}
                        </span>
                      )}
                      <span className="font-mono text-sm text-zinc-600">
                        {r.weighted_score?.toFixed(1)}
                      </span>
                      {r.verdict && (
                        <VerdictBadge verdict={r.verdict} size="sm" />
                      )}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
