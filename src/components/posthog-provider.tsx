'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import { initPostHog, trackPageView, identifyUser, posthog } from '@/lib/posthog'
import { gtagPageView } from '@/lib/gtag'
import { createClient } from '@/lib/supabase-browser'

const UTM_PARAMS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content'] as const

/**
 * Initializes PostHog and tracks page views on SPA navigation.
 * Also captures UTM parameters and fires Google Ads page views.
 * Listens for Supabase auth state changes to identify users in PostHog.
 * Drop this into the root layout inside a <Suspense> boundary.
 */
export function PostHogProvider() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const utmCaptured = useRef(false)

  useEffect(() => {
    initPostHog()
  }, [])

  // Identify user in PostHog on every auth state change (login, signup, OAuth, session restore)
  useEffect(() => {
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        const u = session.user
        identifyUser(u.id, {
          email: u.email,
          full_name: u.user_metadata?.full_name,
          auth_provider: u.app_metadata?.provider ?? 'email',
        })
      }
    })
    // Also check if there's already a session (page refresh / returning user)
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const u = session.user
        identifyUser(u.id, {
          email: u.email,
          full_name: u.user_metadata?.full_name,
          auth_provider: u.app_metadata?.provider ?? 'email',
        })
      }
    })
    return () => { subscription.unsubscribe() }
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
