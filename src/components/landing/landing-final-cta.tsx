// LandingFinalCTA — purple gradient closing CTA.
'use client'

import Link from 'next/link'
import { trackEvent } from '@/lib/posthog'

export function LandingFinalCTA() {
  return (
    <section
      className="px-6"
      style={{
        background: 'linear-gradient(160deg, #0f0a1a 0%, #1a1035 30%, #2d1b4e 60%, #4c1d95 100%)',
        padding: '80px 24px',
      }}
    >
      <div className="max-w-2xl mx-auto text-center">
        <h2
          className="font-bold tracking-tight leading-[1.15] m-0 mb-4 text-white"
          style={{
            fontFamily: 'Georgia, serif',
            fontSize: 'clamp(26px, 4.5vw, 36px)',
          }}
        >
          Your screenplay deserves to be seen by the right people.
        </h2>
        <p className="text-[16px] m-0 mb-8" style={{ color: 'rgba(255,255,255,0.5)' }}>
          Upload your script. Get your free evaluation. See what happens next.
        </p>
        <Link
          href="/get-started"
          className="inline-block rounded-full px-12 py-4 text-[17px] font-semibold text-white transition-all duration-150 hover:scale-105 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            boxShadow: '0 8px 30px rgba(124,58,237,0.4)',
          }}
          onClick={() => {
            try { trackEvent('cta_clicked', { location: 'final_cta', label: 'Get started' }) } catch {}
          }}
        >
          Get started
        </Link>
      </div>
    </section>
  )
}
