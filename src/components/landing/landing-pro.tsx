// LandingPro — GEM Pro section.
// v13b — Pro = apply for specific opportunities (not "team advocacy").
// Free = in the partner database. Pro = apply for specific things.
'use client'

import { ArrowRight } from 'lucide-react'
import { trackEvent } from '@/lib/posthog'

export function LandingPro() {
  function handleCTA() {
    try {
      trackEvent('cta_clicked', { location: 'pro_section', label: 'Get started' })
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
          GEM Pro
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-3"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Apply for specific opportunities.
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-relaxed m-0 mb-8 max-w-[56ch]">
          Every member&apos;s work is available to our partner network. Pro
          members can also apply directly to specific opportunities — open
          calls from producers, reps, and financiers looking for scripts like
          yours.
        </p>

        <div
          className="rounded-xl p-5 sm:p-6 mb-8 card-glass"
          style={{
            borderColor: 'rgba(124,58,237,0.20)',
          }}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <p className="text-[12px] uppercase tracking-[0.14em] font-bold text-[var(--gem-gray-500)] m-0 mb-2">
                Free — every member
              </p>
              <ul className="list-none p-0 m-0 space-y-1.5">
                <BulletItem>Unlimited evaluations</BulletItem>
                <BulletItem>Full detailed reports</BulletItem>
                <BulletItem>Work visible to partner network</BulletItem>
                <BulletItem>Partners can reach out to you</BulletItem>
              </ul>
            </div>
            <div>
              <p className="text-[12px] uppercase tracking-[0.14em] font-bold m-0 mb-2" style={{ color: 'var(--gem-accent)' }}>
                Pro — $20/month
              </p>
              <ul className="list-none p-0 m-0 space-y-1.5">
                <BulletItem accent>Everything in Free</BulletItem>
                <BulletItem accent>Apply to specific opportunities</BulletItem>
                <BulletItem accent>Portfolio review by our team</BulletItem>
                <BulletItem accent>Priority consideration</BulletItem>
              </ul>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <button
            onClick={handleCTA}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 4px 16px rgba(124,58,237,0.25)',
            }}
          >
            Get started <ArrowRight size={14} />
          </button>
          <span className="text-[13px] text-[var(--gem-gray-400)]">
            Start free · Upgrade anytime
          </span>
        </div>
      </div>
    </section>
  )
}

function BulletItem({ children, accent = false }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <li className="flex items-start gap-2 text-[13.5px] leading-snug" style={{ color: 'var(--gem-gray-200)' }}>
      <span
        className="shrink-0 w-1.5 h-1.5 rounded-full mt-[7px]"
        style={{ background: accent ? 'var(--gem-accent)' : 'var(--gem-gray-600)' }}
      />
      {children}
    </li>
  )
}
