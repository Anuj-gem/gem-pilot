'use client'

// Shown to a free writer who just finished their 2nd+ eval. Replaces the
// hard redirect to /dashboard with an upgrade pitch tied to the SCRIPT'S
// QUALIFICATION VERDICT (≥50 commercial potential = qualifies for industry).
//
// Three branches based on commercialScore:
//   - QUALIFIES (≥50)   → green eyebrow, "your script qualifies" framing,
//                          upgrade pitch leans on industry-publishing payoff
//   - DOESN'T QUALIFY   → amber eyebrow, "dev notes ready" framing, upgrade
//                          pitch leans on viewing notes + iterating
//   - UNKNOWN (no score)→ original generic copy
//
// Every branch lands on the same Stripe-backed Upgrade button + Back to
// dashboard escape hatch.
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sparkles, ArrowRight, Check, RefreshCw } from 'lucide-react'
import { trackSubscribeClick, trackSubscribeFromReport } from '@/lib/posthog'
import { gtagSubscribeClicked } from '@/lib/gtag'
import { QUALIFICATION_THRESHOLD } from '@/lib/report-privacy'

export function LockedAfterEvalScreen({
  evaluationId,
  title,
  commercialScore,
}: {
  evaluationId: string
  title: string
  /** Raw commercial score (0-100). Null means we couldn't compute one
   *  (legacy eval) — we fall back to the generic copy. */
  commercialScore: number | null
}) {
  // Tiny entrance animation so the screen feels delivered, not dumped.
  const [ready, setReady] = useState(false)
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 30)
    return () => clearTimeout(t)
  }, [])

  // Call Stripe directly — this screen renders standalone (no rest-of-report
  // wrapper, no SubscribeGate listener), so dispatching gem:open-upgrade-modal
  // would silently no-op. Same pattern as upgrade-card.tsx and the new
  // qualification-banner upgrade nudge.
  const [upgrading, setUpgrading] = useState(false)
  async function handleUpgrade() {
    if (upgrading) return
    setUpgrading(true)
    try {
      trackSubscribeClick('locked_after_eval')
      trackSubscribeFromReport({ evaluationId })
      gtagSubscribeClicked()
    } catch {}
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ redirect_report: evaluationId }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
        return
      }
    } catch {}
    setUpgrading(false)
  }

  // Resolve which verdict variant to render.
  const variant: 'qualifies' | 'not_qualified' | 'unknown' =
    typeof commercialScore !== 'number' || Number.isNaN(commercialScore)
      ? 'unknown'
      : commercialScore >= QUALIFICATION_THRESHOLD
        ? 'qualifies'
        : 'not_qualified'

  // Per-variant content. Icon/eyebrow/headline/subhead change; buttons stay.
  const content =
    variant === 'qualifies'
      ? {
          icon: <Check size={24} strokeWidth={3} />,
          iconBg: 'rgba(5,150,105,0.10)',
          iconBorder: 'rgba(5,150,105,0.35)',
          iconColor: '#059669',
          eyebrow: 'Qualifies for industry matching',
          eyebrowColor: '#047857',
          headline: "You've used your free read.",
          subhead: (
            <>
              Your script for{' '}
              <span className="text-[var(--gem-gray-100)] font-semibold">
                &ldquo;{title}&rdquo;
              </span>{' '}
              qualifies. Upgrade to GEM Pro to view the full report and publish to industry partners.
            </>
          ),
          ctaSubtext:
            'Pro: submit to opportunities · unlimited evals · producers contact you directly',
        }
      : variant === 'not_qualified'
        ? {
            icon: <RefreshCw size={22} />,
            iconBg: 'rgba(217,119,6,0.10)',
            iconBorder: 'rgba(217,119,6,0.35)',
            iconColor: '#d97706',
            eyebrow: 'Development notes ready',
            eyebrowColor: '#92710f',
            headline: "You've used your free read.",
            subhead: (
              <>
                Your dev notes for{' '}
                <span className="text-[var(--gem-gray-100)] font-semibold">
                  &ldquo;{title}&rdquo;
                </span>{' '}
                show exactly what to push on next. Upgrade to view them, then submit a revision when you&apos;re ready.
              </>
            ),
            ctaSubtext:
              'Pro: full development notes · unlimited evals · publish when you qualify',
          }
        : {
            icon: <Sparkles size={26} />,
            iconBg: 'rgba(124,58,237,0.10)',
            iconBorder: 'rgba(124,58,237,0.30)',
            iconColor: 'var(--gem-accent)',
            eyebrow: null,
            eyebrowColor: '',
            headline: "You've used your free read.",
            subhead: (
              <>
                Your score and development notes for{' '}
                <span className="text-[var(--gem-gray-100)] font-semibold">
                  &ldquo;{title}&rdquo;
                </span>{' '}
                are ready. Upgrade to GEM Pro to view them and publish for industry visibility.
              </>
            ),
            ctaSubtext:
              'Pro: unlimited evals · publish to industry · producers contact you directly',
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
        className="w-16 h-16 mx-auto mb-5 rounded-full grid place-items-center"
        style={{
          background: content.iconBg,
          border: `1px solid ${content.iconBorder}`,
          color: content.iconColor,
        }}
      >
        {content.icon}
      </div>

      {content.eyebrow && (
        <p
          className="text-[11px] uppercase tracking-[0.18em] font-bold m-0 mb-3"
          style={{ color: content.eyebrowColor }}
        >
          {content.eyebrow}
        </p>
      )}

      <h1 className="text-[26px] sm:text-[30px] font-bold tracking-tight leading-[1.15] text-[var(--gem-gray-50)] m-0 mb-3">
        {content.headline}
      </h1>
      <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-[1.55] m-0 mb-8 max-w-[440px] mx-auto">
        {content.subhead}
      </p>

      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-2.5 mb-3">
        <button
          type="button"
          onClick={handleUpgrade}
          disabled={upgrading}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[15px] font-semibold text-white shadow-[0_4px_14px_rgba(124,58,237,0.30)] transition-all duration-150 hover:brightness-110 active:scale-[0.985] disabled:opacity-70 disabled:cursor-wait"
          style={{ background: 'var(--gem-accent)' }}
        >
          {upgrading ? 'Redirecting to checkout…' : 'Upgrade to GEM Pro — $20/mo'}
          {!upgrading && <ArrowRight size={15} />}
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
        {content.ctaSubtext}
      </p>
    </div>
  )
}
