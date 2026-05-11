// Landing hero — v13c.
// Headline + compact CTA + visual flow (Script → Evaluation → Network).
'use client'

import { Upload, ArrowRight, FileText, Sparkles, Users } from 'lucide-react'
import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

export function LandingHero() {
  function handleUploadClick() {
    try {
      trackEvent('cta_clicked', { location: 'hero', label: 'Upload script' })
    } catch {}
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <section className="relative px-6 sm:px-8 pt-16 pb-12 sm:pt-24 sm:pb-16 hero-backdrop">
      <div className="max-w-3xl mx-auto text-center">
        <p
          className="text-[11px] tracking-[0.32em] uppercase font-semibold mb-5"
          style={{ color: 'var(--gem-gold)' }}
        >
          For screenwriters
        </p>

        <h1
          className="font-semibold leading-[1.08] tracking-tight mb-8 text-[var(--gem-gray-50)]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(34px, 5.5vw, 52px)',
          }}
        >
          Get your script in front
          <br className="hidden sm:block" />
          {' '}of the right people.
        </h1>

        {/* CTA row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10">
          <button
            type="button"
            onClick={handleUploadClick}
            className="inline-flex items-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
            }}
          >
            <Upload size={16} />
            Upload a script
          </button>
          <span className="text-[13px] text-[var(--gem-gray-500)]">or</span>
          <Link
            href="/start"
            className="text-[15px] font-semibold transition-colors"
            style={{ color: 'var(--gem-accent)' }}
          >
            Sign up <ArrowRight size={14} className="inline" />
          </Link>
        </div>

        {/* Visual flow: Script → Evaluation → Network */}
        <div className="flex items-center justify-center gap-3 sm:gap-5">
          <FlowStep
            icon={FileText}
            label="Your script"
          />
          <FlowArrow />
          <FlowStep
            icon={Sparkles}
            label="GEM evaluation"
            accent
          />
          <FlowArrow />
          <FlowStep
            icon={Users}
            label="Industry network"
          />
        </div>
      </div>
    </section>
  )
}

function FlowStep({
  icon: Icon,
  label,
  accent = false,
}: {
  icon: typeof FileText
  label: string
  accent?: boolean
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span
        className="w-11 h-11 sm:w-12 sm:h-12 rounded-full grid place-items-center"
        style={{
          background: accent
            ? 'rgba(124,58,237,0.10)'
            : 'var(--gem-gray-800)',
          border: accent
            ? '1.5px solid rgba(124,58,237,0.25)'
            : '1px solid var(--gem-gray-700)',
        }}
      >
        <Icon
          size={18}
          style={{ color: accent ? 'var(--gem-accent)' : 'var(--gem-gray-400)' }}
        />
      </span>
      <span
        className="text-[11px] sm:text-[12px] font-semibold leading-tight"
        style={{ color: accent ? 'var(--gem-accent)' : 'var(--gem-gray-400)' }}
      >
        {label}
      </span>
    </div>
  )
}

function FlowArrow() {
  return (
    <div
      className="w-6 sm:w-10 h-px mb-5"
      style={{ background: 'var(--gem-gray-600)' }}
    >
      <div
        className="w-0 h-0 ml-auto -mt-[3px]"
        style={{
          borderTop: '3.5px solid transparent',
          borderBottom: '3.5px solid transparent',
          borderLeft: '5px solid var(--gem-gray-600)',
        }}
      />
    </div>
  )
}
