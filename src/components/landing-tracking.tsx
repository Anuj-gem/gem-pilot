'use client'

import { useEffect } from 'react'
import { trackLandingView } from '@/lib/posthog'

/** Fires a single landing_page_viewed event on mount. */
export function LandingTracking() {
  useEffect(() => {
    trackLandingView()
  }, [])
  return null
}
