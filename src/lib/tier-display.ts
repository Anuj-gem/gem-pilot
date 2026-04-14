// Display-layer overrides for tier labels and descriptions.
// The underlying `Tier` union keys in @/types stay the same so DB records,
// LLM outputs, and pattern-matching code keep working — only the user-facing
// label and description strings are renamed here.

import type { Tier } from '@/types'

const TIER_LABEL_OVERRIDES: Record<Tier, string> = {
  'Greenlight Material': 'Greenlight Material',
  'Optionable': 'Option Ready',
  'Needs Development': 'Not Ready for Circulation',
}

const TIER_DESCRIPTION_OVERRIDES: Record<Tier, string> = {
  'Greenlight Material':
    'This is the top tier — the scripts we actively push to producers and managers in our network. Distinctive voice, strong commercial instincts, production-ready craft.',
  'Optionable':
    'Strong enough to circulate with a focused revision. You\'re one pass away from being in front of our industry partners.',
  'Needs Development':
    'We think this is very good, but is not yet a fit for our network. See the review details below for how to raise your score.',
}

// Score cutoffs (inclusive lower bound). Keep in sync with
// weightedScoreToTier() in types/index.ts.
export const TIER_CUTOFFS: Record<Tier, number> = {
  'Greenlight Material': 85,
  'Optionable': 60,
  'Needs Development': 0,
}

// Display order — highest tier first (top of the ladder).
export const TIER_ORDER: Tier[] = ['Greenlight Material', 'Optionable', 'Needs Development']

export function tierLabel(tier: Tier): string {
  return TIER_LABEL_OVERRIDES[tier] ?? tier
}

export function tierDescription(tier: Tier): string {
  return TIER_DESCRIPTION_OVERRIDES[tier] ?? ''
}

export function tierCutoffLabel(tier: Tier): string {
  if (tier === 'Greenlight Material') return '85–100'
  if (tier === 'Optionable') return '60–84'
  return '0–59'
}
