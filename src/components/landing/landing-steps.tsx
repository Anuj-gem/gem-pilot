'use client'

import Link from 'next/link'

export function LandingSteps() {
  const steps = [
    {
      num: 1,
      title: 'Upload your PDF',
      desc: 'Drop in your screenplay. No account needed. Takes a few seconds.',
    },
    {
      num: 2,
      title: 'Get your evaluation',
      desc: 'Full producer-style report — score, comparables, development notes, and where your script sits in the market. Ready in under a minute.',
    },
    {
      num: 3,
      title: 'Apply for opportunities',
      desc: 'Browse what’s open. Apply with one click. Partners respond directly in the app when your work is a fit.',
    },
  ]

  return (
    <section
      className="px-5 sm:px-8 py-16 sm:py-20"
      style={{ borderBottom: '1px solid var(--gem-gray-700)' }}
    >
      <div className="mx-auto" style={{ maxWidth: 800 }}>
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          Get started
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] mb-5"
          style={{ fontFamily: 'Georgia, serif', color: 'var(--gem-gray-50)' }}
        >
          It takes about 60 seconds.
        </h2>
        <Link
          href="/dashboard"
          className="inline-block rounded-lg px-5 py-2.5 font-semibold text-[15px] mb-9"
          style={{ background: 'var(--gem-accent)', color: '#ffffff' }}
        >
          Get started free &rarr;
        </Link>

        <div className="flex flex-col gap-8">
          {steps.map((step) => (
            <div key={step.num} className="flex gap-5 items-start">
              <div
                className="flex-shrink-0 flex items-center justify-center text-[16px] font-bold"
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.2)',
                  color: 'var(--gem-accent)',
                }}
              >
                {step.num}
              </div>
              <div>
                <h3 className="text-[17px] font-bold mb-1.5" style={{ color: 'var(--gem-gray-50)' }}>
                  {step.title}
                </h3>
                <p className="text-[14px] m-0" style={{ color: 'var(--gem-gray-400)', lineHeight: 1.6 }}>
                  {step.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
