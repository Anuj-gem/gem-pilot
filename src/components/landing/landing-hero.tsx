// Landing hero — compact upload zone + sign up.
// v13 — "Get your script in front of the right people."
// Compact CTA: Upload a script | or sign up
'use client'

import { ArrowRight, Upload } from 'lucide-react'
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
    <section className="relative px-6 sm:px-8 pt-16 pb-10 sm:pt-24 sm:pb-14 hero-backdrop">
      <div className="max-w-3xl mx-auto text-center">
        <p
          className="text-[11px] tracking-[0.32em] uppercase font-semibold mb-5"
          style={{ color: 'var(--gem-gold)' }}
        >
          For screenwriters
        </p>

        <h1
          className="font-semibold leading-[1.08] tracking-tight mb-5 text-[var(--gem-gray-50)]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(34px, 5.5vw, 52px)',
          }}
        >
          Get your script in front
          <br className="hidden sm:block" />
          {' '}of the right people.
        </h1>

        <p className="text-[16px] sm:text-[18px] text-[var(--gem-gray-300)] leading-relaxed mb-10 max-w-[580px] mx-auto">
          Upload your screenplay and get a detailed evaluation — then our team
          and partner network work to find the right fit for your work.
        </p>

        {/* Compact CTA row */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-4">
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

        <p className="text-[12px] text-[var(--gem-gray-500)] m-0">
          Free forever. Unlimited evaluations. No credit card required.
        </p>
      </div>
    </section>
  )
}
