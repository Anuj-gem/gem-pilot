# PRD: Draft Comparison

**Status:** Draft v1 — proposed by council review, 2026-04-05
**Owner:** Anuj
**Timeline:** V1 ships within the week; V2/V3 gated on V1 metrics
**Related:** `EXPERIMENTS.md`, `src/app/submit/page.tsx`, `src/app/report/[id]/page.tsx`, `src/lib/evaluation-prompt.ts`

---

## Origin — why this PRD exists

GEM's first paying customer converted on April 6, 2026 via an unmistakable pattern. He uploaded "The Last Call — Marc Lamparello" on April 3 (free eval), received a score of 67.30 / Optionable, hit the blurred paywall, and left without paying. Three days later, the Day-3 re-engagement email fired. He returned at 02:43 UTC, waited 80 minutes, re-uploaded a **revised version** of the same script (172KB → 185KB, a meaningful rewrite), received a new score of **69.70 / Optionable (+2.40 vs his first draft)**, viewed the blurred report for **11 seconds**, clicked Subscribe, and completed Stripe checkout in 17 seconds. He did not read the feedback text before paying. The score moving upward as a direct consequence of his own creative work was the entire conversion event.

The raw insight: writers do not want a grade. They want a practice partner that tells them they're getting better. The score-delta is the aha moment. The report is the instrument. **The comparison is the product.**

---

## The hypothesis

*When a writer sees a score delta against their own previous draft, two things happen:*

1. **Paywall conversion goes up.** The curiosity gap closes from "should I pay for AI notes?" (commodity) to "I already improved my score — what else can I unlock?" (self-investment).
2. **Retention goes up.** The product becomes a weekly ritual tied to the rhythm of the writer's actual work, not a one-shot judgment event.

V1 is designed to test this hypothesis cheaply before investing in a full rebuild.

---

## Scope — V1 / V2 / V3

### V1 — "Does the delta convert?" (ships this week)

**What ships:**
1. Schema: add `parent_submission_id uuid` nullable column to `script_submissions`, with an FK back to the same table. No new tables, no migration of existing rows.
2. Submit page: before eval runs, if the user has ≥1 previous completed submission, show a dropdown "Is this a revision of a previous script? [None] [list of the user's previous titles, most recent first]". Pre-populate to the closest previous submission if the filename has a Levenshtein distance ≤ 0.3 normalized; otherwise default to [None]. User can always override.
3. Report page: if `parent_submission_id` is set, compute the weighted-score delta on the server at render time. Display a single pill above the score:
   - **Positive delta ≥ threshold:** "▲ +2.4 vs your previous draft — see what changed" (green)
   - **Negative delta ≤ -threshold:** "Tough draft. See what held you back." (neutral, not red — frame as learning, not failure)
   - **Within threshold:** "Your score held steady — see what shifted" (gray)
   - The threshold is set based on the variance test (see Gating Tests below)
4. Paywall copy update: the existing blurred-report subscribe CTA changes from "Read Your Full Report" to **"Unlock what to change — track every draft of your script."** Applies to all users, not just those with a prior draft.
5. Landing page headline A/B (PostHog feature flag, 50/50 split, copy-only, no structural changes):
   - Control: current headline
   - Variant: **"See your score go up, draft over draft."** with subhead *"GEM is the feedback loop that gets your script optioned."*
6. Feature flag: `draft_comparison_v1` gates the dropdown, the pill, and the paywall copy (not the landing A/B, which is its own flag).
7. Kill switch: a single flag toggle rolls back all V1 UI changes without a deploy.

**What V1 does NOT touch:** dashboard layout, leaderboard semantics, a `projects` table, trajectory charts, improvement emails, the 5-dimension breakdown UI, the report page structure below the pill.

**V1 engineering estimate:** 1–2 days of work after the gating tests pass.

### V2 — "Make the delta richer" (ships if V1 metrics hit)

- Per-dimension delta breakdown on the report page. Subscribers see which dimension improved most and by how much. Non-subscribers see a teaser.
- Post-eval "your score went up" Postmark email for subscribers who improved, fired from a new PostHog CDP function. Copy leans into the specific dimension that moved most.
- A "compare drafts" button on the report page that opens a side-by-side view of the current draft's dimension scores vs the parent draft's.
- Still no dashboard rebuild. Still no projects table.

**V2 engineering estimate:** 3–5 days.

### V3 — "Projects and trajectory" (ships only if V2 retention metrics confirm the ritual)

- New `projects` table. `script_submissions.project_id` foreign key. Backfill is *lazy* — existing submissions stay unlinked unless the user manually groups them.
- Dashboard becomes project-centric: projects at the top, each project expands to a draft history with a sparkline of score progression across all drafts.
- Trajectory chart on project pages: overall score and per-dimension lines over time.
- Landing page structural rebuild: hero becomes a "your writing, on the way up" trajectory animation.
- Leaderboard semantics clarify: each leaderboard entry is tied to the latest draft of a project, with a badge showing "+X points over Y drafts."
- Shareable "revision story" cards for social: screenshot-friendly trajectory cards that TikTok/X surfaces cleanly.

**V3 engineering estimate:** 2–3 weeks. **Do not start V3 until V2 is live and retention metrics are positive for at least 14 days.**

---

## Gating tests (must pass before V1 engineering begins)

### 1. Evaluator variance test (blocking, ~1 hour)

Upload the same PDF to `/api/evaluate` ten times. Compute standard deviation of `weighted_score` and of each per-dimension score.

- **σ < 1.0:** Ship V1 as designed. Delta display threshold = 1.0.
- **σ 1.0–2.0:** Ship V1 with delta threshold raised to 3.0. Label smaller changes "held steady."
- **σ > 2.0:** **Do not ship.** Fix evaluator determinism first (temperature=0, or multi-sample with averaging at ~3x cost — still cheap at Mini prices). Re-test and re-decide.

This test is non-negotiable. Shipping a "+2.4 improvement" claim when the evaluator's own noise floor is ±2 would be misleading users at scale.

### 2. Dropdown-engagement sanity check (can run concurrently with V1)

After V1 ships to 50%, monitor for 48 hours: what percentage of users with ≥1 previous submission interact with the "is this a revision?" dropdown? If < 15%, the UX is the bottleneck, not the hypothesis. Iterate on the prompt, the placement, the copy — do NOT conclude the hypothesis failed.

---

## Success metrics (V1)

**Primary:**
- **Paywall conversion lift**: % of non-subscribers who click Subscribe within 5 minutes of viewing a report where `parent_submission_id` is set, compared to the same metric on control (flag off). Target: +5pp lift at p<0.05. Baseline needs to be re-measured after the Report Ready email fix lands.
- **7-day re-upload rate**: % of users who upload a second script within 7 days of their first. Baseline is currently ~5% (rough estimate from PostHog). Target: +10pp lift (to ~15%) during the V1 flag window.

**Secondary:**
- Dropdown interaction rate (tagged vs skipped)
- Time-to-pill-click after report page load
- Self-reported delta polarity (positive / negative / steady) distribution
- Landing page headline A/B: CTR on hero upload + signup_completed rate per variant

**Non-goals for V1:** leaderboard engagement, discover page views, email click-through. These all matter but should not be judged on one week's flag data.

---

## Risks and mitigations

**Risk: The evaluator is noisier than the feature requires.**
Mitigation: Gating Test #1. If σ > 2, fix the evaluator first. Delta threshold adapts to σ.

**Risk: The "I got worse" experience churns users.**
Mitigation: Negative deltas never use red or a sad frame. Copy is "Tough draft — see what held you back." V1 suppresses the pill entirely if the delta is within noise threshold. V2 will add explicit recovery copy ("most writers take 2–3 drafts to recover momentum at your level") once we have enough data to calibrate.

**Risk: Users don't tag revisions, so the feature never fires.**
Mitigation: Character-edit-distance filename pre-population of the dropdown. User still confirms, but the default is the right answer most of the time. Telemetry tracks tag rate as a separate metric.

**Risk: Gaming the rubric.**
Mitigation: V1 is too small to meaningfully incentivize gaming. Revisit at V3 scale. When it matters, consider rubric hashing, prompt-injection filters in PDF parsing, and rotating evaluator seeds.

**Risk: N=1 pivot.**
Mitigation: V1 is not a pivot. V1 is a test. The data model change is a single nullable column. If the hypothesis fails, rollback is trivial and the column can stay for future experiments.

**Risk: Opportunity cost vs marketing work (Apollo, ads).**
Mitigation: V1 is scoped to 1–2 days of engineering. Anything larger is explicitly deferred. Marketing work is not paused during V1 development.

**Risk: Landing page repositioning confuses first-time visitors with no prior draft.**
Mitigation: The V1 landing copy variant is phrased as a promise about the future ("See your score go up, draft over draft"), not a claim about the current session. First-time visitors experience it as an aspirational pitch, not a feature they're missing.

**Risk: Leaderboard semantics break if/when V3 introduces projects.**
Mitigation: V1 and V2 do not touch the leaderboard. V3 will include an explicit leaderboard migration plan.

---

## Open questions for Anuj

1. **Variance test logistics.** Should we run the ten-shot variance test against the production `/api/evaluate` endpoint (spending ~$0.30 of API cost) or against a local script? Production is more realistic — the evaluator may have model-version drift or runtime differences.
2. **Which sample PDF for the variance test?** Ideally one that scores in the middle of the range (60–75), so we can measure noise where deltas matter most. Adam's submission is a candidate but it's a real customer's work.
3. **Should the variance test run as a scheduled task** (nightly, 1 PDF) to monitor evaluator drift over time? Easy to set up with the scheduled-tasks MCP.
4. **V1 landing page variant exposure.** 50/50 A/B or 10/90 control-heavy while we gather data? 50/50 maximizes statistical power but 10/90 limits risk if the variant is worse.
5. **Do we want the dropdown on the hero upload flow or only the /submit page?** Hero upload currently pre-dates auth in some paths. Scoping to /submit is simpler; hero is more surface area.

---

## Council seat notes (preserved for future reference)

The PRD above reflects the council's synthesized recommendation after one round of independent takes and one round of cross-debate. Key points of friction that shaped the final scope:

- **Gary (Critic)** surfaced the evaluator-variance concern, which became the hard gating test. His fuzzy-match objection dissolved once the plan moved to user-confirmed dropdown tagging. His N=1 warning shaped V1's reversibility (flag-gated, one-column schema, trivial rollback).
- **Celeste (Visionary)** argued the full longitudinal/Strava vision and conceded on sequencing once she saw V1 as the gating test for her thesis. Her one non-negotiable was the landing page copy A/B, which made it into V1 because it's free.
- **Dave (Pragmatist)** produced the V1 scope that made all three seats align: smallest possible schema change, user-in-the-loop confirmation, report-level pill, paywall copy update, PostHog flag rollout, clear success metrics. He insisted the variance test be step 0, not a nice-to-have.

**Final kill conditions:**
- σ > 2 on the variance test → do not ship V1 until evaluator is fixed.
- < 15% dropdown engagement after 48h → iterate on UX before judging hypothesis.
- Flat or negative paywall conversion lift at 7 days → kill the flag, return to marketing work.
- Positive conversion lift but flat re-upload rate → V2 ships but V3 is downgraded — the delta is a conversion tactic, not a retention engine.

---

## Immediate next action

Run the variance test. It takes an hour. Everything else is downstream of the answer. I can write the test script for you on request — it's a ten-line loop that hits `/api/evaluate` with the same PDF and logs the scores.
