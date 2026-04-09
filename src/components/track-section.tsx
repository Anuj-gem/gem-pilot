'use client'

import { useEffect, useRef } from 'react'
import { trackEvent } from '@/lib/posthog'

interface TrackSectionProps {
  /** Unique name for this section — becomes the PostHog event property */
  name: string
  children: React.ReactNode
  className?: string
}

/**
 * Wrapper that fires a `section_viewed` event when the section scrolls
 * into view (50%+ visible for 1 second). Only fires once per page load.
 */
export function TrackSection({ name, children, className }: TrackSectionProps) {
  const ref = useRef<HTMLDivElement>(null)
  const fired = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let timer: ReturnType<typeof setTimeout> | null = null

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !fired.current) {
          // Wait 1 second of visibility before counting it
          timer = setTimeout(() => {
            fired.current = true
            trackEvent('section_viewed', { section: name })
          }, 1000)
        } else if (!entry.isIntersecting && timer) {
          clearTimeout(timer)
          timer = null
        }
      },
      { threshold: 0.5 }
    )

    observer.observe(el)
    return () => {
      observer.disconnect()
      if (timer) clearTimeout(timer)
    }
  }, [name])

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  )
}
