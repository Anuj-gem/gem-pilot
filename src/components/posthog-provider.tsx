'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, trackPageView, posthog } from '@/lib/posthog'
import { gtagPageView } from '@/lib/gtag'

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

/**
 * Initializes PostHog and tracks page views on SPA navigation.
 * Also captures UTM parameters and fires Google Ads page views.
 * Drop this into the root layout inside a <Suspense> boundary.
 */
export function PostHogProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const utmCaptured = useRef(false)

  useEffect(() => {
    initPostHog()
  }, [])

  // Capture UTM params on first load (once per session)
  useEffect(() => {
    if (utmCaptured.current || !searchParams) return
    const utms: Record<string, string> = {}
    for (const key of UTM_PARAMS) {
      const val = searchParams.get(key)
      if (val) utms[key] = val
    }
    if (Object.keys(utms).length > 0) {
      utmCaptured.current = true
      // Set as person properties so they persist across the session
      posthog.setPersonPropertiesForFlags(utms)
      posthog.register(utms) // attach to every future event in this session
    }
  }, [searchParams])

  useEffect(() => {
    if (pathname) {
      const url = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname
      trackPageView(url)
      gtagPageView(url)
    }
  }, [pathname, searchParams])

  return null
}
