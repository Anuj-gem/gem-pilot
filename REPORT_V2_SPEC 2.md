# Report v5 — Prompt & Surface Spec (v4 → v5 evolution)

**Status:** Draft for review
**Date:** 2026-04-16
**Scope:** Evolve the v4 evaluation prompt into v5. All changes are additive or reframing — the 10-dimension scoring backbone and weighting stay exactly as they are. UI reshaped to hide scores and merge sections.
**Production prompt today:** `src/lib/evaluation-prompt-v4.ts` (imported by `src/app/api/evaluate/route.ts`)

---

## Goal

Evolve the report from a scorecard-with-advocate-framing into a producer/dev-exec-grade read. Scores stop surfacing to users; everything that feeds them stays intact. Writer sees a pitch-ready report with honest-but-respectful constructive notes.

## Principles

1. **Additive + reframe, not rebuild.** 10-dimension scoring, reasoning, weights, weighted_score, tier all keep running.
2. **Scores go internal-only.** UI stops surfacing the dimension reasoning and the numeric `weighted_score` / `tier`. Nothing about their computation changes.
3. **Existing fields evolve; new fields layer on.** No field is removed from the JSON schema. New optional fields are added. Legacy reports render cleanly.
4. **v4 advocate voice softens where needed.** v4 forbids "risk/weakness/flaw." v5 keeps that on the pitch side but allows respectful critical push on the constructive side — see §4.

---

## What stays exactly as-is

- **All 10 scored dimensions** and their reasoning — still generated, still feed `weighted_score` and `tier`:
  - `audience_appeal_marketability`
  - `conceptual_hook_clarity`
  - `character_appeal_and_long_term_potential`
  - `creative_originality_and_boldness`
  - `narrative_momentum_engagement`
  - `resonant_originality`
  - `world_density_and_texture`
  - `tonal_specificity`
  - `latent_depth_slow_burn_potential`
  - `relationship_density_and_ensemble_engine`
- Internal weights (V3_RAW_WEIGHTS in `types/index.ts`) — unchanged
- `calculateWeightedScore` / `calculateTier` — unchanged
- `classification` object
- `production_reality` — all existing subfields preserved (cast, locations, technical, rights_flags, platform_fit)
- `lead_characters[]` with `name, role_type, demographics, hook, why_actor_wants_this`
- `whats_special` overall shape — `{ strengths[], headline }`
- `considerations[]` — shape preserved (see §4 for voice change)
- Leaderboard, admin tooling, enrichment, preview pages, v4-previews JSON — all continue working

---

## What's new or changing

### 1. Positioning Hook — sharpen the dev-exec voice

**What:** Keep the existing `positioning_hook` field. Tighten the prompt wording so it consistently opens with a specific distinguishing element and reads like a manager's forward-email line.

**Why:** v4's prompt is already strong here (no comparisons, specific, <25 words) but outputs still drift into flat summary on some scripts. The "distinguishing element" directive needs to be harder and more explicit.

**Prompt guidance:**
- Before drafting, model must identify the 1–2 distinguishing elements (protagonist identity, genre collision, setting hook, tonal juxtaposition) — if the script has a distinctive identity element (race, age, faith, disability, etc.) it MUST surface in the hook when it's load-bearing to the sell.
- Keep the existing "no comparison framing" rule. Keep the <25-word target.
- Add negative example: a hook that omits a load-bearing protagonist-identity element when one exists.

**JSON schema:** No change. Still `"positioning_hook": "string"`.

**UI:** No change — already rendered as the title/hero line on the report page.

---

### 2. `whats_special.strengths[]` — title carries the insight

**What:** Keep the existing schema. Change what goes in `dimension_or_area` from a category label to a sentence-form claim. The `what_it_means` field elaborates.

**Why:** Current output uses `dimension_or_area` as a taxonomy tag ("Protagonist engine", "Series engine"). The visual hierarchy puts weight on the title, so the title should earn it.

**Prompt guidance:**
- `dimension_or_area` becomes a claim: `[Specific assertion about this script]`. Example: *"Kelly's lead role is built on contradiction — comedy, vulnerability, and edge in one package"* instead of *"Protagonist engine"*.
- `what_it_means` elaborates; doesn't repeat the title.
- `evidence` still cites script specifics.
- No cap on count. v4 already says "no cap" — keep that.

**JSON schema:** No change.

**UI:** Render `dimension_or_area` prominently as the card title. `what_it_means` as the body. `evidence` stays as supporting ground.

---

### 3. Production Reality — add risk/complexity rubric

**What:** Add a new `risk_rubric` object inside `production_reality`. Rates Cost, Cast, Location, Content, Rights as Low / Medium / High with a one-line driver each. Raw facts stay below.

**Why:** Producers scan this first. Current section has great raw facts; zero synthesis. A 5-pill strip on top gives the instant read.

**Prompt guidance (new STEP 6.5):**
- Rate each axis against the intended tier/lane, not absolute scale (a $50M tentpole isn't "low cost" because it's cheaper than Avengers).
- Force commitment. Don't default to Medium across the board.
- `note` = one sentence citing the specific driver. Example: *"Night exteriors and a car chase push stunts to Medium."*
- Must be consistent with the detailed production facts below it.

**JSON schema (new, inside `production_reality`):**
```json
"risk_rubric": {
  "cost":     { "level": "low" | "medium" | "high", "note": "string" },
  "cast":     { "level": "low" | "medium" | "high", "note": "string" },
  "location": { "level": "low" | "medium" | "high", "note": "string" },
  "content":  { "level": "low" | "medium" | "high", "note": "string" },
  "rights":   { "level": "low" | "medium" | "high", "note": "string" }
}
```

**UI:** New horizontal 5-pill strip at top of Production Planning Details. Color coding: green/amber/red. FactCard grid renders below, unchanged.

---

### 4. Hype + Constructive (rename/reframe, merge scores out of UI)

**What:**
- `whats_special` is **Hype** (no change to function, minor title reframe per §2). UI-label change only.
- `considerations[]` is **Constructive**. Shape stays the same; prompt voice softens from pure-neutral to *"respectfully critical — protect the story, state the observation, suggest a direction."*
- **Dimension reasoning is no longer rendered in UI.** Still generated, still internal.

**Why:** The two "negative-adjacent" places in today's report (Considerations + Narrative Analysis Details) do adjacent work in different voices. Merging them into a single **Constructive** section gives the writer one coherent set of notes. Rendering the dimension reasoning was always a hedge — v4 itself says those are INTERNAL SIGNAL ONLY.

**Prompt guidance for `considerations`:**
- Keep the neutral-observation frame for purely-factual items (budget tier, comp landscape, audience sizing).
- Allow critical push where the craft has a clear gap — framed as: *"[Observation of what's happening] — [gentle directional suggestion]"*. Must assume the writer is defending the script. No "risk/weakness/flaw/problem/fails/lacks." "Tighten," "expand," "consider," "one direction" are allowed.
- Length: follow the script. Drop the "3–6" cap.
- Both Hype and Constructive draw from the same underlying analysis that feeds the dimension scores.

**JSON schema:** No change to `considerations` shape. `whats_special` unchanged.

**UI:**
- Section labeled **"What's Working"** (rendering `whats_special.strengths[]`). Kept headline + strength cards.
- Section labeled **"Where to Push"** (rendering `considerations[]`).
- **Remove** the current "Narrative Analysis Details" expandable dimension reasoning from `details-view.tsx`. Dimension scores + reasoning still exist in the evaluation JSON for internal use.

---

### 5. Package Angles — extend attachment bait

**What:** New `package_angles` object with `director_appeal` and `buyer_appeal`. Extends the `why_actor_wants_this` pattern from leads to the project as a whole.

**Why:** Producers/reps read for packaging potential. Naming the director persona and buyer fit makes the report pitch-ready without them having to synthesize it themselves.

**Prompt guidance (new STEP 8):**
- `director_appeal` — identify the director persona who'd want this and why. Specific without naming real people. Reference tonal neighborhoods. *"A director who wants to shoot middle-aged intimacy without flinching — the material rewards restraint over style."*
- `buyer_appeal` — tier + lane + why. *"Packageable at the $5–10M tier for a streamer half-hour; FX/A24-adjacent tone; no platform dependencies."*
- Both grounded in the script, not generic. Advocate voice applies.

**JSON schema (new, top level):**
```json
"package_angles": {
  "director_appeal": { "hook": "string (short)", "detail": "string" },
  "buyer_appeal":    { "tier": "string", "lane": "string", "detail": "string" }
}
```

**UI:** New "Package Angles" block on the public report, directly under `lead_characters`. Two mini-cards in the existing green accent style.

---

## Summary of schema changes

**Fields added to JSON:**
- `production_reality.risk_rubric` (object with 5 axes)
- `package_angles` (top-level object)

**Fields whose voice/content changes (shape unchanged):**
- `positioning_hook` — tighter distinguishing-element directive
- `whats_special.strengths[].dimension_or_area` — sentence-form claim, not category
- `considerations[]` — respectfully critical push allowed where warranted; length cap removed

**Fields that STOP being rendered in UI (but stay in JSON):**
- `scores[*].reasoning` — no longer shown as expandable rows
- `weighted_score` / `tier` — already hidden; nothing new to do

**Fields removed:** None.

---

## Test plan

Before any UI touches:

1. Draft v5 prompt in new file `src/lib/evaluation-prompt-v5.ts` — leave v4 in place for rollback.
2. Run v5 manually against 3–5 scripts with different profiles:
   - *I Work in Marketing Pilot* (comedy-drama, adult, contained)
   - *The Forever Man* (distinguishing protagonist-identity element)
   - One mid-tier feature
   - One pilot
   - One that's currently a strong Hype candidate
3. Compare v4 vs v5 outputs side-by-side on:
   - Does the positioning_hook now surface the distinguishing element?
   - Do whats_special titles carry the insight standalone?
   - Do risk_rubric ratings commit (not all Medium)?
   - Is Constructive critical enough to be useful without violating respect?
   - Is Package Angles specific to the script?
4. Iterate prompt wording. Only proceed to UI once outputs consistently land.

---

## Rollout

- **Types first** (`src/types/index.ts`) — add nullable `risk_rubric` on `ProductionReality`, new `PackageAngles` interface + field on `GEMEvaluation`.
- **Prompt second** (`src/lib/evaluation-prompt-v5.ts` as a new file; API route switches import).
- **Test flow** — above.
- **UI third** (`src/components/report/details-view.tsx`, `src/app/report/[id]/page.tsx`, public report components):
  - Add risk strip on Production Planning
  - Add Package Angles block
  - Rename Considerations section → "Where to Push"
  - Rename What Makes Special → "What's Working" (or keep current label)
  - Remove Narrative Analysis Details (dimension reasoning) rendering
- **Backfill decision** — old reports render blanks on new fields (null-safe). Discover top N: re-evaluate on-demand or leave forward-only. TBD after first batch of v5 outputs reviewed.

---

## Open questions

1. Section labels: "What's Working / Where to Push" vs "Hype / Constructive" vs "Strengths / Areas to Strengthen"? (Warmth vs producer-crispness.)
2. Is `risk_rubric` shown on public report (producers), writer Details tab only, or both?
3. On Constructive: how far can the voice push? Proposal above allows *"Tighten the midpoint escalation"* but forbids *"The midpoint is weak."* Right line?
4. Do we keep `lead_characters[].why_actor_wants_this` rendering as-is and let Package Angles live beneath it, or merge into a single "Attachment Angles" section with three sub-blocks (actor / director / buyer)?
