// Commercial-score designations surfaced to writers on private pages
// (dashboard rows, locked-report page, Details tab).
//
// Important boundaries:
//  - GEM Select (>= 75) is the ONLY designation that's ever public (the
//    Discover tab + the public-card affordance in details-view).
//  - Very Promising and Shows Potential are private to the writer; they
//    exist to give every score a clear, encouraging frame and a reason to
//    upgrade.
//
// The /discover public filter also uses GEM_SELECT_MIN — don't let them drift.

export const GEM_SELECT_MIN = 75
export const VERY_PROMISING_MIN = 50
// Below VERY_PROMISING_MIN = Shows Potential.

export type Designation = 'gem-select' | 'very-promising' | 'shows-potential'

export function scoreDesignation(
  score: number | null | undefined
): Designation | null {
  if (score === null || score === undefined || Number.isNaN(score)) return null
  if (score >= GEM_SELECT_MIN) return 'gem-select'
  if (score >= VERY_PROMISING_MIN) return 'very-promising'
  return 'shows-potential'
}

export interface DesignationStyle {
  label: string
  text: string
  bg: string
  border: string
  dot: string
  pillBg: string
  pillBorder: string
}

export const DESIGNATION_STYLE: Record<Designation, DesignationStyle> = {
  'gem-select': {
    label: 'GEM Select',
    text: 'var(--gem-gold)',
    bg: 'linear-gradient(135deg, rgba(200,164,92,0.12), rgba(200,164,92,0.02) 70%)',
    border: 'rgba(200,164,92,0.4)',
    dot: 'var(--gem-gold)',
    pillBg: 'rgba(200,164,92,0.12)',
    pillBorder: 'rgba(200,164,92,0.5)',
  },
  'very-promising': {
    label: 'Very Promising',
    text: '#059669',
    bg: 'linear-gradient(135deg, rgba(5,150,105,0.10), rgba(5,150,105,0.02) 70%)',
    border: 'rgba(5,150,105,0.35)',
    dot: '#059669',
    pillBg: 'rgba(5,150,105,0.12)',
    pillBorder: 'rgba(5,150,105,0.5)',
  },
  'shows-potential': {
    label: 'Shows Potential',
    text: '#d97706',
    bg: 'linear-gradient(135deg, rgba(217,119,6,0.10), rgba(217,119,6,0.02) 70%)',
    border: 'rgba(217,119,6,0.35)',
    dot: '#d97706',
    pillBg: 'rgba(217,119,6,0.12)',
    pillBorder: 'rgba(217,119,6,0.5)',
  },
}
