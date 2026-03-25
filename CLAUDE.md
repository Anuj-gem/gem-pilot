# GEM — Greenlight Evaluation Model

## Product Context

GEM is a script evaluation tool built for **professional TV series producers**. The core user is someone actively managing a reading pipeline — receiving scripts from agents, writers, and reps, and needing to prioritize which ones are worth their time before committing to a full read. They are experienced, time-constrained, and have high standards. The app should feel like a trusted analyst's desk, not a consumer product.

**Primary job the product does:** Give a producer a fast, credible, structured signal on whether a pilot script has breakout potential — before they commit hours to reading it.

**Key user behaviors to design for:**
- Uploading multiple scripts in batches and scanning verdicts quickly
- Returning to compare past reads across a slate
- Sharing or printing a report to discuss with a development team
- Trusting the model's read enough to act on it (prioritize, pass, or flag for closer look)

## Model Architecture

The scoring engine (`autoresearch/`) is a separate concern from the web app (`gem-app/`). Do not modify autoresearch files unless specifically asked.

**How a report is generated (end-to-end):**
1. User uploads a PDF/TXT script via the web app
2. FastAPI server (`gem-app/server/main.py`) receives the file and starts a background job
3. `gem_eval.py` extracts text (with OCR for scanned PDFs) and scores the script across **10 dimensions** using an LLM with the rubric in `config/rubric_prompt.md`
4. `report_generator.py` takes the raw scores and builds the structured `GEMReport` object (verdict, strengths, risks, producer_takeaway, percentile, confidence, read_recommendation, opportunity_type)
5. Report is saved to `autoresearch/data/reports/{show_id}.json` and served via the API

**The 10 scoring dimensions** (defined in `src/types/index.ts`):
- Audience Appeal & Marketability
- Tonal Specificity
- World Density & Texture
- Conceptual Hook & Clarity
- Resonant Originality
- Relationship Density & Ensemble Engine
- Character Appeal & Longevity
- Latent Depth & Slow-Burn Potential
- Creative Originality & Boldness
- Narrative Momentum & Engagement

**Verdict tiers:** STRONG SIGNAL → WORTH THE READ → MIXED → PASS

**Key report fields used in the UI:**
- `verdict.label` — top-level tier
- `verdict.weighted_score` — 0–100 composite
- `verdict.percentile` — corpus ranking
- `verdict.one_line` — GEM's one-sentence read
- `confidence` — HIGH / MEDIUM / LOW
- `read_recommendation` — e.g. "Not a priority read", "Worth your time"
- `opportunity_type` — e.g. "Strong sample, uneven execution"
- `strengths[]` / `risks[]` — top dimensions working / holding it back
- `producer_takeaway` — full analytical paragraph
- `dimensions[]` — all 10 with score, winner_avg, vs_winner_avg, reasoning

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python), runs on port 8000
- **Fonts:** Playfair Display (display/headings), Inter (body), JetBrains Mono (data/scores)
- **Design tokens:** `gem-` prefix (gem-gold, gem-surface, gem-surface-raised, gem-border, gem-text-primary/secondary/muted, gem-danger)
- **Storage:** JSON files on disk (no database in local mode); Supabase schema exists for production

## Active Development Notes

- The `autoresearch/` folder is being optimized in a parallel track — do not modify it unless asked
- The web app (`gem-app/`) is being refined for the producer UX — this is the active workstream
- The app is currently tested locally; no production deployment in progress
