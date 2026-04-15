#!/usr/bin/env bash
# Push writer-refocus changes to main (deploys via Vercel).
#   - Unlimited free evals
#   - Tier + What's Working unblurred; score + critique gated
#   - Industry-network pitch across report, landing, dashboard
#
# Run from gem-app/ root:   ./push-writer-refocus.sh
set -euo pipefail

cd "$(dirname "$0")"

# Unstage anything (we staged files during revert); keep working tree as-is.
git reset -q HEAD -- . || true

# Hop to main. Working tree changes carry over cleanly since main + the revert
# branch share the same pre-change base for these files.
git checkout main

# Ditch the scratch branch if it exists — we don't need it anymore.
git branch -D writer-refocus-apr14 2>/dev/null || true

# Stage only the files we intentionally changed.
git add \
  src/app/page.tsx \
  src/app/report/\[id\]/page.tsx \
  src/app/submit/page.tsx \
  src/app/dashboard/page.tsx \
  src/app/api/evaluate/route.ts \
  src/components/report/subscribe-gate.tsx \
  src/components/report/report-header.tsx \
  src/components/report/inline-signup.tsx \
  src/components/report/whats-holding-it-back.tsx

git status --short

git commit -m "Writer refocus: unlimited free evals, gated reveal, industry-network pitch

- Remove paywall on evaluate route; unlimited free evals for all
- Tier + What's Working unblurred; score, critique, and production gated
- Reframe subscribe-gate + landing hero around 'we use GEM to decide
  which scripts to surface to our industry network'
- Drop 2-free-evals counter from submit + dashboard
- Report/landing files reverted to Shupe-era (4/9) converting shape"

git push origin main

echo
echo "Pushed to main. Vercel should start deploying."
