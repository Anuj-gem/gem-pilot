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

interface JobWithReport extends AnalysisJob {
  report_summary?: ReportSummary;
}

export default function DashboardPage() {
  const [jobs, setJobs] = useState<JobWithReport[]>([]);
  const [reports, setReports] = useState<ReportSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch jobs and reports in parallel
        const [jobsRes, reportsRes] = await Promise.all([
          fetch("/api/jobs").catch(() => null),
          fetch("/api/reports").catch(() => null),
        ]);

        let jobList: AnalysisJob[] = [];
        let reportList: ReportSummary[] = [];

        if (jobsRes?.ok) {
          const data = await jobsRes.json();
          jobList = data.jobs || [];
        }

        if (reportsRes?.ok) {
          const data = await reportsRes.json();
          reportList = data.reports || [];
        }

        // Merge: show jobs with their report summaries,
        // plus any reports that don't have a matching job (e.g. CLI-generated)
        const jobShowIds = new Set(jobList.map((j) => j.show_id));
        const enrichedJobs: JobWithReport[] = jobList.map((j) => ({
          ...j,
          report_summary: reportList.find((r) => r.show_id === j.show_id),
        }));

        // Reports without matching jobs (generated via CLI)
        const orphanReports = reportList.filter(
          (r) => !jobShowIds.has(r.show_id)
        );

        setJobs(enrichedJobs);
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

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar isLoggedIn />

      <main className="flex-1 py-12">
        <div className="gem-container">
          {/* Header */}
          <div className="flex items-center justify-between mb-10">
            <div>
              <h1 className="font-display text-3xl font-bold">Your Scripts</h1>
              <p className="text-sm text-gem-text-secondary mt-1">
                {totalItems} {totalItems === 1 ? "analysis" : "analyses"} to date
              </p>
            </div>
            <Link href="/upload" className="gem-btn-primary">
              Upload Script
            </Link>
          </div>

          {loading && (
            <div className="flex justify-center py-16">
              <LoadingSpinner size={32} />
            </div>
          )}

          {/* Empty state */}
          {!loading && totalItems === 0 && (
            <div className="gem-card p-16 text-center">
              <div className="w-16 h-16 rounded-full bg-gem-gold/10 border border-gem-gold/20 flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl text-gem-gold">&#9998;</span>
              </div>
              <h2 className="font-display text-xl font-semibold mb-2">
                No scripts yet
              </h2>
              <p className="text-sm text-gem-text-secondary max-w-md mx-auto mb-6">
                Upload your first pilot script to get a full breakout analysis
                across 10 dimensions.
              </p>
              <Link href="/upload" className="gem-btn-primary">
                Upload Your First Script
              </Link>
            </div>
          )}

          {/* Job list */}
          {totalItems > 0 && (
            <div className="space-y-3">
              {/* Jobs (most recent first) */}
              {jobs.map((job) => {
                const isComplete = job.status === "completed" && job.report_summary;
                const href = isComplete
                  ? `/report/${job.show_id}`
                  : job.status === "processing" || job.status === "pending"
                    ? "#"
                    : "#";

                return (
                  <Link
                    key={job.job_id}
                    href={href}
                    className="gem-card p-5 flex items-center justify-between hover:border-gem-gold/20 transition-colors block"
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gem-text-primary truncate">
                        {prettyTitle(job.show_id)}
                      </h3>
                      <p className="text-sm text-gem-text-muted mt-0.5">
                        {new Date(job.created_at).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                        {job.filename && ` · ${job.filename}`}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 ml-4">
                      {isComplete && job.report_summary ? (
                        <>
                          <span className="font-mono text-sm text-gem-text-secondary">
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
                        <span className="text-sm text-gem-gold animate-pulse">
                          Analyzing...
                        </span>
                      ) : job.status === "pending" ? (
                        <span className="text-sm text-gem-text-muted">
                          Queued
                        </span>
                      ) : job.status === "failed" ? (
                        <span className="text-sm text-gem-danger">Failed</span>
                      ) : null}
                    </div>
                  </Link>
                );
              })}

              {/* Orphan reports (generated via CLI, no job) */}
              {reports.map((r) => (
                <Link
                  key={r.show_id}
                  href={`/report/${r.show_id}`}
                  className="gem-card p-5 flex items-center justify-between hover:border-gem-gold/20 transition-colors block"
                >
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gem-text-primary truncate">
                      {prettyTitle(r.show_id)}
                    </h3>
                    <p className="text-sm text-gem-text-muted mt-0.5">
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
                    <span className="font-mono text-sm text-gem-text-secondary">
                      {r.weighted_score?.toFixed(1)}
                    </span>
                    {r.verdict && (
                      <VerdictBadge verdict={r.verdict} size="sm" />
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
}
