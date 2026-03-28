# GEM — Greenlight Evaluation Model

## Product Context

GEM is a writer-facing script submission and feedback platform, powered by AI. Writers submit their TV pilot scripts and receive detailed, constructive feedback across 10 dimensions — the same framework used by top development teams. The service is **completely free** for all writers.

GEM is positioning as a **production company** that uses AI to discover undiscovered writing talent at scale. The best scripts that come through the pipeline get flagged for human review by the development team, with the goal of finding projects to develop and produce.

**Primary job the product does:** Give every writer honest, detailed, constructive feedback on their pilot script — and surface the best undiscovered material for development.

**Key user behaviors to design for:**
- Submitting a script and receiving feedback within minutes
- Understanding what's working and what needs development
- Resubmitting improved drafts over time
- (Top tier) Being contacted by GEM's development team

**Writer-facing verdict tiers:**
- **GEM Select** — Script stands out. Development team notified.
- **On Our Radar** — Real strengths. With development, could break through.
- **Development Notes** — Promising elements alongside clear gaps.
- **Keep Writing** — Not there yet, but here's the roadmap forward.

**Tone principles for feedback:**
- Always lead with what's working
- Frame gaps as distance from the bar, not failures
- Be constructive and specific, never dismissive
- "Not a fit for what we're looking for right now" rather than "this is bad"
- Writers should leave feeling they got something valuable, regardless of score

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

**Internal verdict tiers (from engine):** STRONG SIGNAL → WORTH THE READ → MIXED → PASS
**Writer-facing labels:** GEM Select → On Our Radar → Development Notes → Keep Writing

## Tech Stack

- **Frontend:** Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend:** FastAPI (Python), runs on port 8000
- **Fonts:** Playfair Display (display/headings), Inter (body), JetBrains Mono (data/scores)
- **Design tokens:** `gem-` prefix (gem-gold, gem-surface, gem-surface-raised, gem-border, gem-text-primary/secondary/muted, gem-danger)
- **Storage:** JSON files on disk (no database in local mode); Supabase schema exists for production
- **Billing:** Stripe integration exists but is currently disabled — all evaluations are free

## Active Development Notes

- The `autoresearch/` folder is being optimized in a parallel track — do not modify it unless asked
- The web app (`gem-app/`) has been pivoted from producer-facing SaaS to writer-facing submission platform
- Paywall/billing has been removed — all evaluations are free
- The app is currently tested locally; no production deployment in progress
- Next phase: developing production partner relationships to route top-scoring scripts
