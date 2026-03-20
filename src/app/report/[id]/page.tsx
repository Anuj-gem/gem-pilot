"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, TrendingUp, AlertTriangle, ChevronDown, ChevronUp, FileText } from "lucide-react";
import { VerdictBadge } from "@/components/ui/verdict-badge";
import { DimensionBar } from "@/components/ui/facet-bar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { GEMReport, DimensionId } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function riskPrefix(vsWinner: number): string {
  if (vsWinner <= -2.5) return "Significantly below breakout standards — ";
  if (vsWinner <= -1.5) return "Below the winner benchmark — ";
  if (vsWinner <= -0.5) return "Trailing the winner average — ";
  return "Flagged as a limiting factor — ";
}

function generatePDF(report: GEMReport, title: string) {
  const v = report.verdict;
  const win = window.open("", "_blank", "width=820,height=1000");
  if (!win) return;

  const strengthsHTML = report.strengths.length > 0
    ? report.strengths.map(s => `
        <div class="item">
          <div class="item-header">
            <span class="item-title">${s.display_name}</span>
            <span class="item-score good">${s.score.toFixed(1)}/10</span>
          </div>
          <p>${s.note}</p>
        </div>`).join("")
    : `<p class="empty">No dimensions scored above the winner benchmark threshold.</p>`;

  const risksHTML = report.risks.length > 0
    ? report.risks.map(r => {
        const dimData = report.dimensions.find(d => d.dimension === r.dimension);
        const gap = dimData?.vs_winner_avg ?? 0;
        const winnerAvg = dimData?.winner_avg ?? 0;
        const prefix = riskPrefix(gap);
        return `
        <div class="item">
          <div class="item-header">
            <span class="item-title">${r.display_name}</span>
            <span class="item-score bad">${r.score.toFixed(1)}/10</span>
          </div>
          <p class="risk-context">Winner avg: ${winnerAvg.toFixed(1)} &nbsp;·&nbsp; Gap: ${gap > 0 ? "+" : ""}${gap.toFixed(1)}</p>
          <p>${prefix}${r.note}</p>
        </div>`;
      }).join("")
    : `<p class="empty">No dimensions significantly below the winner benchmark.</p>`;

  const dimsHTML = report.dimensions.map(d => `
    <tr>
      <td>${d.display_name}</td>
      <td class="num">${d.score.toFixed(1)}</td>
      <td class="num">${d.winner_avg.toFixed(1)}</td>
      <td class="num ${d.vs_winner_avg >= 0 ? "pos" : "neg"}">${d.vs_winner_avg > 0 ? "+" : ""}${d.vs_winner_avg.toFixed(1)}</td>
    </tr>`).join("");

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>GEM — ${title}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; background: #fff; font-size: 13px; }
    .page { max-width: 680px; margin: 0 auto; padding: 48px 40px; }
    .gem-eyebrow { font-size: 9px; font-weight: 700; letter-spacing: 0.14em; text-transform: uppercase; color: #999; margin-bottom: 4px; }
    h1 { font-size: 20px; font-weight: 700; margin-bottom: 3px; }
    .date { font-size: 11px; color: #999; margin-bottom: 28px; }
    .hero { border: 1px solid #e0e0e0; border-radius: 8px; padding: 22px 24px; margin-bottom: 22px; }
    .hero-top { display: flex; align-items: center; justify-content: space-between; margin-bottom: 14px; flex-wrap: wrap; gap: 8px; }
    .badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
    .verdict-badge { font-size: 12px; font-weight: 700; padding: 4px 10px; border-radius: 4px; background: #f3f3f3; border: 1px solid #ddd; }
    .confidence { font-size: 9px; font-family: monospace; font-weight: 700; padding: 3px 7px; border-radius: 3px; border: 1px solid #ddd; color: #666; letter-spacing: 0.06em; }
    .score-block { text-align: right; }
    .score-big { font-size: 22px; font-weight: 700; line-height: 1; }
    .score-label { font-size: 10px; color: #999; }
    .rec { font-size: 12px; font-weight: 600; color: #7a5c00; background: #fffbee; border: 1px solid #d4af37; border-radius: 4px; padding: 5px 12px; display: inline-block; margin-bottom: 14px; }
    .opp { font-size: 10px; font-weight: 600; color: #7a5c00; background: #fffbee; border: 1px solid #e8d080; border-radius: 3px; padding: 3px 8px; display: inline-block; margin-bottom: 12px; }
    .gem-read-label { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #999; margin-bottom: 5px; }
    .one-line { font-size: 14px; color: #111; line-height: 1.55; margin-bottom: 14px; }
    .stats { font-size: 12px; color: #555; margin-bottom: 12px; }
    .stats strong { color: #111; }
    .takeaway { font-size: 12px; color: #333; line-height: 1.65; padding-top: 12px; border-top: 1px solid #eee; }
    .section { margin-bottom: 22px; }
    .section-title { font-size: 9px; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; color: #999; padding-bottom: 6px; border-bottom: 1px solid #eee; margin-bottom: 12px; }
    .item { margin-bottom: 14px; }
    .item-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 3px; }
    .item-title { font-size: 13px; font-weight: 600; color: #111; }
    .item-score { font-size: 12px; font-family: monospace; font-weight: 600; }
    .item-score.good { color: #1a7a45; }
    .item-score.bad { color: #b22222; }
    .risk-context { font-size: 10px; font-family: monospace; color: #999; margin-bottom: 4px; }
    .item p:not(.risk-context) { font-size: 12px; color: #444; line-height: 1.55; }
    .empty { font-size: 12px; color: #999; font-style: italic; }
    table { width: 100%; border-collapse: collapse; }
    th { font-size: 9px; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; color: #999; padding: 5px 6px; border-bottom: 1px solid #eee; text-align: left; }
    td { padding: 6px 6px; border-bottom: 1px solid #f5f5f5; font-size: 12px; color: #333; }
    td.num { text-align: right; font-family: monospace; }
    td.pos { color: #1a7a45; }
    td.neg { color: #b22222; }
    .footer { margin-top: 36px; padding-top: 10px; border-top: 1px solid #eee; font-size: 10px; color: #bbb; }
    @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
  </style>
</head>
<body>
<div class="page">
  <p class="gem-eyebrow">GEM Script Evaluation</p>
  <h1>${title}</h1>
  <p class="date">Analyzed ${new Date(report.generated_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })} · ${report.engine_version}</p>

  <div class="hero">
    <div class="hero-top">
      <div class="badges">
        <span class="verdict-badge">${v.label}</span>
        ${report.confidence ? `<span class="confidence">${report.confidence} CONFIDENCE</span>` : ""}
      </div>
      <div class="score-block">
        <div class="score-big">${v.weighted_score.toFixed(1)}</div>
        <div class="score-label">score / 100</div>
      </div>
    </div>

    ${report.read_recommendation ? `<div class="rec">→ ${report.read_recommendation}</div>` : ""}
    ${report.opportunity_type ? `<div class="opp">● ${report.opportunity_type}</div>` : ""}

    <p class="gem-read-label">GEM's read</p>
    <p class="one-line">${v.one_line}</p>
    <p class="stats"><strong>Outscores ${v.percentile}% of scripts in the GEM corpus.</strong></p>
    <p class="takeaway">${report.producer_takeaway}</p>
  </div>

  <div class="section">
    <p class="section-title">What's Working</p>
    ${strengthsHTML}
  </div>

  <div class="section">
    <p class="section-title">What May Hold It Back</p>
    ${risksHTML}
  </div>

  <div class="section">
    <p class="section-title">Dimension Breakdown — scores vs. winner average</p>
    <table>
      <thead><tr><th>Dimension</th><th style="text-align:right">Score</th><th style="text-align:right">Winner Avg</th><th style="text-align:right">Gap</th></tr></thead>
      <tbody>${dimsHTML}</tbody>
    </table>
  </div>

  <div class="footer">GEM Transcendence Detector · ${report.engine_version} · ${new Date(report.generated_at).toLocaleDateString()}</div>
</div>
<script>setTimeout(() => window.print(), 200);</script>
</body>
</html>`);
  win.document.close();
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params = useParams();
  const router = useRouter();
  const showId = params.id as string;

  const [report, setReport]           = useState<GEMReport | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [dimsExpanded, setDimsExpanded] = useState(false);

  useEffect(() => {
    if (!showId) return;
    (async () => {
      try {
        const res = await fetch(`/api/reports/${showId}`);
        if (!res.ok) throw new Error("Report not found");
        setReport(await res.json());
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [showId]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <LoadingSpinner size={40} />
    </div>
  );

  if (error || !report) return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4">
      <p className="text-gem-text-secondary">{error || "Report not found"}</p>
      <button onClick={() => router.push("/dashboard")} className="gem-btn-secondary text-sm">
        Back to Dashboard
      </button>
    </div>
  );

  const v = report.verdict;

  const title = showId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  // Percentile framing — lead with corpus standing
  const corpusStanding =
    v.percentile >= 90
      ? `Top ${100 - v.percentile}% of the GEM corpus`
      : v.percentile <= 10
        ? `Bottom ${v.percentile + 1}% of the GEM corpus`
        : `Outscores ${v.percentile}% of scripts in the GEM corpus`;

  const dimAbove = report.dimensions.filter(d => d.vs_winner_avg >= 0).length;
  const dimBelow = report.dimensions.filter(d => d.vs_winner_avg < -1).length;

  return (
    <main className="min-h-screen pb-20">

      {/* ── Page Header ──────────────────────────────────────────────── */}
      <div className="border-b border-gem-border">
        <div className="gem-container py-6">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm text-gem-text-secondary hover:text-gem-gold transition-colors mb-4"
          >
            <ArrowLeft size={16} />
            Dashboard
          </button>
          <h1 className="font-display text-2xl md:text-3xl text-gem-text-primary">
            {title}
          </h1>
          <p className="text-xs text-gem-text-muted mt-1 font-mono uppercase tracking-wider">
            GEM Script Evaluation &middot; {new Date(report.generated_at).toLocaleDateString()} &middot; {report.engine_version}
          </p>
        </div>
      </div>

      <div className="gem-container mt-8 space-y-6">

        {/* ── 1. Decision Memo ─────────────────────────────────────────── */}
        <section className="gem-card p-6 md:p-8">

          {/* Verdict row */}
          <div className="flex items-start justify-between gap-4 mb-5">
            <div className="flex items-center gap-3 flex-wrap">
              <VerdictBadge verdict={v.label} size="lg" />
              {report.confidence && (
                <span className="text-[10px] font-mono font-bold tracking-widest px-2 py-0.5 rounded border border-gem-border text-gem-text-muted">
                  {report.confidence} CONFIDENCE
                </span>
              )}
            </div>
            {/* Compact score — secondary to the verdict text */}
            <div className="text-right shrink-0">
              <div className="text-2xl font-display font-bold text-gem-text-primary">
                {v.weighted_score.toFixed(1)}
              </div>
              <div className="text-[10px] font-mono text-gem-text-muted">score / 100</div>
            </div>
          </div>

          {/* Recommendation + opportunity type */}
          <div className="flex items-center gap-3 mb-5 flex-wrap">
            {report.read_recommendation && (
              <span className="text-sm font-semibold text-gem-gold bg-gem-gold/10 border border-gem-gold/25 rounded px-3 py-1">
                → {report.read_recommendation}
              </span>
            )}
            {report.opportunity_type && (
              <span className="text-xs font-medium text-gem-text-secondary border border-gem-border rounded px-2.5 py-1">
                ● {report.opportunity_type}
              </span>
            )}
          </div>

          {/* GEM's overall read */}
          <div className="mb-5">
            <p className="text-[10px] font-mono font-bold tracking-widest text-gem-text-muted uppercase mb-2">
              GEM&apos;s read
            </p>
            <p className="text-base text-gem-text-primary leading-relaxed">
              {v.one_line}
            </p>
          </div>

          {/* Corpus standing */}
          <div className="py-3 border-t border-b border-gem-border/50 mb-5">
            <p className="text-sm font-medium text-gem-text-primary">
              {corpusStanding}
            </p>
          </div>

          {/* Producer takeaway — merged into hero */}
          <p className="text-sm text-gem-text-secondary leading-relaxed">
            {report.producer_takeaway}
          </p>
        </section>

        {/* ── 2. What's Working ─────────────────────────────────────────── */}
        <section className="gem-card p-6">
          <h2 className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-widest mb-5">
            <TrendingUp size={14} />
            What&apos;s Working
          </h2>
          {report.strengths.length > 0 ? (
            <div className="space-y-5">
              {report.strengths.map((s) => (
                <div key={s.dimension}>
                  <div className="flex items-baseline justify-between mb-1">
                    <span className="text-sm font-semibold text-gem-text-primary">
                      {s.display_name}
                    </span>
                    <span className="text-sm font-mono text-emerald-400 ml-4 shrink-0">
                      {s.score.toFixed(1)}/10
                    </span>
                  </div>
                  <p className="text-sm text-gem-text-secondary leading-relaxed">
                    {s.note}
                  </p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gem-text-muted italic">
              No dimensions scored above the winner benchmark threshold.
            </p>
          )}
        </section>

        {/* ── 3. What May Hold It Back ──────────────────────────────────── */}
        <section className="gem-card p-6">
          <h2 className="flex items-center gap-2 text-xs font-bold text-red-400 uppercase tracking-widest mb-5">
            <AlertTriangle size={14} />
            What May Hold It Back
          </h2>
          {report.risks.length > 0 ? (
            <div className="space-y-5">
              {report.risks.map((r) => {
                const dimData = report.dimensions.find(
                  (d) => d.dimension === r.dimension
                );
                const gap       = dimData?.vs_winner_avg ?? 0;
                const winnerAvg = dimData?.winner_avg ?? 0;
                const prefix    = riskPrefix(gap);

                return (
                  <div key={r.dimension}>
                    <div className="flex items-baseline justify-between mb-1">
                      <span className="text-sm font-semibold text-gem-text-primary">
                        {r.display_name}
                      </span>
                      <span className="text-sm font-mono text-red-400 ml-4 shrink-0">
                        {r.score.toFixed(1)}/10
                      </span>
                    </div>
                    {/* Benchmark context — makes the weakness explicit */}
                    <p className="text-[11px] font-mono text-gem-text-muted mb-1.5">
                      Winner avg: {winnerAvg.toFixed(1)}&nbsp;&nbsp;·&nbsp;&nbsp;
                      Gap: <span className="text-red-400/80">
                        {gap > 0 ? "+" : ""}{gap.toFixed(1)}
                      </span>
                    </p>
                    <p className="text-sm text-gem-text-secondary leading-relaxed">
                      <span className="text-red-400/70">{prefix}</span>
                      {r.note}
                    </p>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-gem-text-muted italic">
              No dimensions significantly below the winner benchmark.
            </p>
          )}
        </section>

        {/* ── 4. Dimension Breakdown (collapsed by default) ─────────────── */}
        <section>
          <button
            onClick={() => setDimsExpanded(!dimsExpanded)}
            className="w-full flex items-center justify-between gem-card p-4 hover:border-gem-border-light transition-colors group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-gem-text-muted uppercase tracking-widest">
                Dimension Breakdown
              </span>
              <span className="text-xs font-mono text-gem-text-muted">
                {report.dimensions.length} dimensions
                &nbsp;&middot;&nbsp;
                <span className="text-emerald-400/80">{dimAbove} at/above winner avg</span>
                &nbsp;&middot;&nbsp;
                <span className="text-red-400/80">{dimBelow} significantly below</span>
              </span>
            </div>
            <span className="text-gem-text-muted group-hover:text-gem-gold transition-colors">
              {dimsExpanded
                ? <ChevronUp size={16} />
                : <ChevronDown size={16} />
              }
            </span>
          </button>

          {dimsExpanded && (
            <div className="mt-2 space-y-2">
              {report.dimensions.map((d) => (
                <DimensionBar
                  key={d.dimension}
                  dimensionId={d.dimension as DimensionId}
                  score={d.score}
                  weight={d.weight}
                  reasoning={d.reasoning}
                  winnerAvg={d.winner_avg}
                  vsWinnerAvg={d.vs_winner_avg}
                />
              ))}
            </div>
          )}
        </section>

        {/* ── 5. Export ──────────────────────────────────────────────────── */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={() => generatePDF(report, title)}
            className="gem-btn-primary text-sm flex items-center gap-2"
          >
            <FileText size={14} />
            Download PDF Report
          </button>
        </div>

      </div>
    </main>
  );
}
