# GEM Landing Page Experimentation Framework

Inspired by [Karpathy's autoresearch](https://github.com/karpathy/autoresearch). The core loop:
**observe → hypothesize → vary one thing → measure → keep or discard → repeat.**

## Architecture

- **Analytics**: PostHog (events, funnels, session replay, feature flags)
- **A/B testing**: PostHog Experiments with feature flag payloads
- **Instrumentation**: `TrackSection` (section visibility), `TrackedCTA` (click attribution), named funnel events

## Primary Metric

**Signup conversion rate**: `landing_page_viewed` → `signup_completed`

Secondary metrics: `evaluation_completed`, `subscribe_clicked`, `subscription_activated`

## Conversion Funnel (full)

```
landing_page_viewed
  → section_viewed (hero, showcase, leaderboard, how_it_works, pricing, bottom_cta)
  → cta_clicked (with location + label properties)
  → hero_file_uploaded
  → signup_started
  → signup_completed
  → evaluation_started
  → evaluation_completed
  → upgrade_prompt_shown
  → subscribe_clicked
  → subscription_activated
  → script_published
```

## How to Run an Experiment

### 1. Observe
- Check PostHog funnel: where is the biggest drop-off?
- Watch session replays of visitors who bounced
- Check `section_viewed` events: which sections do most visitors actually see?

### 2. Hypothesize
- "Users who see the showcase section convert at 2x the rate of those who don't"
- "The headline doesn't communicate the free eval clearly enough"
- "People scroll past pricing without reading it"

### 3. Vary (in PostHog, no deploy needed)
1. Go to PostHog → Experiments → New Experiment
2. Set a feature flag name matching a `data-experiment` attribute (e.g., `hero-headline`)
3. Add variant payloads (replacement text)
4. Set goal metric (e.g., `signup_completed` or `cta_clicked` with property filter)
5. Set minimum sample size (usually 100–200 visitors per variant)
6. Launch

### 4. Measure
- PostHog calculates statistical significance automatically
- Wait for sufficient sample size — don't peek early
- Check secondary metrics too (did the winning headline increase signups but decrease subscriptions?)

### 5. Keep or Discard
- If the variant wins: update the default text in code, ship it
- If control wins: discard, document what you learned
- Either way: move to the next experiment

## Experiment Queue (prioritized)

### Experiment 1: Hero Headline
**Flag**: `hero-headline`
**Element**: `<h1 data-experiment="hero-headline">`
**Control**: "Get scored like a pro. Get seen by the industry."
**Variants**:
- A: "Your screenplay, scored and ranked in 60 seconds."
- B: "The evaluation your script deserves — for $20 a month."
- C: "Upload your script. Get the report a producer would give you."
**Goal**: `signup_completed`
**Why first**: Headline is the highest-leverage element. Every visitor sees it. Small copy change, large potential impact.

### Experiment 2: Hero Subhead
**Flag**: `hero-subhead`
**Element**: `<p data-experiment="hero-subhead">`
**Test**: Shorter vs. current (long). Does cutting the subhead to 1 sentence improve action rate?
**Goal**: `hero_file_uploaded` or `cta_clicked` (hero location)

### Experiment 3: Showcase Position
**Hypothesis**: Moving the showcase above the fold (before the hero subhead) increases engagement.
**Requires**: Code change (section reorder). Check `section_viewed` data first — if <50% of visitors see the showcase, test moving it up.

### Experiment 4: CTA Copy
**Flag**: various `data-experiment` attributes on CTA buttons
**Test**: "Get Started Free" vs. "Evaluate My Script Free" vs. "Upload & Score — Free"
**Goal**: `cta_clicked` filtered by location

### Experiment 5: Social Proof
**Hypothesis**: Adding a real number ("Join 50+ writers already on the leaderboard") converts better than no social proof.
**Requires**: Dynamic count from Supabase (count of public scripts) or hardcoded milestone.

## What NOT to Vary (the fixed constraints)

- Price ($20/mo) — that's a business decision, not an optimization variable
- The product itself (evaluation + leaderboard) — vary how you describe it, not what it is
- The free eval offer — core to the funnel
- Brand voice (dark, clean, professional) — vary copy within the voice, don't change the voice

## Observability Checklist

Before running experiments, confirm these are working in PostHog:

- [ ] `landing_page_viewed` fires on landing page load
- [ ] `section_viewed` fires for each section as user scrolls (hero, showcase, leaderboard, how_it_works, pricing, bottom_cta)
- [ ] `cta_clicked` fires with `location` and `label` properties for every CTA
- [ ] `hero_file_uploaded` fires when user selects a file and clicks Evaluate
- [ ] `signup_completed` fires after successful account creation
- [ ] `evaluation_completed` fires with score and tier
- [ ] Session replay is capturing landing page visits
- [ ] Funnel visualization: landing_page_viewed → cta_clicked → signup_completed → evaluation_completed
