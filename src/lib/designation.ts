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

// Encouragement copy per designation. Every tier nudges toward BOTH publishing
// on Discover AND sharpening the next draft — the two actions that turn a
// score into momentum for the writer. Shared between the big Commercial Score
// card on the Details tab and the mini-score card at the top of the report.
export interface DesignationCopy {
  headline: string
  body: string
  privacyNote?: string
}

export const DESIGNATION_COPY: Record<Designation, DesignationCopy> = {
  'gem-select': {
    headline: 'This one is ready to be seen.',
    body:
      'It lands in the top GEM Select band — the scripts we surface on Discover for producers and reps to find. Publish it now, and use the Development Priorities below to sharpen any beat that might still be costing you a yes.',
  },
  'very-promising': {
    headline: "It's close. Really close.",
    body:
      "Very Promising sits just under GEM Select — a sharp next draft can push it over the line. Publish it on Discover if you want reads now, and lean into the Development Priorities below to reposition the beats that are leaving points on the table.",
    privacyNote: 'This designation is private to you.',
  },
  'shows-potential': {
    headline: "There's a real spark here.",
    body:
      'Shows Potential means the bones of something commercial are on the page — the next pass is about tightening the hook and repositioning what the script is selling. Publish it when you feel ready, and use the Development Priorities below as your shortlist for the rewrite.',
    privacyNote: 'This designation is private to you.',
  },
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
