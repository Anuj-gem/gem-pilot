'use client'

import { useState } from 'react'
import { ArrowRight } from 'lucide-react'
import { trackSubscribeClick } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface Props {
  evaluationId: string
}

export function LockedReportUpgrade({ evaluationId }: Props) {
  const [loading, setLoading] = useState(false)

  const handleUpgrade = async () => {
    trackSubscribeClick('locked_report')
    gtagSubscribeClicked()
    setLoading(true)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_report: evaluationId }),
      })
      const data = await res.json()
      if (data.url) window.location.href = data.url
      else setLoading(false)
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleUpgrade}
      disabled={loading}
      className="inline-flex items-center justify-center gap-2 px-8 py-3.5 rounded-xl text-white text-base font-semibold hover:brightness-110 disabled:opacity-50 transition-all cursor-pointer"
      style={{ background: 'var(--gem-gold)' }}
    >
      {loading ? 'Redirecting to checkout…' : 'Start free trial'}
      {!loading && <ArrowRight size={16} />}
    </button>
  )
}
