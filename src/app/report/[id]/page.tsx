"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft, ArrowRight, ChevronDown, ChevronUp, FileText,
} from "lucide-react";
import { DimensionBar } from "@/components/ui/facet-bar";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import type { GEMReport, Verdict, DimensionId } from "@/types";

// ─── Writer-Facing Verdict Map ──────────────────────────────────────────────
// Translates internal model tiers into constructive, writer-facing language.

const WRITER_VERDICT: Record<
  Verdict,
  { label: string; color: string; borderColor: string; bg: string; encouragement: string }
> = {
  "STRONG SIGNAL": {
    label: "GEM SELECT",
    color: "#15803d",      // emerald-700
    borderColor: "#16a34a", // emerald-600
    bg: "#f0fdf4",          // emerald-50
    encouragement: "This script stands out. Our development team has been notified.",
  },
  "WORTH THE READ": {
    label: "ON OUR RADAR",
    color: "#b45309",      // amber-700
    borderColor: "#d97706", // amber-600
    bg: "#fffbeb",          // amber-50
    encouragement: "There's real strength here. With focused development, this could break through.",
  },
  MIXED: {
    label: "DEVELOPMENT NOTES",
    color: "#52525b",      // zinc-600
    borderColor: "#d4d4d8", // zinc-300
    bg: "#fafafa",          // zinc-50
    encouragement: "We see promising elements in your writing. Here's where to focus your next draft.",
  },
  PASS: {
    label: "KEEP WRITING",
    color: "#71717a",      // zinc-500
    borderColor: "#e4e4e7", // zinc-200
    bg: "transparent",
    encouragement: "This script isn't where it needs to be yet — but every draft teaches you something. Here's your roadmap forward.",
  },
};

// ─── Dimension accessor ───────────────────────────────────────────────────────

function dim(report: GEMReport, id: string): number {
  return report.dimensions.find((d) => d.dimension === id)?.score ?? 5;
}

// ─── Metadata Tags ────────────────────────────────────────────────────────────
// 2-3 quick-read tags that frame the script for the writer at a glance.

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

  // Strongest creative signal
  if (character >= 7.5)                          tags.push("Character-Driven");
  else if (tonal >= 7.5 && originality >= 7)     tags.push("Voice-Driven");
  else if (world >= 7.5)                         tags.push("World-Driven");

  // Notable qualifier — only surface if clearly meaningful
  if (depth >= 8)           tags.push("Slow-Burn Potential");
  else if (hook < 5.5)      tags.push("Hook Needs Work");
  else if (momentum < 5.5)  tags.push("Pacing Needs Work");

  return tags.slice(0, 3);
}

// ─── Script Quality Assessment ───────────────────────────────────────────────
// A conversational read on the script's creative qualities, written directly
// to the writer. Constructive and specific.

function deriveCreativeAssessment(report: GEMReport): string {
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
    sentences.push("Your concept is sharply defined and immediately compelling — the premise lands with full clarity from the first read.");
  } else if (hook >= 6.5) {
    sentences.push("Your concept is clear and workable. Consider sharpening the hook in your opening pages to make it land with even more force.");
  } else {
    sentences.push("The conceptual hook is the area that needs the most attention — we'd encourage you to clarify and sharpen your core premise so it lands on first read.");
  }

  // Character & world
  if (character >= 8 && world >= 8) {
    sentences.push("Both character and world feel fully realized — the script earns genuine investment in its people and its setting.");
  } else if (character >= 7.5 && ensemble >= 7) {
    sentences.push("Character is your clear strength — the lead and ensemble are drawn with real specificity and long-run potential.");
  } else if (world >= 8) {
    sentences.push("Your world-building is a standout — the setting feels richly textured and generates story naturally.");
  } else if (character < 6) {
    sentences.push("Character depth is the area with the most room to grow — deepening your characters' contradictions and specificity would have the biggest impact on the read.");
  }

  // Tone & originality
  if (tonal >= 7.5 && originality >= 7.5) {
    sentences.push("You have a distinctive voice and genuine creative originality — that combination gives your writing a memorable identity.");
  } else if (tonal >= 7) {
    sentences.push("Your tonal control is solid — the script has a consistent, recognizable register throughout.");
  } else if (originality >= 8) {
    sentences.push("There's real creative boldness here — you're taking risks that pay off, and that's exactly what makes writing stand out.");
  } else if (tonal < 6) {
    sentences.push("We'd encourage you to commit more decisively to your show's tone — the material would benefit from a clearer, more consistent register.");
  }

  // Depth & breadth of appeal
  if (depth >= 8.5) {
    sentences.push("The latent thematic depth here gives your script strong long-term resonance potential well beyond the pilot.");
  } else if (audience >= 8 && character >= 7.5) {
    sentences.push("The combination of broad appeal and strong characters suggests real staying power across multiple seasons.");
  }

  return sentences.join(" ");
}

// ─── Strength Bullets ───────────────────────────────────────────────────────
// Always 3. What's working in the script — lead with the positive.

function getStrengthBullets(
  report: GEMReport,
): { title: string; note: string }[] {
  const result: { title: string; note: string }[] = [];
  const used = new Set<string>();

  // If model provided "why it stands out" highlights, prefer those
  if (
    report.highlights?.type === "why_it_stands_out" &&
    report.highlights.bullets.length >= 3
  ) {
    return report.highlights.bullets.slice(0, 3).map((b) => {
      const colonIdx = b.indexOf(": ");
      if (colonIdx > 0 && colonIdx < 60) {
        return { title: b.slice(0, colonIdx), note: b.slice(colonIdx + 2) };
      }
      return { title: "", note: b };
    });
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

// ─── Growth Area Bullets ─────────────────────────────────────────────────────
// Always 3 constructive areas for development. Framed as opportunities, not failures.

function getGrowthBullets(
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

  // 4. Script-signal-based growth areas
  if (result.length < 3) {
    const audience    = dim(report, "audience_appeal_marketability");
    const hook        = dim(report, "conceptual_hook_clarity");
    const momentum    = dim(report, "narrative_momentum_engagement");
    const originality = dim(report, "creative_originality_and_boldness");

    const candidates: { title: string; note: string; threshold: boolean }[] = [
      {
        title: "Audience Reach",
        note: "Consider whether there are ways to broaden your script's appeal without compromising your creative vision.",
        threshold: audience < 7.5,
      },
      {
        title: "Hook Clarity",
        note: "Your concept hook could land more sharply — try articulating your show's premise in two sentences and let that clarity guide your opening pages.",
        threshold: hook < 7,
      },
      {
        title: "Pacing & Momentum",
        note: "The script's momentum could be tightened — look at your act structure and consider escalating stakes earlier.",
        threshold: momentum < 7,
      },
      {
        title: "Distinctive Voice",
        note: "Finding a more distinctive angle or voice would help your script stand apart from similar projects in the market.",
        threshold: originality < 7,
      },
    ];
    for (const c of candidates) {
      if (result.length >= 3) break;
      if (c.threshold) result.push({ title: c.title, note: c.note });
    }
  }

  // 5. Tier-aware guidance for scripts with no flagged gaps
  if (result.length < 3) {
    const tier = report.verdict?.label;
    const generic: { title: string; note: string }[] = tier === "PASS" || tier === "MIXED"
      ? [
          { title: "Core Concept", note: "Your premise would benefit from a fundamental rethink — ask yourself what makes this show uniquely yours, and build from there." },
          { title: "Market Readiness", note: "Before submitting widely, consider how your script positions against what's currently being bought and what's missing from the market." },
          { title: "Fresh Perspective", note: "Try reading your script as if you've never seen it before. What questions does it leave unanswered? What would make you turn to page two?" },
        ]
      : [
          { title: "Polish Pass", note: "Your script is strong — a focused polish pass on your weakest dimension could be the difference between good and undeniable." },
          { title: "Market Timing", note: "Consider the current landscape and whether your script fills a gap that buyers are actively looking to fill." },
          { title: "Competitive Positioning", note: "Read widely in your genre to make sure your script is differentiated enough to stand out in a crowded field." },
        ];
    for (const w of generic) {
      if (result.length >= 3) break;
      result.push(w);
    }
  }

  return result.slice(0, 3);
}

// ─── Next Steps Note ─────────────────────────────────────────────────────────
// The single most impactful thing the writer could do next.

function deriveNextSteps(report: GEMReport): string {
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
        "Your highest-leverage move: sharpen the concept hook in the opening pages. Make your premise impossible to misunderstand.",
      audience_appeal_marketability:
        "Consider how to broaden your script's commercial appeal without losing what makes it yours. That balance is your next challenge.",
      character_appeal_and_long_term_potential:
        "Deepen your lead character's contradictions and long-term arc potential — that's what separates good scripts from great ones.",
      narrative_momentum_engagement:
        "Focus on tightening your act structure and escalating stakes earlier. The read should feel propulsive from page one.",
      tonal_specificity:
        "Commit more decisively to your show's specific tone. When you find your register and hold it, everything else comes into focus.",
      world_density_and_texture:
        "Build out your world's implicit story-generating machinery — the details and systems that make audiences feel like they've been dropped into a real place.",
      relationship_density_and_ensemble_engine:
        "Sharpen your ensemble dynamics — when character relationships generate conflict on their own, you've built a real engine for the series.",
      resonant_originality:
        "Push harder to find what's uniquely yours in this material. The best scripts feel both surprising and inevitable.",
      creative_originality_and_boldness:
        "Lean harder into your creative instincts — the script would benefit from bolder choices and more genuine risk-taking.",
      latent_depth_slow_burn_potential:
        "Seed more layers beneath the surface. The scripts that endure are the ones that keep revealing new depth on repeat viewings.",
    };
    return gapNotes[biggestGap.dimension]
      ?? `Improving ${biggestGap.display_name} is your highest-leverage priority for the next draft.`;
  }

  // No significant gaps — point to the most productive refinement direction
  if (depth < 7.5) {
    return "Your script is in good shape. To push it further, seed more latent thematic depth — the kind that rewards audiences who come back.";
  }
  if (ensemble < 7) {
    return "Strong foundation. To elevate it, sharpen your ensemble dynamics — the relationships between characters should generate conflict automatically.";
  }
  if (originality < 7.5) {
    return "You're close. The next step is to lean harder into what makes this material distinctly yours — that's what makes a script unforgettable.";
  }

  // Strong script with no clear gaps
  const weakest = [...report.dimensions].sort((a, b) => a.vs_winner_avg - b.vs_winner_avg)[0];
  return `This is strong work. If you're looking for where to push further, ${weakest.display_name.toLowerCase()} is the one area with the most room to grow — but you're already well above average.`;
}

// ─── Dimension Grouping for Deep Dive ────────────────────────────────────

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

// ─── PDF Generation — Writer Feedback Format ───────────────────────────────

function generatePDF(
  report: GEMReport,
  title: string,
  writerVerdict: string,
  metadataTags: string[],
  creativeAssessment: string,
  strengthBullets: { title: string; note: string }[],
  growthBullets: { title: string; note: string }[],
  nextSteps: string,
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
          <span class="bullet-arrow" style="color:${color}">\u2192</span>
          <div>${b.title ? `<strong>${b.title}.</strong> ` : ""}${b.note}</div>
        </div>`,
      )
      .join("");

  win.document.write(`<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>GEM Feedback \u2014 ${title}</title>
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

  <p class="eyebrow">GEM Script Feedback</p>
  <div class="score-row">
    <h1>${title}</h1>
    <span class="score-num">${v.weighted_score.toFixed(1)} / 100</span>
  </div>
  <p class="meta">${new Date(report.generated_at).toLocaleDateString("en-US", { year:"numeric", month:"long", day:"numeric" })} \xb7 ${report.engine_version}</p>

  <div class="verdict-block">
    <div class="verdict-label">${writerVerdict}</div>
    <p class="verdict-one-line">${v.one_line}</p>
    <div class="tags">${tagHTML}</div>
  </div>

  <div class="section">
    <p class="section-label">Our Read</p>
    <p>${report.producer_takeaway.replace(/\.\s*Outscores?\s+\d+%[^.]*\./gi, ".").replace(/\s+/g, " ").trim()}</p>
    <p style="margin-top:8px">${creativeAssessment}</p>
  </div>

  <div class="two-col section" style="border-top:1px solid #eee; padding-top:16px;">
    <div>
      <p class="section-label" style="color:#1a7a45">What\u2019s Working</p>
      ${bulletHTML(strengthBullets, "#1a7a45")}
    </div>
    <div>
      <p class="section-label" style="color:#b45309">Where to Focus Next</p>
      ${bulletHTML(growthBullets, "#b45309")}
    </div>
  </div>

  <div class="section">
    <p class="section-label">Your Next Step</p>
    <p>${nextSteps}</p>
  </div>

  <div class="footer">
    <span>GEM \u2014 Greenlight Evaluation Model</span>
    <span>${report.engine_version} \xb7 ${new Date(report.generated_at).toLocaleDateString()}</span>
  </div>

</div>
<script>setTimeout(() => window.print(), 250);</script>
</body>
</html>`);
  win.document.close();
}

// ─── Types ─────────────────────────────────────────────────────────────────────

interface GEMSubmission {
  id: string;
  show_id: string;
  title: string | null;
  pitch: string | null;
  season_plan: string | null;
  casting_vision: string | null;
  imdb_url: string | null;
  collaborators: { name: string; email: string }[];
  concept_image_urls: string[];
  status: "pending_review" | "published";
  created_at: string;
}

interface GEMComment {
  id: string;
  user_id: string;
  author_name: string;
  is_gem_team: boolean;
  body: string;
  created_at: string;
}

// ─── Comment Section Component ─────────────────────────────────────────────────

function CommentSection({ showId }: { showId: string }) {
  const [comments, setComments] = useState<GEMComment[]>([]);
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    fetch(`/api/submissions/${showId}/comments`)
      .then((r) => r.json())
      .then(({ comments: c }) => setComments(c || []))
      .catch(() => {});
  }, [showId]);

  const send = async () => {
    if (!body.trim() || sending) return;
    setSending(true);
    try {
      const res = await fetch(`/api/submissions/${showId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body }),
      });
      if (res.ok) {
        const { comment } = await res.json();
        setComments((prev) => [...prev, comment]);
        setBody("");
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="mt-10 pt-8 border-t border-zinc-200">
      <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-4">
        Messages
      </p>

      {comments.length === 0 && (
        <p className="text-sm text-zinc-400 mb-4">
          Have a question about your submission? Leave a message and we&apos;ll reply here.
        </p>
      )}

      {comments.length > 0 && (
        <div className="space-y-3 mb-4">
          {comments.map((c) => (
            <div
              key={c.id}
              className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                c.is_gem_team
                  ? "bg-zinc-950 text-white ml-8"
                  : "bg-white border border-zinc-200 text-zinc-700 mr-8"
              }`}
            >
              <p className="font-semibold text-xs mb-1 opacity-60">
                {c.is_gem_team ? "GEM" : c.author_name} &middot;{" "}
                {new Date(c.created_at).toLocaleDateString("en-US", {
                  month: "short", day: "numeric",
                })}
              </p>
              <p>{c.body}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Write a message..."
          rows={2}
          className="gem-input flex-1 resize-none text-sm"
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) send();
          }}
        />
        <button
          onClick={send}
          disabled={!body.trim() || sending}
          className="gem-btn-primary self-end text-sm px-4 disabled:opacity-50"
        >
          Send
        </button>
      </div>
    </section>
  );
}

// ─── Pending View ──────────────────────────────────────────────────────────────

function PendingView({
  showId,
  submission,
}: {
  showId: string;
  submission: GEMSubmission;
}) {
  const router = useRouter();
  const title = submission.title || showId
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  return (
    <main className="min-h-screen pb-24 bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white">
        <div className="gem-container py-5">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            <ArrowLeft size={15} />
            My Scripts
          </button>
          <h1 className="text-2xl md:text-3xl font-semibold text-zinc-950 mt-4">{title}</h1>
          <p className="text-xs text-zinc-400 mt-1 font-mono uppercase tracking-wider">
            Submitted {new Date(submission.created_at).toLocaleDateString("en-US", {
              month: "long", day: "numeric", year: "numeric",
            })}
          </p>
        </div>
      </div>

      <div className="gem-container mt-8 max-w-3xl">

        {/* Status banner */}
        <div className="rounded-2xl bg-zinc-950 text-white px-6 py-5 mb-8 flex items-start gap-4">
          <span className="text-xl mt-0.5 animate-pulse">&#9679;</span>
          <div>
            <p className="font-semibold text-base mb-1">Under Review</p>
            <p className="text-sm text-zinc-300 leading-relaxed">
              We&apos;ve received your script and submission. A personalized review will be delivered within 24 hours — we&apos;ll update this page when it&apos;s ready.
            </p>
          </div>
        </div>

        {/* Submission recap */}
        <div className="space-y-5">

          {submission.pitch && (
            <div className="gem-card p-5 shadow-sm">
              <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">
                Your Pitch
              </p>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                {submission.pitch}
              </p>
            </div>
          )}

          {submission.season_plan && (
            <div className="gem-card p-5 shadow-sm">
              <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">
                Season 1 Framework
              </p>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                {submission.season_plan}
              </p>
            </div>
          )}

          {submission.casting_vision && (
            <div className="gem-card p-5 shadow-sm">
              <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">
                Dream Casting
              </p>
              <p className="text-sm text-zinc-700 leading-relaxed whitespace-pre-line">
                {submission.casting_vision}
              </p>
            </div>
          )}

          {submission.concept_image_urls.length > 0 && (
            <div className="gem-card p-5 shadow-sm">
              <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-3">
                Visual Concepts
              </p>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {submission.concept_image_urls.map((url, i) => (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    key={i}
                    src={url}
                    alt={`Concept ${i + 1}`}
                    className="aspect-square w-full object-cover rounded-xl border border-zinc-200"
                  />
                ))}
              </div>
            </div>
          )}

          {submission.imdb_url && (
            <div className="gem-card p-5 shadow-sm">
              <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-2">
                IMDb
              </p>
              <a
                href={submission.imdb_url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-zinc-700 hover:text-zinc-950 underline"
              >
                {submission.imdb_url}
              </a>
            </div>
          )}

        </div>

        <CommentSection showId={showId} />
      </div>
    </main>
  );
}

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function ReportPage() {
  const params  = useParams();
  const router  = useRouter();
  const showId  = params.id as string;

  const [report, setReport]             = useState<GEMReport | null>(null);
  const [submission, setSubmission]     = useState<GEMSubmission | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [deepDiveOpen, setDeepDiveOpen] = useState(false);
  const [showIds, setShowIds]           = useState<string[]>([]);

  useEffect(() => {
    if (!showId) return;
    (async () => {
      try {
        const [reportRes, listRes, submissionRes] = await Promise.all([
          fetch(`/api/reports/${showId}`).catch(() => null),
          fetch("/api/reports").catch(() => null),
          fetch(`/api/submissions/${showId}`).catch(() => null),
        ]);

        if (submissionRes?.ok) {
          const { submission: sub } = await submissionRes.json();
          setSubmission(sub || null);

          // If pending_review and we have a submission record, show pending view
          if (sub?.status === "pending_review") {
            setLoading(false);
            return;
          }
        }

        if (!reportRes?.ok) throw new Error("Report not found");
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

  // Pending review — show submission info + waiting state
  if (submission?.status === "pending_review") {
    return <PendingView showId={showId} submission={submission} />;
  }

  if (error || !report)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-zinc-50">
        <p className="text-zinc-500">{error || "Report not found"}</p>
        <button onClick={() => router.push("/dashboard")} className="gem-btn-secondary text-sm">
          Back to My Scripts
        </button>
      </div>
    );

  // ── Derived values ──────────────────────────────────────────────────────────
  const v              = report.verdict;
  const verdictInfo    = WRITER_VERDICT[v.label];
  const metadataTags   = deriveMetadataTags(report);
  const creativeAssessment = deriveCreativeAssessment(report);
  const strengthBullets  = getStrengthBullets(report);
  const growthBullets    = getGrowthBullets(report);
  const nextSteps        = deriveNextSteps(report);

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
              My Scripts
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
            GEM Script Feedback &middot;{" "}
            {new Date(report.generated_at).toLocaleDateString()}
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
            {/* Writer verdict label + score */}
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

            {/* Encouragement line */}
            <p className="text-base text-zinc-700 leading-relaxed mb-3">
              {verdictInfo.encouragement}
            </p>

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

        {/* ── 2. Our Read ──────────────────────────────────────────────── */}
        <section className="mb-8 pb-8 border-b border-zinc-200">
          <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-3">
            Our Read
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed mb-3">
            {report.producer_takeaway.replace(/\.\s*Outscores?\s+\d+%[^.]*\./gi, ".").replace(/\s+/g, " ").trim()}
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed">
            {creativeAssessment}
          </p>
        </section>

        {/* ── 3. What's Working / Where to Focus Next ─────────────────── */}
        <section className="mb-8 pb-8 border-b border-zinc-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

            {/* Strengths */}
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest text-emerald-700 uppercase mb-4">
                What&apos;s Working
              </p>
              <div className="space-y-4">
                {strengthBullets.map((b, i) => {
                  let title = b.title;
                  let note = b.note;
                  if (!title) {
                    const idx = note.indexOf(": ");
                    if (idx > 0 && idx < 60) {
                      title = note.slice(0, idx);
                      note = note.slice(idx + 2);
                    }
                  }
                  return (
                    <div key={i} className="flex gap-3">
                      <span className="text-emerald-600 mt-0.5 shrink-0 text-sm">&rarr;</span>
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        {title && <span className="font-semibold text-zinc-950">{title}. </span>}
                        {note}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Growth areas */}
            <div>
              <p className="text-[10px] font-mono font-bold tracking-widest text-amber-700 uppercase mb-4">
                Where to Focus Next
              </p>
              <div className="space-y-4">
                {growthBullets.map((b, i) => {
                  let title = b.title;
                  let note = b.note;
                  if (!title) {
                    const idx = note.indexOf(": ");
                    if (idx > 0 && idx < 60) {
                      title = note.slice(0, idx);
                      note = note.slice(idx + 2);
                    }
                  }
                  return (
                    <div key={i} className="flex gap-3">
                      <span className="text-amber-600 mt-0.5 shrink-0 text-sm">&rarr;</span>
                      <p className="text-sm text-zinc-600 leading-relaxed">
                        {title && <span className="font-semibold text-zinc-950">{title}. </span>}
                        {note}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>
        </section>

        {/* ── 4. Your Next Step ────────────────────────────────────────── */}
        <section className="mb-10 pb-8 border-b border-zinc-200">
          <p className="text-[10px] font-mono font-bold tracking-widest text-zinc-400 uppercase mb-3">
            Your Next Step
          </p>
          <p className="text-sm text-zinc-600 leading-relaxed">
            {nextSteps}
          </p>
        </section>

        {/* ── 5. Deep Dive — Dimension Breakdown ────────────────────────── */}
        <section className="mb-8">
          <button
            onClick={() => setDeepDiveOpen(!deepDiveOpen)}
            className="w-full flex items-center justify-between gem-card p-4 hover:border-zinc-300 hover:shadow-sm transition-all group"
          >
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
                Deep Dive
              </span>
              <span className="text-xs font-mono text-zinc-400">
                10 dimensions &nbsp;&middot;&nbsp;
                <span className="text-emerald-600">{dimAbove} at/above benchmark</span>
                &nbsp;&middot;&nbsp;
                <span className="text-amber-600">{dimBelow} need attention</span>
              </span>
            </div>
            <span className="text-zinc-400 group-hover:text-zinc-700 transition-colors">
              {deepDiveOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </span>
          </button>

          {deepDiveOpen && (
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
                            ? "text-amber-600"
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

        {/* ── Comments ─────────────────────────────────────────────────────── */}
        <CommentSection showId={showId} />

        {/* ── Footer: export + nav ──────────────────────────────────────────── */}
        <div className="flex items-center justify-between pt-8">
          <button
            onClick={() =>
              generatePDF(
                report,
                title,
                verdictInfo.label,
                metadataTags,
                creativeAssessment,
                strengthBullets,
                growthBullets,
                nextSteps,
              )
            }
            className="gem-btn-primary text-sm flex items-center gap-2"
          >
            <FileText size={14} />
            Download Feedback Report
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
