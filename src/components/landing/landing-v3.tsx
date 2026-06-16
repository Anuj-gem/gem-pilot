'use client'

// Landing page v3 — production-company positioning with a short-form origin story.
// Hero → Our work (virality, leveling up) → What we do (tech + team) → How we help → Who we're looking for → Close.
// Light theme, GEM purple #7C3AED, navy accent bands. Serif display = Playfair via --font-display.

import { useEffect, useState } from 'react'
import Link from 'next/link'

const serif = { fontFamily: 'var(--font-display), Georgia, serif' }
const FEATURED_CLIP = 'https://www.tiktok.com/@trygemstudios/video/7584299938708737312'

function Diamond({ size = 21, glow = true }: { size?: number; glow?: boolean }) {
  return (
    <span
      style={{
        width: size, height: size,
        background: 'linear-gradient(135deg,#8b5cf6,#6D28D9)',
        transform: 'rotate(45deg)', borderRadius: Math.max(3, size / 5),
        boxShadow: glow ? '0 0 14px rgba(124,58,237,.45)' : 'none',
        display: 'inline-block', flex: 'none',
      }}
    />
  )
}

function Play({ size = 20 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="#ffffff" /></svg>
}

export function LandingV3() {
  const [scriptCount, setScriptCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => { if (typeof d?.scriptsSubmitted === 'number') setScriptCount(d.scriptsSubmitted) })
      .catch(() => {})
  }, [])

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#171520]">
      {/* NAV */}
      <nav className="mx-auto flex max-w-[1080px] items-center justify-between px-7 py-[18px]">
        <div className="flex items-center gap-2.5 text-[20px] tracking-wide">
          <Diamond />
          <span><span className="font-bold">GEM</span><span className="ml-1.5 font-medium tracking-[0.18em]">STUDIOS</span></span>
        </div>
        <div className="flex items-center gap-5 text-sm text-[#5b5470]">
          <a href="#work" className="hidden sm:inline hover:text-[#171520]">Our work</a>
          <a href="#how" className="hidden sm:inline hover:text-[#171520]">How it works</a>
          <Link href="/login" className="font-semibold text-[#7C3AED]">Log in</Link>
          <Link href="/get-started" className="rounded-[9px] bg-[#7C3AED] px-[18px] py-[10px] font-semibold text-white">
            Get started
          </Link>
        </div>
      </nav>

      {/* HERO */}
      <header className="px-7 pb-12 pt-12 text-center sm:pt-14">
        <div className="mx-auto mb-6 h-12 w-12 rotate-45 rounded-[9px]"
          style={{ background: 'linear-gradient(135deg,#8b5cf6,#6D28D9)', boxShadow: '0 0 40px rgba(124,58,237,.5)' }} />
        <h1 style={serif} className="mx-auto max-w-[820px] text-[40px] font-semibold leading-[1.08] tracking-[-0.5px] sm:text-[56px]">
          We give every screenwriter <span className="text-[#7C3AED]">a chance.</span>
        </h1>
        <p className="mx-auto mt-5 max-w-[600px] text-[17px] text-[#5b5470] sm:text-[18.5px]">
          We use powerful technology not to replace writers but to find talented creatives who would otherwise go
          unnoticed, and help them turn their scripts into successful productions.
        </p>
        <div className="mt-9 flex justify-center">
          <Link href="/get-started" className="rounded-[9px] bg-[#7C3AED] px-10 py-4 text-[16px] font-semibold text-white">
            Get started
          </Link>
        </div>
        <div className="mt-3 text-[13px] text-[#5b5470]">
          Already have an account? <Link href="/login" className="font-semibold text-[#7C3AED]">Log in</Link>
        </div>
        <div className="mx-auto mt-11 flex max-w-[480px] items-stretch justify-center">
          <div className="flex-1 text-center">
            <div className="text-[36px] font-extrabold leading-none text-[#7C3AED] sm:text-[44px] tabular-nums">
              {scriptCount !== null ? scriptCount.toLocaleString() : '—'}
            </div>
            <div className="mt-1.5 text-[13.5px] text-[#5b5470]">scripts submitted to us</div>
          </div>
        </div>
      </header>

      {/* OUR WORK — virality, leveling up */}
      <section id="work" style={{ background: '#F4F0FC' }}>
        <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-center gap-12 px-7 py-20 sm:py-24 md:grid-cols-[1.1fr_0.9fr]">
          <div className="text-center md:text-left">
            <div className="text-[13px] font-bold uppercase tracking-[1.6px] text-[#7C3AED]">Our work</div>
            <h2 style={serif} className="mt-3 text-[32px] font-semibold leading-[1.1] tracking-[-0.4px] sm:text-[44px]">
              We got here by going viral.
            </h2>
            <p className="mx-auto mt-5 max-w-[480px] text-[17px] leading-[1.6] text-[#5b5470] md:mx-0">
              We&apos;ve done nearly a billion views across social media. Now we&apos;re leveling up: we want to make
              the best series and films in the world, with writers who have incredible stories to tell.
            </p>
            <div className="mt-7 flex justify-center md:justify-start">
              <Link href="/get-started"
                className="inline-flex items-center gap-2 rounded-[9px] bg-[#7C3AED] px-7 py-3.5 text-[16px] font-semibold text-white no-underline">
                Get started
              </Link>
            </div>
          </div>

          {/* Featured clip — opens the real video so it never crops */}
          <div className="flex justify-center md:justify-end">
            <a href={FEATURED_CLIP} target="_blank" rel="noopener noreferrer"
              className="relative block w-[240px] overflow-hidden rounded-[18px] no-underline shadow-[0_20px_50px_rgba(36,17,73,.25)] transition-transform hover:scale-[1.02]"
              style={{ aspectRatio: '9 / 16', background: 'linear-gradient(135deg,#241149,#1b0f38)' }}>
              <img src="/clip-wedding.png" alt="" className="absolute inset-0 h-full w-full object-cover"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }} />
              <span className="absolute inset-0 flex items-center justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.4)' }}>
                  <Play size={22} />
                </span>
              </span>
              <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[14px] font-semibold text-white" style={{ background: 'rgba(0,0,0,0.55)' }}>
                <Play size={11} /> 111M
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* WHAT WE DO — technology + team */}
      <section id="how" className="mx-auto max-w-[1080px] px-7 py-20 sm:py-28">
        <div className="text-center text-[13px] font-bold uppercase tracking-[1.6px] text-[#7C3AED]">What we do</div>
        <h2 style={serif} className="mt-3 text-center text-[30px] font-semibold tracking-[-0.3px] sm:text-[40px]">
          Powerful technology, and a team that knows story.
        </h2>
        <div className="mx-auto mt-12 grid max-w-[920px] grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-[18px] border border-[#ece8f5] bg-white p-8 shadow-[0_12px_34px_rgba(36,17,73,.05)]">
            <Diamond size={22} glow={false} />
            <h3 className="mt-4 text-[19px] font-semibold leading-tight">The technology</h3>
            <p className="mt-2.5 text-[15px] leading-[1.55] text-[#5b5470]">
              We built powerful technology to evaluate any writer&apos;s script, and we put the same tools in your hands
              for free. Use them to understand and sharpen your work, with no strings attached.
            </p>
          </div>
          <div className="rounded-[18px] border border-[#ece8f5] bg-white p-8 shadow-[0_12px_34px_rgba(36,17,73,.05)]">
            <Diamond size={22} glow={false} />
            <h3 className="mt-4 text-[19px] font-semibold leading-tight">The team</h3>
            <p className="mt-2.5 text-[15px] leading-[1.55] text-[#5b5470]">
              Behind the technology is a team of creators and producers. Submit the scripts you choose, and we read
              every one to decide which writers we want to work with.
            </p>
          </div>
        </div>
        <div className="mt-10 flex justify-center">
          <Link href="/get-started" className="rounded-[9px] bg-[#7C3AED] px-9 py-3.5 text-[16px] font-semibold text-white no-underline">
            Get started
          </Link>
        </div>
      </section>

      {/* HOW WE HELP — cards */}
      <section style={{ background: '#F4F0FC' }}>
        <div className="mx-auto max-w-[1080px] px-7 py-20 sm:py-28">
          <div className="text-center text-[13px] font-bold uppercase tracking-[1.6px] text-[#7C3AED]">How we help</div>
          <h2 style={serif} className="mt-3 text-center text-[30px] font-semibold tracking-[-0.3px] sm:text-[40px]">
            We become your production partner.
          </h2>
          <p className="mx-auto mt-5 max-w-[600px] text-center text-[17px] leading-[1.6] text-[#5b5470]">
            For the projects we take on, we do what a studio does, and we move fast.
          </p>
          <div className="mx-auto mt-12 grid max-w-[1000px] grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { tag: 'Creative development', p: 'We develop the work with you: positioning, format, talent, and the creative calls that get it made.' },
              { tag: 'Financing', p: 'We back the projects we take on and help you raise whatever else they need.' },
              { tag: 'Marketing and distribution', p: 'We secure the marketing and distribution partnerships to get it released, and amplify it through our own audience.' },
            ].map((c) => (
              <div key={c.tag} className="flex flex-col rounded-[18px] bg-white p-8 shadow-[0_12px_34px_rgba(36,17,73,.07)] border border-[#ece8f5]">
                <Diamond size={22} glow={false} />
                <h3 className="mt-4 text-[19px] font-semibold leading-tight">{c.tag}</h3>
                <p className="mt-2.5 text-[15px] leading-[1.55] text-[#5b5470]">{c.p}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 flex justify-center">
            <Link href="/get-started" className="rounded-[9px] bg-[#7C3AED] px-9 py-3.5 text-[16px] font-semibold text-white no-underline">
              Get started
            </Link>
          </div>
        </div>
      </section>

      {/* WHO WE'RE LOOKING FOR */}
      <section className="mx-auto max-w-[1080px] px-7 py-20 sm:py-28">
        <div className="text-center text-[13px] font-bold uppercase tracking-[1.6px] text-[#7C3AED]">Who we&apos;re looking for</div>
        <h2 style={serif} className="mt-3 text-center text-[30px] font-semibold tracking-[-0.3px] sm:text-[40px]">
          Creators, not just scripts.
        </h2>
        <p className="mx-auto mt-5 max-w-[660px] text-center text-[17px] leading-[1.6] text-[#5b5470]">
          We started as creators, and we believe the future is the melting of social and Hollywood. The most exciting
          new storytellers are getting overlooked. Those are the people we want to work with.
        </p>
        <div className="mx-auto mt-12 grid max-w-[860px] grid-cols-1 gap-x-12 gap-y-8 sm:grid-cols-2">
          {[
            { h: 'A real point of view', p: 'Unique, original ideas with the bones to become film or television.' },
            { h: 'An instinct for attention', p: 'You understand virality and audience, not just the page.' },
            { h: 'A storytelling brand', p: 'You build a world and a following, not one-off scripts.' },
            { h: 'Command of the craft', p: 'Proof you can deliver: consistency, an audience, and real creative and production chops.' },
          ].map((c) => (
            <div key={c.h} className="flex items-start gap-4">
              <Diamond size={18} glow={false} />
              <div>
                <h3 className="text-[17px] font-semibold leading-tight">{c.h}</h3>
                <p className="mt-1.5 text-[14.5px] leading-[1.55] text-[#5b5470]">{c.p}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CLOSE */}
      <section className="mx-auto max-w-[1080px] px-7 pb-7 pt-4 text-center">
        <h2 style={serif} className="mx-auto max-w-[600px] text-[27px] font-semibold sm:text-[31px]">
          Every great show started as a script someone almost missed.
        </h2>
        <p className="mx-auto mb-6 mt-3.5 max-w-[460px] text-[#5b5470]">We make sure the right ones don&apos;t.</p>
        <Link href="/get-started" className="inline-block rounded-[9px] bg-[#7C3AED] px-7 py-3.5 text-[16px] font-semibold text-white">
          Get started
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="mx-auto mt-7 flex max-w-[1080px] items-center justify-between border-t border-[#E7E3EF] px-7 py-7 text-[13px] text-[#5b5470]">
        <div className="flex items-center gap-2.5 text-[16px] font-bold"><Diamond size={15} /> GEM</div>
        <div>gem.studio &nbsp;·&nbsp; hello@gem.studio</div>
      </footer>
    </div>
  )
}
