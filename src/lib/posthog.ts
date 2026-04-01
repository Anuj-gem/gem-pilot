import posthog from 'posthog-js'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

let initialized = false

export function initPostHog() {
  if (typeof window === 'undefined') return
  if (initialized) return
  if (!POSTHOG_KEY) {
    console.warn('[PostHog] NEXT_PUBLIC_POSTHOG_KEY not set — analytics disabled')
    return
  }

  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    person_profiles: 'identified_only',
    capture_pageview: false, // we handle this manually for SPA navigation
    capture_pageleave: true,
    autocapture: true,
  })

  initialized = true
}

export { posthog }

// ─── Conversion Events ──────────────────────────────────────────────
// These are the core events for the autoresearch optimization loop.
// Each maps to a step in the GEM conversion funnel.

export function trackPageView(url: string) {
  if (!initialized) return
  posthog.capture('$pageview', { $current_url: url })
}

export function trackEvent(event: string, properties?: Record<string, unknown>) {
  if (!initialized) return
  posthog.capture(event, properties)
}

// Identify user after login/signup
export function identifyUser(userId: string, traits?: Record<string, unknown>) {
  if (!initialized) return
  posthog.identify(userId, traits)
}

export function resetUser() {
  if (!initialized) return
  posthog.reset()
}

// ─── Named Conversion Events ────────────────────────────────────────
// These are the specific funnel steps we want to measure and optimize.

/** Visitor lands on landing page */
export const trackLandingView = () =>
  trackEvent('landing_page_viewed')

/** Visitor uploads file on landing page hero */
export const trackHeroUpload = () =>
  trackEvent('hero_file_uploaded')

/** Visitor clicks "Browse the leaderboard" */
export const trackLeaderboardClick = () =>
  trackEvent('leaderboard_cta_clicked')

/** Visitor clicks "Talk to the founder" */
export const trackCalendlyClick = () =>
  trackEvent('calendly_cta_clicked')

/** Visitor clicks the sample report CTA */
export const trackSampleReportClick = () =>
  trackEvent('sample_report_cta_clicked')

/** Visitor navigates to signup page */
export const trackSignupStart = () =>
  trackEvent('signup_started')

/** User completes signup */
export const trackSignupComplete = () =>
  trackEvent('signup_completed')

/** User starts an evaluation */
export const trackEvalStart = (props?: { title?: string; source?: string }) =>
  trackEvent('evaluation_started', props)

/** Evaluation completes */
export const trackEvalComplete = (props?: { score?: number; tier?: string }) =>
  trackEvent('evaluation_completed', props)

/** User sees upgrade prompt */
export const trackUpgradePromptShown = (location: string) =>
  trackEvent('upgrade_prompt_shown', { location })

/** User clicks subscribe */
export const trackSubscribeClick = (location: string) =>
  trackEvent('subscribe_clicked', { location })

/** Subscription confirmed (webhook) */
export const trackSubscriptionActivated = () =>
  trackEvent('subscription_activated')

/** User makes script public */
export const trackScriptPublished = () =>
  trackEvent('script_published')
