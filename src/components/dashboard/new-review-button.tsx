'use client'

// NewReviewButton — creates a draft consideration and redirects to /review/c/[id].
// Used on the dashboard and anywhere we need a "New portfolio review" CTA.

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export function NewReviewButton({ className, children }: { className?: string; children?: React.ReactNode }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function handleClick() {
    if (loading) return
    setLoading(true)
    try {
      const res = await fetch('/api/consideration/create-draft', { method: 'POST' })
      const data = await res.json()
      if (data.consideration_id) {
        router.push(`/review/c/${data.consideration_id}`)
      } else {
        // Fallback — shouldn't happen but don't leave user stuck
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={loading}
      className={className}
      style={{ background: 'linear-gradient(135deg, #7c3aed 0%, #a855f7 100%)' }}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" opacity="0.25" />
            <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          Creating…
        </span>
      ) : children || (
        <span className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <line x1="8" y1="3" x2="8" y2="13" /><line x1="3" y1="8" x2="13" y2="8" />
          </svg>
          New portfolio review
        </span>
      )}
    </button>
  )
}
