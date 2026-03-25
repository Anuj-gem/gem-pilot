"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import { DimensionBar } from "@/components/ui/facet-bar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { GEMReport, Verdict, DimensionId } from "@/types";

// ─── Producer-Facing Verdict Map ──────────────────────────────────────────────
// Translates internal model tiers into producer-legible decision language.

const PRODUCER_VERDICT: Record<
  Verdict,
  { label: string; color: string; borderColor: string; bg: string }
> = {
  "STRONG SIGNAL": {
    label: "READ NOW",
    color: "#15803d",      // emerald-700
    borderColor: "#16a34a", // emerald-600
    bg: "#f0fdf4",          // emerald-50
  },
  "WORTH THE READ": {
    label: "WORTH A READ",
    color: "#b45309",      // amber-700
    borderColor: "#d97706", // amber-600
    bg: "#fffbeb",          // amber-50
  },
  MIXED: {
    label: "CONSIDER",
    color: "#52525b",      // zinc-600
    borderColor: "#d4d4d8", // zinc-300
    bg: "#fafafa",          // zinc-50
  },
  PASS: {
    label: "PASS",
    color: "#71717a",      // zinc-500
    borderColor: "#e4e4e7", // zinc-200
    bg: "transparent",
  },
};

// ─── Dimension accessor ───────────────────────────────────────────────────────

function dim(report: GEMReport, id: string): number {
  return report.dimensions.find((d) => d.dimension === id)?.score ?? 5;
}

// ─── Metadata Tags ────────────────────────────────────────────────────────────
// 2-3 quick-read tags that frame the project for a producer at a glance.

function deriveMetadataTags(report: GEMReport): string[] {
  const audience   = dim(report, "audience_appeal_marketability");
  const character  = dim(report, "character_appeal_and_long_term_potential");
  const tonal      = dim(report, "tonal_specificity");
  const world      = dim(report, "world_density_and_texture");
  const originality = dim(report, "creative_originality_and_boldness");
  const hook       = dim(report, "conceptual_hook_clarity");
  const depth      = dim(report, "latent_depth_slow_burn_potential");
  const momentum   = dim(report, "narrative_momentum_engagement");

  const tags: string[] = [];

  // Market lane — always exactly one
  if (audience >= 7.5) tags.push("Broad Commercial");
  else if (audience >= 6)   tags.push("Prestige / Targeted");
  else                      tags.push("Specialty / Niche");

  // Packaging angle — most relevant single signal
  if (character >= 7.5)                          tags.push("Talent-Driven");
  else if (tonal >= 7.5 && originality >= 7)     tags.push("Creator-Led");
  else if (world >= 7.5)                         tags.push("World-Building");

  // Notable qualifier — only surface if clearly meaningful
  if (depth >= 8)           tags.push("Slow-Burn Potential");
  else if (hook < 5.5)      tags.push("Concept Risk");
  else if (momentum < 5.5)  tags.push("Pacing Risk");

  return tags.slice(0, 3);
}

// ─── Script Quality Assessment ───────────────────────────────────────────────
// A conversational read on the script's creative qualities, grounded in model
// signals. Focused purely on what's on the page — no buyer or market language.

function deriveMarketPositioning(report: GEMReport): string {
  const audience    = dim(report, "audience_appeal_marketability");
  const character   = dim(report, "character_appeal_and_long_term_potential");
  const tonal       = dim(report, "tonal_specificity");
  const world       = dim(report, "world_density_and_texture");
  const hook        = dim(report, "conceptual_hook_clarity");
  const originality = dim(report, "creative_originality_and_boldness");
  const depth       = dim(report, "latent_depth_slow_burn_potential");
  const ensemble    = dim(report, "relationship_density_and_ensemble_engine");

  const sentences: string[] = [];

  // Concept / hook
  if (hook >= 8) {
    sentences.push("The concept is sharply defined and immediately compelling — the premise lands with full clarity from the first read.");
  } else if (hook >= 6.5) {
    sentences.push("The concept is clear and workable, though it could land with more force if sharpened in its opening pages.");
  } else {
    sentences.push("The conceptual hook needs the most attention — the core premise doesn't fully land on first read.");
  }

  // Character & world
  if (character >= 8 && world >= 8) {
    sentences.push("Both character and world feel fully realized — the script earns genuine investment in its people and its setting.");
  } else if (character >= 7.5 && ensemble >= 7) {
    sentences.push("Character is the clear asset — the lead and ensemble are drawn with real specificity and long-run potential.");
  } else if (world >= 8) {
    sentences.push("The world is richly built and generates story naturally — the setting carries significant weight on its own.");
  } else if (character < 6) {
    sentences.push("Character development is the primary limiting factor — strengthening specificity here would have an outsized impact.");
  }

  // Tone & originality
  if (tonal >= 7.5 && originality >= 7.5) {
    sentences.push("A distinctive tonal voice and genuine creative originality give the material a memorable and differentiated identity.");
  } else if (tonal >= 7) {
    sentences.push("Tone is managed consistently and gives the material a clear, recognizable register throughout.");
  } else if (originality >= 8) {
    sentences.push("There's real creative boldness here — the script takes risks that pay off.");
  } else if (tonal < 6) {
    sentences.push("Tonal inconsistency is a drag on the read — the material would benefit from a more decisive commitment to its register.");
  }

  // Depth & breadth of appeal
  if (depth >= 8.5) {
    sentences.push("Latent thematic depth gives this strong long-term resonance potential well beyond the pilot.");
  } else if (audience >= 8 && character >= 7.5) {
    sentences.push("The combination of broad appeal and strong characters suggests real staying power across multiple seasons.");
  }

  return sentences.join(" ");
}

// ─── Upside Bullets ───────────────────────────────────────────────────────────
// Always 3. Uses explicit strengths first, then falls back to highest-scoring dims.

function getUpsideBullets(
  report: GEMReport,
): { title: string; note: string }[] {
  const result: { title: string; note: string }[] = [];
  const used = new Set<string>();

  // If model provided "why it stands out" highlights, prefer those
  if (
    report.highlights?.type === "why_it_stands_out" &&
    report.highlights.bullets.length >= 3
  ) {
    return report.highlights.bullets.slice(0, 3).map((b) => ({ title: "", note: b }));
  }

  // Explicit strengths from the model
  for (const s of report.strengths) {
    if (result.length >= 3) break;
    result.push({ title: s.display_name, note: s.note });
    used.add(s.dimension);
  }

  // Fill remaining slots from highest vs_winner_avg dimensions
  if (result.length < 3) {
    const extras = [...report.dimensions]
      .filter((d) => !used.has(d.dimension))
      .sort((a, b) => b.vs_winner_avg - a.vs_winner_avg);
    for (const d of extras) {
      if (result.length >= 3) break;
      result.push({ title: d.display_name, note: d.reasoning });
      used.add(d.dimension);
    }
  }

  return result.slice(0, 3);
}

// ─── Risk Bullets ─────────────────────────────────────────────────────────────
// Always 3 real-world friction points. Only surfaces genuine gaps — never
// mis-frames a strong dimension as a risk just to fill a slot.

function getRiskBullets(
  report: GEMReport,
): { title: string; note: string }[] {
  const result: { title: string; note: string }[] = [];
  const used = new Set<string>();

  // 1. If model explicitly flagged "what_would_need_to_improve", prefer those
  if (report.highlights?.type === "what_would_need_to_improve") {
    const bullets = report.highlights.bullets
      .slice(0, 3)
      .map((b) => ({ title: "", note: b }));
    if (bullets.length >= 3) return bullets;
    bullets.forEach((b) => result.push(b));
  }

  // 2. Explicit risks from the model
  for (const r of report.risks) {
    if (result.length >= 3) break;
    if (used.has(r.dimension)) continue;
    result.push({ title: r.display_name, note: r.note });
    used.add(r.dimension);
  }

  // 3. Dimensions genuinely below benchmark (vs_winner_avg < -0.5 only)
  if (result.length < 3) {
    const belowBenchmark = [...report.dimensions]
      .filter((d) => !used.has(d.dimension) && d.vs_winner_avg < -0.5)
      .sort((a, b) => a.vs_winner_avg - b.vs_winner_avg);
    for (const d of belowBenchmark) {
      if (result.length >= 3) break;
      result.push({ title: d.display_name, note: d.reasoning });
      used.add(d.dimension);
    }
  }

  // 4. Extract risk clause from the model's one_line verdict (e.g. "but risks X")
  if (result.length < 3) {
    const oneLine = report.verdict?.one_line ?? "";
    const riskMatch = oneLine.match(/\bbut\b([^.]+)\./i);
    if (riskMatch) {
      const clause = riskMatch[1].trim();
      const note = clause.charAt(0).toUpperCase() + clause.slice(1) + ".";
      result.push({ title: "Market Watchout", note });
    }
  }

  // 5. Script-signal-based watchouts (audience ceiling, hook risk, pacing)
  if (result.length < 3) {
    const audience    = dim(report, "audience_appeal_marketability");
    const hook        = dim(report, "conceptual_hook_clarity");
    const momentum    = dim(report, "narrative_momentum_engagement");
    const originality = dim(report, "creative_originality_and_boldness");

    const candidates: { title: string; note: string; threshold: boolean }[] = [
      {
        title: "Audience Ceiling",
        note: "Buyer pool may be narrower than comparable breakout scripts — commercial packaging and targeting will be critical.",
        threshold: audience < 7.5,
      },
      {
        title: "Pitch Clarity",
        note: "The concept hook may need sharper articulation to land efficiently in a pitch room or one-sheet format.",
        threshold: hook < 7,
      },
      {
        title: "Pacing Risk",
        note: "Act structure and stakes escalation may benefit from development attention before going wide.",
        threshold: momentum < 7,
      },
      {
        title: "Crowded Lane",
        note: "Comp positioning could be challenging — similar projects in the market may create competitive friction.",
        threshold: originality < 7,
      },
    ];
    for (const c of candidates) {
      if (result.length >= 3) break;
      if (c.threshold) result.push({ title: c.title, note: c.note });
    }
  }

  // 6. Tier-aware generic watchouts for strong scripts with no flagged gaps
  if (result.length < 3) {
    const tier = report.verdict?.label;
    const generic: { title: string; note: string }[] = tier === "PASS" || tier === "MIXED"
      ? [
          { title: "Concept Fundamentals", note: "Core issues would require meaningful revision before this is competitive in a pitch context." },
          { title: "Market Fit", note: "Limited commercial positioning in the current version — development strategy should address this early." },
          { title: "Competitive Context", note: "Read against similar projects currently in development to calibrate differentiation and buyer fit." },
        ]
      : [
          { title: "Development Stage", note: "Evaluate whether the script is ready for a wide pitch or benefits from focused development before broader exposure." },
          { title: "Buyer Timing", note: "Market timing and current buyer mandates will determine whether this lands in the right room at the right moment." },
          { title: "Competitive Context", note: "Read against similar projects in development at target buyers to assess differentiation and positioning." },
        ];
    for (const w of generic) {
      if (result.length >= 3) break;
      result.push(w);
    }
  }

  return result.slice(0, 3);
}

// ─── Development Note ─────────────────────────────────────────────────────────
// What the script most needs, grounded in model signals. Focused on creative
// and craft priorities — not packaging or talent attachment.

function derivePackagingNote(report: GEMReport): string {
  const depth      = dim(report, "latent_depth_slow_burn_potential");
  const ensemble   = dim(report, "relationship_density_and_ensemble_engine");
  const originality = dim(report, "creative_originality_and_boldness");

  // Address the biggest genuine gap first (vs_winner_avg < -1 only)
  const biggestGap = [...report.dimensions]
    .filter((d) => d.vs_winner_avg < -1)
    .sort((a, b) => a.vs_winner_avg - b.vs_winner_avg)[0];

  if (biggestGap) {
    const gapNotes: Record<string, string> = {
      conceptual_hook_clarity:
        "Sharpening the concept hook in the opening pages would have the highest single impact on first-read traction.",
      audience_appeal_marketability:
        "Strengthening the commercial hook — without compromising the creative vision — would broaden the script's reach.",
      character_appeal_and_long_term_potential:
        "Deepening character contradictions and long-term arc potential would meaningfully raise the script's ceiling.",
      narrative_momentum_engagement:
        "Tightening act structure and escalating stakes earlier would materially improve the read-through experience.",
      tonal_specificity:
        "Committing more decisively to a specific tone would give the material a clearer and more consistent register.",
      world_density_and_texture:
        "Further developing the world's implicit story-generating machinery would strengthen the multi-season case.",
      relationship_density_and_ensemble_engine:
        "Sharpening ensemble dynamics and relationship conflicts would add significant story-engine value.",
      resonant_originality:
        "Finding a more distinctive angle or voice would help the script stand out on its own terms.",
      creative_originality_and_boldness:
        "Leaning harder into creative risk-taking would elevate the script's distinctiveness and long-term memorability.",
      latent_depth_slow_burn_potential:
        "Seeding more latent thematic depth would strengthen the slow-burn and long-term engagement case.",
    };
    return gapNotes[biggestGap.dimension]
      ?? `Improving ${biggestGap.display_name} is the highest-leverage development priority at this stage.`;
  }

  // No significant gaps — point to the most productive refinement direction
  if (depth < 7.5) {
    return "Seeding more latent thematic depth would strengthen the slow-burn and long-term engagement potential.";
  }
  if (ensemble < 7) {
    return "Sharpening ensemble dynamics and relationship texture would add meaningful story-engine value.";
  }
  if (originality < 7.5) {
    return "Leaning harder into the script's more distinctive elements would elevate its creative boldness and memorability.";
  }

  // Strong script with no clear gaps
  const weakest = [...report.dimensions].sort((a, b) => a.vs_winner_avg - b.vs_winner_avg)[0];
  return `Development energy is best spent preserving what works while pushing ${weakest.display_name.toLowerCase()} further — that's the highest-leverage refinement at this stage.`;
}

// ─── Dimension Grouping for Analytics Appendix ────────────────────────────────

const DIMENSION_GROUPS: Record<string, string[]> = {
  "Concept & Voice": [
    "conceptual_hook_clarity",
    "resonant_originality",
    "creative_originality_and_boldness",
  ],
  "Character & Ensemble": [
    "character_appeal_and_long_term_potential",
    "relationship_density_and_ensemble_engine",
  ],
  "World & Tone": [
    "world_density_and_texture",
    "tonal_specificity",
    "latent_depth_slow_burn_potential",
  ],
  "Narrative & Market": [
    "narrative_momentum_engagement",
    "audience_appeal_marketability",
  ],
};

function vsWinnerLabel(gap: number): string {
  if (gap >= 2)    return "Well above benchmark";
  if (gap >= 0.75) return "Above benchmark";
  if (gap >= -0.75) return "At benchmark";
  if (gap >= -1.75) return "Below benchmark";
  return "Significantly below benchmark";
}

// ─── PDF Generation — Producer Memo Format ───────────────────────────────────

function generatePDF(
  report: GEMReport,
  title: string,
  producerVerdict: string,
  metadataTags: string[],
  marketPositioning: string,
  upsideBullets: { title: string; note: string }[],
  riskBullets: { title: string; note: string }[],
  packagingNote: string,
) {
  const v = report.verdict;
  const win = window.open("", "_blank", "width=800,height=1100");
  if (!win) return;

  const tagHTML = metadataTags
    .map((t) => `<span class="tag">${t}</span>`)
    .join("");

  const bulletHTML = (bullets: { title: string; note: string }[], color: string) =>
    bullets
      .map(
        (b) => `<div class="bullet">
          <span class="bullet-arrow" style="color:${color}">→</span>
          <div>${b.title ? `<strong>${b.title}.</strong> ` : ""}${b.note}</div>
        </div>`,
      )
      .join("");

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>GEM — ${title}</title>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color:#111; background:#fff; font-size:12px; line-height:1.6; }
  .page { max-width:660px; margin:0 auto; padding:44px 40px; }

  /* Header */
  .eyebrow { font-size:8px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#aaa; margin-bottom:3px; }
  h1 { font-size:22px; font-weight:700; margin-bottom:2px; }
  .meta { font-size:10px; color:#aaa; margin-bottom:24px; }

  /* Verdict block */
  .verdict-block { border-left:4px solid #C9A84C; background:#fffdf5; border-radius:6px; padding:18px 20px; margin-bottom:22px; }
  .verdict-label { font-size:22px; font-weight:800; letter-spacing:.04em; color:#7a5c00; margin-bottom:4px; }
  .verdict-one-line { font-size:13px; color:#333; margin-bottom:10px; line-height:1.55; }
  .tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:8px; }
  .tag { font-size:9px; font-weight:600; text-transform:uppercase; letter-spacing:.06em; border:1px solid #ccc; border-radius:20px; padding:2px 8px; color:#555; }
  .confidence-line { font-size:9px; font-family:monospace; color:#aaa; }

  /* Section */
  .section { margin-bottom:18px; padding-top:16px; border-top:1px solid #eee; }
  .section-label { font-size:8px; font-weight:700; letter-spacing:.14em; text-transform:uppercase; color:#aaa; margin-bottom:7px; }
  .section p { font-size:12px; color:#333; line-height:1.65; }

  /* Bullets */
  .bullet { display:flex; gap:10px; margin-bottom:10px; align-items:flex-start; }
  .bullet-arrow { font-size:12px; flex-shrink:0; margin-top:1px; }
  .bullet div { font-size:12px; color:#333; line-height:1.55; }
  .bullet strong { color:#111; }

  /* Two col */
  .two-col { display:grid; grid-template-columns:1fr 1fr; gap:20px; }

  /* Score aside */
  .score-row { display:flex; justify-content:space-between; align-items:baseline; margin-bottom:6px; }
  .score-num { font-size:14px; font-weight:700; font-family:monospace; color:#999; }

  /* Footer */
  .footer { margin-top:28px; padding-top:10px; border-top:1px solid #eee; font-size:9px; color:#ccc; display:flex; justify-content:space-between; }

  @media print { body { -webkit-print-color-adjust:exact; print-color-adjust:exact; } }
</style>
</head>
<body>
<div class="page">

  <p class="eyebrow">GEM Script Evaluation</p>
  <div class="score-row">
    <h1>${title}</h1>
    <span class="score-num">${v.weighted_score.toFixed(1)} / 100</span>
  </div>
  <p class="meta">${new Date(report.generated_at).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })} · ${report.engine_version}</p>

  <div class="verdict-block">
    <div class="verdict-label">${producerVerdict}</div>
    <p class="verdict-one-line">${v.one_line}</p>
    <div class="tags">${tagHTML}</div>
  </div>

  <div class="section">
    <p class="section-label">The Analysis</p>
    <p>${report.producer_takeaway.replace(/\.\s*Outscores?\s+\d+%[^.]*\./gi, ".").replace(/\s+/g, " ").trim()}</p>
    <p style="margin-top:8px">${marketPositioning}</p>
  </div>

  <div class="two-col section" style="border-top:1px solid #eee; padding-top:16px;">
    <div>
      <p class="section-label" style="color:#1a7a45">Why It Could Sell</p>
      ${bulletHTML(upsideBullets, "#1a7a45")}
    </div>
    <div>
      <p class="section-label" style="color:#b22222">What May Hold It Back</p>
      ${bulletHTML(riskBullets, "#b22222")}
    </div>
  </div>

  <div class="section">
    <p class="section-label">What Would Unlock This</p>
    <p>${packagingNote}</p>
  </div>

  <div class="footer">
    <span>GEM — Greenlight Evaluation Model</span>
    <span>${report.engine_version} · ${new Date(report.generated_at).toLocaleDateString()}</span>
  </div>

</div>
<script>setTimeout(() => window.print(), 250);</script>
</body>
</html>`);
  win.document.close();
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params  = useParams();
  const router  = useRouter();
  const showId  = params.id as string;

  const [report, setReport]           = useState<GEMReport | null>(null);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState<string | null>(null);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [showIds, setShowIds]         = useState<string[]>([]);

  useEffect(() => {
    if (!showId) return;
    (async () => {
      try {
        const [reportRes, listRes] = await Promise.all([
          fetch(`/api/reports/${showId}`),
          fetch("/api/reports").catch(() => null),
        ]);
        if (!reportRes.ok) throw new Error("Report not found");
        setReport(await reportRes.json());
        if (listRes?.ok) {
          const { reports } = await listRes.json();
          setShowIds((reports as { show_id: string }[]).map((r) => r.show_id));
        }
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [showId]);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size={40} />
      </div>
    );

  if (error || !report)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50">
        <p className="text-zinc-500">{error || "Report not found"}</p>
        <button onClick={() => router.push("/dashboard")} className="gem-btn-secondary text-sm">
          Back to Dashboard
        </button>
      </div>
    );

  // ── Derived values ──────────────────────────────────────────────────────────
  const v              = report.verdict;
  const verdictInfo    = PRODUCER_VERDICT[v.label];
  const metadataTags   = deriveMetadataTags(report);
  const marketPosition = deriveMarketPositioning(report);
  const upsideBullets  = getUpsideBullets(report);
  const riskBullets    = getRiskBullets(report);
  const packagingNote  = derivePackagingNote(report);

  const title = showId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const currentIdx = showIds.indexOf(showId);
  const prevId = currentIdx > 0 ? showIds[currentIdx - 1] : null;
  const nextId =
    currentIdx !== -1 && currentIdx < showIds.length - 1
      ? showIds[currentIdx + 1]
      : null;

  const dimAbove = report.dimensions.filter((d) => d.vs_winner_avg >= 0).length;
  const dimBelow = report.dimensions.filter((d) => d.vs_winner_avg < -1.5).length;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen pb-24 bg-zinc-50">

      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="border-b border-zinc-200 bg-white">
        <div className="gem-container py-5">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              <ArrowLeft size={15} />
              Dashboard
            </button>

            {showIds.length > 1 && (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => prevId && router.push(`/report/${prevId}`)}
                  disabled={!prevId}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded border border-transparent hover:border-zinc-200"
                >
                  <ArrowLeft size={12} /> Prev
                </button>
                <span className="text-zinc-400 text-xs px-1 font-mono">
                  {currentIdx + 1} / {showIds.length}
                </span>
                <button
                  onClick={() => nextId && router.push(`/report/${nextId}`)}
                  disabled={!nextId}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-700 transition-colors disabled:opacity-30 disabled:cursor-not-allowed px-2 py-1 rounded border border-transparent hover:border-zinc-200"
                >
                  Next <ArrowRight size={12} />
                </button>
              </div>
            )}
          </div>

          <h1 className="text-2xl md:text-3xl font-semibold text-zinc-950 mt-4">
            {title}
          </h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">
            GEM Script Evaluation &middot;{" "}
            {new Date(report.generated_at).toLocaleDateString()} &middot;{" "}
            {report.engine_version}
          </p>
        </div>
      </div>

      <div className="gem-container mt-8 max-w-3xl space-y-0">

        {/* ── 1. Verdict Block ─────────────────────────────────────────────── */}
        <section
          className="rounded-2xl border overflow-hidden mb-8 shadow-sm"
          style={{
            borderLeftWidth: "4px",
            borderLeftColor: verdictInfo.borderColor,
            borderColor: verdictInfo.borderColor,
            background: verdictInfo.bg,
          }}
        >
          <div className="p-6 md:p-8">
            {/* Producer verdict label + score */}
            <div className="flex items-start justify-between gap-4 mb-3">
              <div
                className="text-3xl md:text-4xl font-bold tracking-tight leading-none"
                style={{ color: verdictInfo.color }}
              >
                {verdictInfo.label}
              </div>
              <div className="text-right shrink-0 pt-1">
                <div className="text-lg font-mono font-bold text-zinc-500">
                  {v.weighted_score.toFixed(1)}
                </div>
                <div className="text-[10px] font-mono text-zinc-400">/ 100</div>
              </div>
            </div>

            {/* One-line summary */}
            <p className="text-base text-zinc-950 leading-relaxed mb-4">
              {v.one_line}
            </p>

            {/* Metadata tags */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              {metadataTags.map((tag) => (
                <span
                  key={tag}
                  className="text-xs font-medium text-zinc-600 border border-zinc-300 rounded-full px-3 py-0.5 bg-white"
                >
                  {tag}
                </span>
              ))}
            </div>

          </div>
        </section>

        {/* ── 2. The Analysis ──────────────────────────────────────────────── */}
        <section className="mb-8 pb-8 border-b border-zinc-200">
          <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-3">
            The Analysis
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed mb-3">
            {report.producer_takeaway.replace(/\.\s*Outscores?\s+\d+%[^.]*\./gi, ".").replace(/\s+/g, " ").trim()}
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed">
            {marketPosition}
          </p>
        </section>

        {/* ── 4. Why It Could Sell / What May Hold It Back ─────────────────── */}
        <section className="mb-8 pb-8 border-b border-zinc-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Upside */}
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest text-emerald-700 uppercase mb-4">
                Why It Could Sell
              </p>
              <div className="space-y-4">
                {upsideBullets.map((b, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-emerald-600 mt-0.5 shrink-0 text-sm">→</span>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {b.title && (
                        <span className="font-semibold text-zinc-950">{b.title}. </span>
                      )}
                      {b.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Risk */}
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest text-red-600 uppercase mb-4">
                What May Hold It Back
              </p>
              <div className="space-y-4">
                {riskBullets.map((b, i) => (
                  <div key={i} className="flex gap-3">
                    <span className="text-red-500 mt-0.5 shrink-0 text-sm">→</span>
                    <p className="text-sm text-zinc-600 leading-relaxed">
                      {b.title && (
                        <span className="font-semibold text-zinc-950">{b.title}. </span>
                      )}
                      {b.note}
                    </p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </section>

        {/* ── 5. What Would Unlock This ────────────────────────────────────── */}
        <section className="mb-10 pb-8 border-b border-zinc-200">
          <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-3">
            What Would Unlock This
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed">
            {packagingNote}
          </p>
        </section>

        {/* ── 6. Analytics Appendix ────────────────────────────────────────── */}
        <section className="mb-8">
          <button
            onClick={() => setAnalyticsOpen(!analyticsOpen)}
            className="w-full flex items-center justify-between gem-card p-4 hover:border-zinc-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Deep Analytics
              </span>
              <span className="text-xs font-mono text-zinc-400">
                10 dimensions &nbsp;&middot;&nbsp;
                <span className="text-emerald-600">{dimAbove} at/above benchmark</span>
                &nbsp;&middot;&nbsp;
                <span className="text-red-500">{dimBelow} significantly below</span>
              </span>
            </div>
            <span className="text-zinc-400 group-hover:text-zinc-700 transition-colors">
              {analyticsOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {analyticsOpen && (
            <div className="mt-3 space-y-3">
              {Object.entries(DIMENSION_GROUPS).map(([groupName, dimIds]) => {
                const groupDims = dimIds
                  .map((id) => report.dimensions.find((d) => d.dimension === id))
                  .filter(Boolean) as typeof report.dimensions;

                if (groupDims.length === 0) return null;

                // Group-level summary
                const avgGap =
                  groupDims.reduce((s, d) => s + d.vs_winner_avg, 0) /
                  groupDims.length;

                return (
                  <div key={groupName} className="gem-card overflow-hidden shadow-sm">
                    {/* Group header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-200 bg-zinc-50">
                      <span className="text-xs font-bold text-zinc-600 uppercase tracking-widest">
                        {groupName}
                      </span>
                      <span
                        className={`text-xs font-mono ${
                          avgGap >= 0.5
                            ? "text-emerald-600"
                            : avgGap <= -1
                            ? "text-red-500"
                            : "text-zinc-400"
                        }`}
                      >
                        {vsWinnerLabel(avgGap)}
                      </span>
                    </div>

                    {/* Dimension bars */}
                    <div className="divide-y divide-zinc-100">
                      {groupDims.map((d) => (
                        <div key={d.dimension} className="px-4 py-1">
                          <DimensionBar
                            dimensionId={d.dimension as DimensionId}
                            score={d.score}
                            weight={d.weight}
                            reasoning={d.reasoning}
                            winnerAvg={d.winner_avg}
                            vsWinnerAvg={d.vs_winner_avg}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Footer: export + nav ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() =>
              generatePDF(
                report,
                title,
                verdictInfo.label,
                metadataTags,
                marketPosition,
                upsideBullets,
                riskBullets,
                packagingNote,
              )
            }
            className="gem-btn-primary text-sm flex items-center gap-2"
          >
            <FileText size={14} />
            Download Producer Memo
          </button>

          {showIds.length > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => prevId && router.push(`/report/${prevId}`)}
                disabled={!prevId}
                className="gem-btn-secondary text-sm flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                <ArrowLeft size={14} /> Prev
              </button>
              <button
                onClick={() => nextId && router.push(`/report/${nextId}`)}
                disabled={!nextId}
                className="gem-btn-secondary text-sm flex items-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed"
              >
                Next <ArrowRight size={14} />
              </button>
            </div>
          )}
        </div>

      </div>
    </main>
  );
}
