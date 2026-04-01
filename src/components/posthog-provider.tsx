'use client'

import { useEffect } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, trackPageView } from '@/lib/posthog'

/**
 * Initializes PostHog and tracks page views on SPA navigation.
 * Drop this into the root layout inside a <Suspense> boundary.
 */
export function PostHogProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    initPostHog()
  }, [])

  useEffect(() => {
    if (pathname) {
      const url = searchParams.toString()
        ? `${pathname}?${searchParams.toString()}`
        : pathname
      trackPageView(url)
    }
  }, [pathname, searchParams])

  return null
}
