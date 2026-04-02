/**
 * Google Ads (gtag.js) integration for GEM.
 *
 * Fires conversion events alongside PostHog so Performance Max can optimize
 * toward real funnel actions (eval started, signup, subscription) instead of
 * just page views.
 *
 * Setup:
 *   1. Set NEXT_PUBLIC_GOOGLE_ADS_ID in .env (e.g. AW-XXXXXXXXXX)
 *   2. Create conversion actions in Google Ads and set their IDs below
 *   3. The gtag base snippet is loaded in <GoogleAdsScript /> (layout.tsx)
 */

export const GA_ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID || 'AW-18057411275'

// ─── Conversion Action Labels ───────────────────────────────────────
// After creating conversion actions in Google Ads, paste the labels here.
// You get these from Google Ads → Goals → Conversions → "Use Google Tag"
// Each looks like: 'AW-XXXXXXXXXX/XXXXXXXXXXXXXXXXXXXX'
//
// For now we fire custom events that gtag records. Once you have real
// conversion labels, uncomment and replace the values below.

export const CONVERSIONS = {
  EVAL_STARTED: '', // no separate conversion action yet — fires as custom event
  SIGNUP_COMPLETED: 'AW-18057411275/N-SNCNSsmJQcEMv1uKJD',
  SUBSCRIBE_CLICKED: '', // fires as custom event (subscribe_clicked)
  SUBSCRIBE_COMPLETED: 'AW-18057411275/PeevCNy1g5QcEMv1uKJD',
} as const

// ─── Helpers ────────────────────────────────────────────────────────

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void
    dataLayer?: unknown[]
  }
}

function gtag(...args: unknown[]) {
  if (typeof window === 'undefined' || !window.gtag) return
  window.gtag(...args)
}

/** Fire a Google Ads conversion event */
function sendConversion(label: string, value?: number) {
  if (!label || !GA_ADS_ID) return
  gtag('event', 'conversion', {
    send_to: label,
    ...(value != null ? { value, currency: 'USD' } : {}),
  })
}

// ─── Named Conversion Events (mirror PostHog events) ────────────────

/** User starts an evaluation — key top-of-funnel signal for PMax */
export function gtagEvalStarted() {
  // Fire as custom event so it shows in Google Ads even without a label
  gtag('event', 'eval_started', { event_category: 'conversion' })
  if (CONVERSIONS.EVAL_STARTED) sendConversion(CONVERSIONS.EVAL_STARTED)
}

/** User completes signup */
export function gtagSignupCompleted() {
  gtag('event', 'signup_completed', { event_category: 'conversion' })
  if (CONVERSIONS.SIGNUP_COMPLETED) sendConversion(CONVERSIONS.SIGNUP_COMPLETED)
}

/** User clicks subscribe — highest-intent signal */
export function gtagSubscribeClicked(value = 20) {
  gtag('event', 'subscribe_clicked', { event_category: 'conversion', value, currency: 'USD' })
  if (CONVERSIONS.SUBSCRIBE_CLICKED) sendConversion(CONVERSIONS.SUBSCRIBE_CLICKED, value)
}

/** Subscription confirmed — fires on redirect back from Stripe checkout */
export function gtagSubscribeCompleted(value = 20) {
  gtag('event', 'purchase', {
    event_category: 'conversion',
    value,
    currency: 'USD',
    transaction_id: Date.now().toString()
  })
  if (CONVERSIONS.SUBSCRIBE_COMPLETED) sendConversion(CONVERSIONS.SUBSCRIBE_COMPLETED, value)
}

/** Generic page view (for enhanced conversions) */
export function gtagPageView(url: string) {
  if (!GA_ADS_ID) return
  gtag('config', GA_ADS_ID, { page_path: url })
}
