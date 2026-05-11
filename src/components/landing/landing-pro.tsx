// LandingPro — GEM Pro benefit-first section.
// v13 — "We actively work on your behalf."
// Benefit-first: active matching, team advocacy, priority consideration.
'use client'

import { ArrowRight, Users, MessageCircle, Star } from 'lucide-react'
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
          We actively work on your behalf.
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-relaxed m-0 mb-8 max-w-[56ch]">
          Pro members get a dedicated team working with our partner network to
          find the right opportunities for their work.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <ProBenefit
            icon={Users}
            title="Active matching"
            description="Our team reviews your portfolio and actively matches you with partners looking for work like yours."
          />
          <ProBenefit
            icon={MessageCircle}
            title="Team advocacy"
            description="We pitch your work directly to producers, reps, and financiers in our network."
          />
          <ProBenefit
            icon={Star}
            title="Priority consideration"
            description="Your submissions are reviewed first when new opportunities open."
          />
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
          <span className="text-[14px] text-[var(--gem-gray-400)]">
            $20 / month · Cancel anytime
          </span>
        </div>
      </div>
    </section>
  )
}

function ProBenefit({
  icon: Icon,
  title,
  description,
}: {
  icon: typeof Users
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl p-5 card-glass">
      <span
        className="inline-flex w-9 h-9 rounded-full items-center justify-center text-white mb-3"
        style={{ background: 'var(--gem-accent)' }}
      >
        <Icon size={16} />
      </span>
      <h3
        className="text-[15px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {title}
      </h3>
      <p className="text-[13px] text-[var(--gem-gray-300)] m-0 leading-snug">
        {description}
      </p>
    </div>
  )
}
