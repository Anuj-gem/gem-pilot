// Display-layer overrides for tier labels and descriptions.
// The underlying `Tier` union keys in @/types stay the same so DB records,
// LLM outputs, and pattern-matching code keep working — only the user-facing
// label and description strings are renamed here.

import type { Tier } from '@/types'

const TIER_LABEL_OVERRIDES: Record<Tier, string> = {
  'Greenlight Material': 'Greenlight Material',
  'Optionable': 'Option Ready',
  'Needs Development': 'Shows Promise',
}

const TIER_DESCRIPTION_OVERRIDES: Record<Tier, string> = {
  'Greenlight Material':
    'This script reads like top-tier produced material — distinctive voice, strong commercial instincts, and production-ready craft.',
  'Optionable':
    'This script may be special — with careful development you may have a hit.',
  'Needs Development':
    'This script has promise, but a future version may be an easier sell.',
}

export function tierLabel(tier: Tier): string {
  return TIER_LABEL_OVERRIDES[tier] ?? tier
}

export function tierDescription(tier: Tier): string {
  return TIER_DESCRIPTION_OVERRIDES[tier] ?? ''
}
