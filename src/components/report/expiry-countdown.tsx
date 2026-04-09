'use client'

import { useState, useEffect } from 'react'
import { Clock, AlertTriangle } from 'lucide-react'

interface ExpiryCountdownProps {
  expiresAt: string
  evaluationId: string
}

export function ExpiryCountdown({ expiresAt }: ExpiryCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<number>(0)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    const target = new Date(expiresAt).getTime()

    function update() {
      const now = Date.now()
      const remaining = Math.max(0, target - now)
      setTimeLeft(remaining)
      if (remaining <= 0) setExpired(true)
    }

    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const minutes = Math.floor(timeLeft / 60000)
  const seconds = Math.floor((timeLeft % 60000) / 1000)
  const urgency = timeLeft < 120000 // under 2 min

  if (expired) {
    return (
      <div className="sticky top-14 sm:top-16 z-40 border-b border-red-500/30 bg-red-950/90 backdrop-blur-sm">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center gap-3">
            <AlertTriangle size={20} className="text-red-400 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-200">This report has expired</p>
              <p className="text-xs text-red-400 mt-0.5">Create an account above to evaluate again and save your reports permanently.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={`sticky top-14 sm:top-16 z-40 border-b backdrop-blur-sm ${
      urgency
        ? 'border-red-500/30 bg-red-950/90'
        : 'border-[var(--gem-accent)]/30 bg-[var(--gem-gray-900)]/95'
    }`}>
      <div className="max-w-3xl mx-auto px-4 py-4 sm:py-5">
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg font-mono text-lg font-bold tabular-nums ${
            urgency ? 'bg-red-900/50 text-red-300' : 'bg-[var(--gem-gray-800)] text-[var(--gem-white)]'
          }`}>
            <Clock size={16} className={urgency ? 'text-red-400' : 'text-[var(--gem-accent)]'} />
            {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
          </div>
          <div>
            <p className="text-sm font-semibold text-[var(--gem-white)]">
              {urgency ? 'Almost gone!' : 'This report expires soon'}
            </p>
            <p className="text-xs text-[var(--gem-gray-400)]">
              Create your account below to save it permanently
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
