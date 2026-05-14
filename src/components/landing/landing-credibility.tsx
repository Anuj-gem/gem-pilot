// LandingCredibility — v15c.
// "How it works" — three visual rows: technology, matching, connection.
// Replaces the old evaluation detail + partner workflow sections.
'use client'

import { trackEvent } from '@/lib/posthog'

export function LandingCredibility() {
  function handleCTA() {
    try {
      trackEvent('cta_clicked', { location: 'how_it_works', label: 'Get started' })
    } catch {}
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-3xl mx-auto">
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          How it works
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-10"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Upload. Evaluate. Get discovered.
        </h2>

        {/* ── Row 1: Technology + objectivity ── */}
        <div className="flex gap-5 items-start mb-8">
          <div
            className="shrink-0 w-[140px] sm:w-[160px] rounded-xl p-4 text-center"
            style={{
              background: 'var(--gem-gray-900)',
              border: '1px solid var(--gem-gray-700)',
            }}
          >
            <div
              className="w-11 h-11 mx-auto mb-2 rounded-lg grid place-items-center"
              style={{
                background: 'rgba(124,58,237,0.08)',
                border: '1px solid rgba(124,58,237,0.15)',
              }}
            >
              <div
                className="w-5 h-5 rounded-full relative"
                style={{ border: '2px solid var(--gem-accent)' }}
              >
                <div
                  className="w-1.5 h-1.5 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  style={{ background: 'var(--gem-accent)' }}
                />
              </div>
            </div>
            <p className="text-[24px] font-bold text-[var(--gem-gray-50)] m-0 leading-none">78</p>
            <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mt-1">objective score</p>
          </div>
          <div className="flex-1 pt-1">
            <h3
              className="text-[16px] sm:text-[17px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Incredible technology, totally objective.
            </h3>
            <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
              Every script is evaluated using research drawn from thousands of
              produced screenplays — what got made, what found an audience,
              and why. No personal bias. No gatekeeping. Just a clear,
              data-informed read of your work&apos;s commercial potential,
              strengths, and development priorities.
            </p>
          </div>
        </div>

        {/* ── Row 2: Matched to partner network ── */}
        <div className="flex gap-5 items-start mb-8">
          <div
            className="shrink-0 w-[140px] sm:w-[160px] rounded-xl p-4 text-center"
            style={{
              background: 'var(--gem-gray-900)',
              border: '1px solid var(--gem-gray-700)',
            }}
          >
            <div className="flex justify-center gap-1.5 mb-2">
              {['P', 'L', 'F'].map(letter => (
                <div
                  key={letter}
                  className="w-7 h-7 rounded-md grid place-items-center text-[11px] font-bold text-[var(--gem-gray-300)]"
                  style={{
                    background: 'var(--gem-gray-800)',
                    border: '1px solid var(--gem-gray-700)',
                  }}
                >
                  {letter}
                </div>
              ))}
            </div>
            <div
              className="w-6 h-px mx-auto mb-1.5"
              style={{ background: 'var(--gem-gray-600)' }}
            />
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded"
              style={{
                background: 'rgba(124,58,237,0.08)',
                color: 'var(--gem-accent)',
              }}
            >
              match
            </span>
          </div>
          <div className="flex-1 pt-1">
            <h3
              className="text-[16px] sm:text-[17px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Matched to our partner network.
            </h3>
            <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
              Based on your evaluation, we match your script to opportunities
              from producers, lit reps, and financiers who are actively looking
              for material like yours. Genre, format, budget tier, score —
              everything lines up before you ever apply. No cold queries.
              No entry fees.
            </p>
          </div>
        </div>

        {/* ── Row 3: Partners + writers develop ── */}
        <div className="flex gap-5 items-start mb-8">
          <div
            className="shrink-0 w-[140px] sm:w-[160px] rounded-xl p-4 text-center"
            style={{
              background: 'var(--gem-gray-900)',
              border: '1px solid var(--gem-gray-700)',
            }}
          >
            <div className="flex items-center justify-center gap-1 mb-1.5">
              <span className="text-[18px]">🔥</span>
              <span className="text-[22px] font-bold" style={{ color: '#ea580c' }}>12</span>
            </div>
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded inline-block mb-1"
              style={{ background: 'rgba(22,163,74,0.08)', color: 'var(--gem-success)' }}
            >
              shortlisted
            </span>
            <p className="text-[11px] text-[var(--gem-gray-400)] m-0">real feedback</p>
          </div>
          <div className="flex-1 pt-1">
            <h3
              className="text-[16px] sm:text-[17px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Partners and writers develop great work.
            </h3>
            <p className="text-[14px] text-[var(--gem-gray-300)] m-0 leading-relaxed">
              When a partner engages with your script, your heat score rises.
              You get real feedback — shortlists, passes, and development notes
              from people who actually make things. GEM&apos;s team works
              alongside our partner network to surface groundbreaking scripts
              that would otherwise be ignored. Everything stays completely
              private until you choose to share it.
            </p>
          </div>
        </div>

        {/* Mid-page CTA */}
        <div className="text-center mt-4">
          <button
            onClick={handleCTA}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3 text-[14px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
            }}
          >
            Get started — upload your script
          </button>
        </div>
      </div>
    </section>
  )
}
