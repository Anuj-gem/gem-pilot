'use client'

// Shown to a free writer who just finished their 2nd+ eval. Replaces the
// hard redirect to /dashboard with an animated upgrade pitch + a clear way
// back. The score and development notes already exist server-side; Pro
// unlocks viewing them.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight } from 'lucide-react'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

export function LockedAfterEvalScreen({
  evaluationId,
  title,
}: {
  evaluationId: string
  title: string
}) {
  // Tiny entrance animation so the screen feels delivered, not dumped.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 30)
    return () => clearTimeout(t)
  }, [])

  function handleUpgrade() {
    trackSubscribeClick('locked_after_eval')
    trackSubscribeFromReport({ evaluationId })
    gtagSubscribeClicked()
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  return (
    <div
      className="max-w-[520px] mx-auto px-5 py-12 sm:py-20 text-center"
      style={{
        opacity: ready ? 1 : 0,
        transform: ready ? 'translateY(0)' : 'translateY(8px)',
        transition: 'opacity 480ms ease-out, transform 480ms ease-out',
      }}
    >
      <div
        className="w-16 h-16 mx-auto mb-6 rounded-full grid place-items-center"
        style={{
          background: 'rgba(124,58,237,0.10)',
          border: '1px solid rgba(124,58,237,0.30)',
          color: 'var(--gem-accent)',
        }}
      >
        <Sparkles size={26} />
      </div>

      <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-[1.15] text-[var(--gem-gray-50)] m-0 mb-3">
        You&apos;ve used your free read.
      </h1>
      <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-[1.55] m-0 mb-8 max-w-[440px] mx-auto">
        Your score and development notes for{' '}
        <span className="text-[var(--gem-gray-100)] font-semibold">
          &ldquo;{title}&rdquo;
        </span>{' '}
        are ready. Upgrade to GEM Pro to view them and publish to Discover.
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 mb-3">
        <button
          type="button"
          onClick={handleUpgrade}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.30)] transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
          style={{ background: 'var(--gem-accent)' }}
        >
          Upgrade to GEM Pro — $20/mo
          <ArrowRight size={15} />
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center justify-center px-5 py-3 rounded-xl text-[14px] font-medium text-[var(--gem-gray-300)] transition-all duration-150 hover:bg-[var(--gem-gray-900)] hover:text-[var(--gem-gray-50)] active:scale-[0.985]"
          style={{ border: '1px solid var(--gem-gray-700)' }}
        >
          Back to dashboard
        </Link>
      </div>
      <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mt-4">
        Pro: unlimited evals · publish to Discover · producers contact you directly
      </p>
    </div>
  )
}
