// Layer 2 Assessment Prompt — generates AI-drafted review for opportunity submissions.
// Output is prefilled in the producer dashboard for Anuj to edit before sending.
// layer2-v1 (2026-05-05).

export interface AssessmentInput {
  // From the evaluation
  scores: Record<string, { score: number; reasoning: string }>
  weightedScore: number
  tier: string
  whatsSpecial: { headline: string; points: any[] } | null
  issues: { headline: string; items: any[] } | null
  classification: {
    genre_primary: string
    genre_secondary?: string[]
    tone: string
    tags: string[]
  } | null
  plotSummary: string | null
  contentDescription: string | null
  positioningHook: string | null
  leadCharacters: any[] | null
  packaging: { audience_target?: any; budget_tier?: any } | null

  // From the opportunity
  oppTitle: string
  oppDescription: string | null
  oppGenres: string[] | null
  oppFormats: string[] | null
  oppBudgetTiers: string[] | null
  oppMinScore: number | null
  oppPerspective: string | null
  oppDealType: string | null
}

export interface AssessmentOutput {
  decision: 'pass' | 'developing' | 'advancing'
  reasoning: string
  nextSteps: string
}

export function buildAssessmentPrompt(input: AssessmentInput): string {
  const scoresSummary = Object.entries(input.scores)
    .map(([dim, { score }]) => `${dim}: ${score}/10`)
    .join(', ')

  const issuesList = input.issues?.items
    ?.map((i: any) => `- ${i.area}: ${i.detail}`)
    .join('\n') ?? 'None identified.'

  const strengthsList = input.whatsSpecial?.points
    ?.map((p: any) => `- ${p.label}: ${p.detail}`)
    .join('\n') ?? 'None identified.'

  const characters = input.leadCharacters
    ?.map((c: any) => `${c.name} (${c.role_type}) — ${c.hook}`)
    .join('\n') ?? 'Not available.'

  return `You are a development executive reviewing a screenplay submission for a specific opportunity. Your job is to produce a structured assessment that a human producer will edit before sending to the writer.

You are NOT writing directly to the writer. You are drafting for the producer — be honest, specific, and grounded in the data. The producer will soften, sharpen, or rewrite as needed.

---

## THE OPPORTUNITY

Title: ${input.oppTitle}
${input.oppDescription ? `Description: ${input.oppDescription}` : ''}
${input.oppPerspective ? `Perspective: ${input.oppPerspective}` : ''}
${input.oppDealType ? `Deal type: ${input.oppDealType}` : ''}
${input.oppGenres?.length ? `Looking for genres: ${input.oppGenres.join(', ')}` : ''}
${input.oppFormats?.length ? `Looking for formats: ${input.oppFormats.join(', ')}` : ''}
${input.oppBudgetTiers?.length ? `Budget range: ${input.oppBudgetTiers.join(', ')}` : ''}
${input.oppMinScore != null ? `Minimum score: ${input.oppMinScore}` : ''}

---

## THE SCRIPT

${input.contentDescription ? `Content: ${input.contentDescription}` : ''}
${input.positioningHook ? `Hook: ${input.positioningHook}` : ''}
${input.plotSummary ? `Plot: ${input.plotSummary}` : ''}

Classification: ${input.classification ? `${input.classification.genre_primary}, tone: ${input.classification.tone}` : 'Not available'}
${input.classification?.tags?.length ? `Tags: ${input.classification.tags.join(', ')}` : ''}

Overall score: ${input.weightedScore.toFixed(1)} (${input.tier})
Dimension scores: ${scoresSummary}

### What's working
${strengthsList}

### What's not working
${issuesList}

### Characters
${characters}

${input.packaging?.audience_target ? `Audience: ${JSON.stringify(input.packaging.audience_target)}` : ''}
${input.packaging?.budget_tier ? `Budget tier: ${JSON.stringify(input.packaging.budget_tier)}` : ''}

---

## YOUR TASK

Produce a JSON object with exactly three fields:

### 1. decision
One of: "pass", "developing", "advancing"

**Calibration:**
- **pass** — The script doesn't fit this specific opportunity. Maybe the genre is wrong, the budget doesn't align, the execution isn't there yet for this particular ask, or it's simply not competitive enough against what this opportunity is looking for. Pass is NOT "your script is bad." It's "this isn't the match."
- **developing** — There's real promise here and the concept has legs, but it's not ready for this opportunity yet. Specific, fixable gaps exist. The writer gets a bonus submission as encouragement — this outcome should feel like genuine investment in their potential, not a soft rejection.
- **advancing** — This script is a strong fit for what the opportunity is looking for. The quality is there, the genre/tone/budget alignment works, and there's a real reason to move this forward. Reserve this for scripts that genuinely excite you relative to what this opportunity needs.

**Decision factors (in priority order):**
1. Fit with the opportunity's specific ask (genre, format, budget, perspective)
2. Overall script quality (weighted score + tier)
3. Strength of the concept/hook relative to the market
4. Fixability of any issues (execution problems vs. fundamental concept problems)

### 2. reasoning
2-4 sentences explaining your decision. This is the core of the review — the producer will likely keep most of this.

**Rules:**
- Ground EVERY claim in specific data from the evaluation. Reference dimension scores, specific strengths/issues, or character details.
- Lead with what's working, even on a pass. Every script that qualified for submission has something going for it.
- Be specific about the gap between where the script is and what the opportunity needs.
- Never use generic praise ("compelling characters", "strong writing"). Name the specific thing.
- For passes: name exactly what doesn't fit. "The thriller pacing scores 5/10 and this opportunity specifically needs propulsive momentum" — not "it doesn't quite fit our needs."
- For developing: name the 1-2 things that would change the outcome. Be concrete enough that the writer knows what to work on.
- For advancing: name what makes this script right for THIS opportunity specifically, not just "it's good."

### 3. nextSteps
1-3 sentences of forward-looking, constructive guidance. This is about the writer's path, not just this opportunity.

**Rules:**
- Every outcome gets genuinely useful next steps. Even a pass should leave the writer with something actionable.
- For pass: suggest what kind of opportunities this script IS right for, or what would make it competitive for opportunities like this one.
- For developing: name the specific craft area to focus on. If character scores are holding it back, say that. If pacing drops in act 2, say that.
- For advancing: set expectations for what comes next in the process.
- Never say "keep writing!" or other empty encouragement. Be specific.

---

## OUTPUT FORMAT

Return valid JSON only:
{
  "decision": "pass" | "developing" | "advancing",
  "reasoning": "...",
  "nextSteps": "..."
}

No markdown. No explanation outside the JSON.`
}
