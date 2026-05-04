// LandingFinalCTA — single closing call. The page builds the
// pitch; this is the off-ramp for visitors who scrolled all the
// way down without clicking the hero.
//
// Anuj 2026-04-30 v0.11.0.

import { ArrowRight } from 'lucide-react'
import Link from 'next/link'

export function LandingFinalCTA() {
  return (
    <section className="px-5 sm:px-8 py-20 sm:py-24">
      <div className="max-w-2xl mx-auto text-center">
        <h2
          className="text-[32px] sm:text-[42px] font-bold tracking-tight leading-[1.1] m-0 mb-4"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Upload your script. See what happens.
        </h2>
        <p className="text-[15.5px] sm:text-[17px] text-[var(--gem-gray-300)] leading-relaxed m-0 mb-8 max-w-[480px] mx-auto">
          Your first evaluation is free. No card needed.
        </p>
        <Link
          href="/submit"
          className="inline-flex items-center gap-2 rounded-xl px-6 py-4 text-[16px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
          style={{
            background: 'var(--gem-accent)',
            boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
          }}
        >
          Get your free evaluation <ArrowRight size={16} />
        </Link>
      </div>
    </section>
  )
}
