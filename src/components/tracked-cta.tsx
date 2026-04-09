'use client'

import { trackEvent } from '@/lib/posthog'

interface TrackedCTAProps {
  /** Event name sent to PostHog, e.g. "hero_signup_clicked" */
  event: string
  /** Extra properties to attach */
  properties?: Record<string, unknown>
  children: React.ReactNode
  href: string
  className?: string
  target?: string
  rel?: string
}

/**
 * An <a> tag that fires a PostHog event on click before navigating.
 * Use for CTAs where you want to measure click-through by location.
 */
export function TrackedCTA({ event, properties, children, href, className, target, rel }: TrackedCTAProps) {
  return (
    <a
      href={href}
      target={target}
      rel={rel}
      className={className}
      onClick={() => trackEvent(event, properties)}
    >
      {children}
    </a>
  )
}
