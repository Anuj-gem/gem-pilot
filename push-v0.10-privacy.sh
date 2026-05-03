#!/usr/bin/env bash
# v0.10 — per-script privacy simplification + hide-bug fix.
#
# - Hide bug: removing a script also forces is_public=false; every
#   public-script query (discover, dashboard community, writer profile,
#   app-shell rail) now filters hidden_at IS NULL.
# - Per-script privacy: stripped Pro gating, replaced inline status-bar
#   panel with a 2-toggle sheet (Allow reviews / Allow industry access)
#   buried in the report-page triple-dot menu. Mirrors the account-level
#   privacy form.
# - Enforcement: review API rejects when allow_reviews=false; matching
#   engine excludes scripts with allow_industry=false; flipping either
#   off propagates by unmatching open script_matches.
# - New submissions inherit allow_reviews + allow_industry from the
#   writer's account-level privacy_defaults.
#
# DB migration `add_allow_reviews_allow_industry_to_script_submissions`
# was already applied to Supabase prod — no further DB step needed.

set -euo pipefail

cd "$(dirname "$0")"

git add \
  "src/app/(app)/dashboard/page.tsx" \
  "src/app/(app)/discover/page.tsx" \
  "src/app/(app)/layout.tsx" \
  "src/app/(app)/report/[id]/page.tsx" \
  "src/app/(app)/w/[handle]/page.tsx" \
  "src/app/api/score-submission/route.ts" \
  "src/app/api/scripts/[id]/privacy/route.ts" \
  "src/app/api/submissions/[id]/hide/route.ts" \
  "src/app/review/[id]/actions.ts" \
  "src/components/report/owner-actions-menu.tsx" \
  "src/components/report/script-privacy-sheet.tsx" \
  "src/lib/matching.ts"

git status

git commit -m "v0.10: simplify per-script privacy + fix hide-from-community bug

- Per-script privacy: strip Pro gating, replace inline status-bar panel
  with a 2-toggle sheet (Allow reviews / Allow industry access) buried
  in the report-page triple-dot menu. Mirrors the account-level form.
- Hide bug: /api/submissions/[id]/hide now forces is_public=false; all
  public-script queries (discover, dashboard community feed, writer
  profile, app-shell rail) filter hidden_at IS NULL.
- Enforcement: review submissions rejected when allow_reviews=false;
  matching engine excludes scripts with allow_industry=false; flipping
  either off propagates by unmatching open script_matches.
- New submissions inherit allow_reviews + allow_industry from the
  writer's account-level privacy_defaults at score time.

DB: add_allow_reviews_allow_industry_to_script_submissions migration
applied directly to prod Supabase; no app-side migration step needed."

git push origin reviews-v01
