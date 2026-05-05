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

  return `You are a producer evaluating whether a screenplay is a commercial fit for a specific opportunity. You are NOT a script doctor. You are NOT giving story notes. You are answering a business question: does this project have legs for THIS deal?

Think like someone deciding whether to option, package, or pass on a project. Your lens is: can I sell this? Can I attach talent? Does the concept travel? Is the budget realistic for the return? Would a buyer in this lane take this meeting?

You are drafting for a human producer who will edit before sending to the writer.

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

### Commercial strengths
${strengthsList}

### Commercial friction
${issuesList}

### Lead roles (talent attachment potential)
${characters}

${input.packaging?.audience_target ? `Audience: ${JSON.stringify(input.packaging.audience_target)}` : ''}
${input.packaging?.budget_tier ? `Budget tier: ${JSON.stringify(input.packaging.budget_tier)}` : ''}

---

## YOUR TASK

Produce a JSON object with exactly three fields:

### 1. decision
One of: "pass", "developing", "advancing"

**Calibration:**
- **pass** — Not the right fit for this opportunity. The concept, genre, budget lane, or commercial profile doesn't match what this deal needs. Pass is about fit, not quality.
- **developing** — The concept has real commercial potential but isn't packagable yet for this specific deal. There's a clear path to getting there. The writer gets a bonus submission — this should feel like a genuine "we see something here, come back stronger."
- **advancing** — This is a project we'd take a meeting on. The concept is packagable, the talent roles are attachable, and the commercial profile fits what this opportunity is looking for.

**Decision factors (in priority order):**
1. Commercial fit: does the genre, budget, and audience profile match what this opportunity needs?
2. Packagability: can you pitch this in one sentence? Would a buyer take this meeting?
3. Talent attachment: are there roles that actors would fight for?
4. Concept strength: does the hook travel? Is there a clear audience?

### 2. reasoning
2-4 sentences. This is a BUSINESS assessment, not story notes.

**What to talk about:**
- Whether the concept is packagable for this specific deal type and buyer lane
- Whether the lead role(s) could attract name talent
- Whether the budget profile is realistic for the commercial upside
- Whether the hook travels (internationally, cross-platform, etc.)
- Whether the audience is clear and addressable

**What to NEVER talk about:**
- Story structure fixes ("restructure act 2", "move the reveal earlier")
- Character development notes ("deepen this character", "add more interiority")
- Craft prescriptions ("streamline the conspiracy", "clarify the mythology")
- Anything that sounds like a screenwriting professor's feedback

**Voice:** Direct, like a producer talking to another producer. "The hook is pitchable and the lead is castable, but the budget profile is too high for the indie lane this deal sits in." Not: "The script has strong commercial potential but would benefit from streamlining."

### 3. nextSteps
1-2 sentences MAX. Short, forward-looking, commercial.

**What to say:**
- For pass: what kind of deal/buyer IS this script right for? ("This reads more like a premium streamer play than an international co-pro — look for opportunities in that lane.")
- For developing: what would change the commercial equation? ("If the budget can come down to a contained single-location version, this becomes very attractive for indie horror buyers.")
- For advancing: what happens next? ("We'll be reaching out to discuss next steps.")

**What to NEVER say:**
- Craft advice ("work on the pacing", "develop the antagonist")
- Generic encouragement ("keep at it!", "strong foundation")
- Anything a writing teacher would say

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
