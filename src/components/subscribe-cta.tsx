'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { trackSubscribeClick } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface SubscribeCTAProps {
  location: string
  label?: string
  className?: string
  style?: React.CSSProperties
  children?: React.ReactNode
}

/**
 * Client-side CTA button that kicks off a Stripe Checkout session for an
 * anonymous visitor. Used on the landing page Pricing section and anywhere
 * else we want "Start with Pro" to go straight to payment.
 *
 * Flow:
 *   1. POST /api/stripe/checkout { anonymous: true }
 *   2. Redirect to Stripe Checkout
 *   3. Stripe success_url returns to /complete-signup?session_id=...
 *      where the user finishes setting up their writer profile
 *   4. After profile creation, user is routed to /submit
 */
export function SubscribeCTA({
  location,
  label = 'Start free trial',
  className = '',
  style,
  children,
}: SubscribeCTAProps) {
  const [loading, setLoading] = useState(false)

  const handleClick = async () => {
    trackSubscribeClick(location)
    gtagSubscribeClicked()
    setLoading(true)

    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ anonymous: true }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        setLoading(false)
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      data-cta-label={label}
      className={className}
      style={style}
    >
      {loading ? 'Redirecting to checkout…' : children ?? label}
      {!loading && <ArrowRight size={14} />}
    </button>
  )
}
