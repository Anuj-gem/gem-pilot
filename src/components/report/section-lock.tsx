'use client'

import { useState } from 'react'
import { Lock, ArrowRight } from 'lucide-react'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'

interface SectionLockProps {
  variant: 'signup' | 'pro'
  evaluationId: string
  /** 'center' = overlay centered (best for fully blurred sections).
   *  'bottom' = anchored to bottom of the section (best for selective-blur sections
   *  where some content above should stay visible).
   */
  position?: 'center' | 'bottom'
}

/**
 * Small overlay card placed on top of a blurred report section. Acts as a
 * per-section conversion point:
 *  - variant="signup"  → anonymous viewer. Scrolls to the InlineSignup at the top.
 *  - variant="pro"     → logged-in free viewer. Re-opens the SubscribeGate modal,
 *                        which handles Stripe checkout.
 *
 * The parent section should be `position: relative` so this overlay can be
 * absolutely positioned and centered on top of the blurred content.
 */
export function SectionLock({ variant, evaluationId, position = 'center' }: SectionLockProps) {
  const [loading, setLoading] = useState(false)

  const label =
    variant === 'signup'
      ? 'Sign up free to read the full pitch'
      : 'Unlock the full report'

  const subtext =
    variant === 'pro'
      ? 'Read every writer on the board in full and message them directly.'
      : 'Free account gets you previews. Members read everything.'

  const cta =
    variant === 'signup' ? 'Create free account' : 'Upgrade — $20/mo'

  const handleClick = async () => {
    if (variant === 'signup') {
      // Scroll to (and focus) the existing InlineSignup at the top of the page.
      const el = document.getElementById('inline-signup')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        // Brief highlight flash so the user notices it.
        el.classList.add('ring-2', 'ring-[var(--gem-accent)]', 'ring-offset-2', 'ring-offset-[var(--gem-black)]')
        setTimeout(() => {
          el.classList.remove('ring-2', 'ring-[var(--gem-accent)]', 'ring-offset-2', 'ring-offset-[var(--gem-black)]')
        }, 1800)
        const firstInput = el.querySelector('input') as HTMLInputElement | null
        firstInput?.focus({ preventScroll: true })
      }
      return
    }

    // variant === 'pro' — logged-in free user. Re-open the SubscribeGate modal,
    // which handles Stripe checkout from its own subscribe button.
    trackSubscribeClick('section_lock')
    trackSubscribeFromReport({ evaluationId })
    gtagSubscribeClicked()
    window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
  }

  const positionClasses =
    position === 'bottom'
      ? 'absolute inset-x-0 bottom-3 z-10 flex items-end justify-center pointer-events-none px-3'
      : 'absolute inset-0 z-10 flex items-center justify-center pointer-events-none px-3'

  return (
    <div className={positionClasses}>
      <div className="pointer-events-auto flex flex-col items-center gap-3 px-5 py-4 rounded-xl border border-[var(--gem-gray-600)] bg-[var(--gem-black)]/90 backdrop-blur-sm shadow-xl shadow-black/40 max-w-[18rem] text-center">
        <div className="flex items-center gap-2 text-[var(--gem-gray-200)]">
          <Lock size={14} className="text-[var(--gem-accent)]" />
          <span className="text-xs sm:text-sm font-medium">{label}</span>
        </div>
        {subtext && (
          <p className="text-[11px] sm:text-xs text-[var(--gem-gray-400)] leading-snug -mt-1">
            {subtext}
          </p>
        )}
        <button
          onClick={handleClick}
          disabled={loading}
          className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white text-xs sm:text-sm font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 transition-colors cursor-pointer"
        >
          {loading ? 'Redirecting…' : cta}
          {!loading && <ArrowRight size={13} />}
        </button>
      </div>
    </div>
  )
}
