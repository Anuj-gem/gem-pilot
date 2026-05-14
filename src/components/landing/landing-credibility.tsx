// LandingEvaluation — v16.
// "Free script evaluations" — product graphic + detailed explanation.
'use client'

import { trackEvent } from '@/lib/posthog'

export function LandingCredibility() {
  function handleCTA() {
    try {
      trackEvent('cta_clicked', { location: 'free_eval', label: 'Get your free evaluation' })
    } catch {}
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-4xl mx-auto">
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          How it works
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-4"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Free script evaluations.
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-400)] leading-relaxed m-0 mb-10 max-w-[560px]">
          Every writer gets a full evaluation at no cost. Upload your screenplay
          and see exactly how your script compares — no account required, no credit card, no catch.
        </p>

        {/* Two-column: product graphic + feature details */}
        <div className="flex flex-col md:flex-row gap-8 items-start">

          {/* Left: Report preview card */}
          <div
            className="w-full md:w-[380px] shrink-0 rounded-2xl p-5 text-left"
            style={{
              background: 'var(--gem-gray-800)',
              border: '1px solid var(--gem-gray-700)',
            }}
          >
            {/* Title + score row */}
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[var(--gem-gray-500)] m-0 mb-1 uppercase tracking-wider font-semibold">
                  Sample evaluation
                </p>
                <p
                  className="text-[17px] font-bold text-[var(--gem-gray-50)] m-0 leading-snug"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Untitled Crime Pilot
                </p>
                <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-1">
                  TV Pilot &middot; Crime &middot; Drama
                </p>
              </div>
              <div
                className="shrink-0 w-[52px] h-[52px] rounded-lg grid place-items-center"
                style={{ background: 'var(--gem-gray-900)', border: '1px solid var(--gem-gray-700)' }}
              >
                <span className="text-[22px] font-extrabold" style={{ color: '#16a34a' }}>78</span>
                <span className="text-[7px] uppercase tracking-wider text-[var(--gem-gray-500)] font-semibold -mt-1">
                  Score
                </span>
              </div>
            </div>

            <div className="h-px mb-3" style={{ background: 'var(--gem-gray-700)' }} />

            {/* Why this can be a hit */}
            <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mb-2 uppercase tracking-wider font-semibold">
              Why this can be a hit
            </p>
            <p className="text-[13px] text-[var(--gem-gray-200)] m-0 mb-1.5 leading-snug">
              Strong protagonist with clear internal conflict that drives every scene choice.
            </p>
            <p className="text-[13px] text-[var(--gem-gray-200)] m-0 leading-snug">
              High-tension pilot hook — audience is locked in within the first five pages.
            </p>

            <div className="h-px mt-3 mb-3" style={{ background: 'var(--gem-gray-700)' }} />

            {/* Quick-read production facts */}
            <div className="flex flex-wrap gap-2">
              {[
                'Production complexity: High',
                'Casting complexity: High',
                'Location count: 14',
                'VFX level: Moderate',
              ].map(tag => (
                <span
                  key={tag}
                  className="text-[11px] font-medium px-2.5 py-1 rounded-lg"
                  style={{ background: 'var(--gem-gray-900)', color: 'var(--gem-gray-300)', border: '1px solid var(--gem-gray-700)' }}
                >
                  {tag}
                </span>
              ))}
            </div>

            <p className="text-[11px] text-[var(--gem-gray-500)] m-0 mt-3 italic">
              From a real GEM evaluation report
            </p>
          </div>

          {/* Right: Feature details */}
          <div className="flex-1 pt-2">
            <div className="space-y-5">
              <div>
                <h3
                  className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  100% free. No strings attached.
                </h3>
                <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
                  Every writer gets a full evaluation with detailed notes on
                  what&apos;s working and where to develop. No paywall.
                  No limited preview. The full report, completely free.
                </p>
              </div>

              <div>
                <h3
                  className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  See how your script compares.
                </h3>
                <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
                  Your score is based on research drawn from thousands of produced
                  screenplays — what got made, what found an audience, and why.
                  You get a clear, data-informed read of your work&apos;s commercial
                  potential, strengths, and development priorities.
                </p>
              </div>

              <div>
                <h3
                  className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  Development notes you can actually use.
                </h3>
                <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
                  Every report includes specific, actionable feedback — not vague
                  encouragement. You&apos;ll know exactly what a development executive
                  would flag and what they&apos;d greenlight.
                </p>
              </div>
            </div>

            <div className="mt-8">
              <button
                onClick={handleCTA}
                className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
                style={{
                  background: 'var(--gem-accent)',
                  boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
                }}
              >
                Get your free evaluation
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
