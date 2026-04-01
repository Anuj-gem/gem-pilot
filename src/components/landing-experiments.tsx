'use client'

import { useEffect } from 'react'
import { posthog } from '@/lib/posthog'

/**
 * Reads PostHog feature flags and applies text experiments to the landing page.
 *
 * How it works:
 * 1. PostHog loads and evaluates feature flags for this visitor.
 * 2. Elements with `data-experiment="<flag-name>"` are found.
 * 3. If the flag returns a string payload, that string replaces the element's text.
 * 4. If the flag is off or returns `true` (boolean), the default text stays.
 *
 * To create a new experiment:
 * 1. In PostHog → Experiments, create a new experiment.
 * 2. Set the feature flag name (e.g., "hero-headline").
 * 3. Add variants with string payloads (the replacement text).
 * 4. Set the goal metric to a PostHog event (e.g., "cta_clicked" or "signup_completed").
 * 5. Add `data-experiment="hero-headline"` to the element you want to vary.
 *
 * No deploys needed to test new copy. Just configure in PostHog.
 */
export function LandingExperiments() {
  useEffect(() => {
    // Wait for PostHog to load feature flags
    if (!posthog?.onFeatureFlags) return

    posthog.onFeatureFlags(() => {
      // Find all elements with data-experiment attribute
      const experiments = document.querySelectorAll<HTMLElement>('[data-experiment]')

      experiments.forEach(el => {
        const flagName = el.getAttribute('data-experiment')
        if (!flagName) return

        const payload = posthog.getFeatureFlagPayload(flagName)

        // Only replace if payload is a non-empty string (variant text)
        if (typeof payload === 'string' && payload.length > 0) {
          el.textContent = payload
        }
      })
    })
  }, [])

  return null
}
