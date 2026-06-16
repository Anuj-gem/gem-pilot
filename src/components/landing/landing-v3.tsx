'use client'

// Landing page v3 — production-company positioning with a short-form origin story.
// Hero → Our story → The Read (free coverage) → What we do (tech + team) → Who we're looking for → How we help → Close.
// Light theme, GEM purple #7C3AED, navy accent bands. Serif display = Playfair via --font-display.

import { useEffect, useState } from 'react'
import Link from 'next/link'

const serif = { fontFamily: 'var(--font-display), Georgia, serif' }

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

function ClipTile({ id, views, img }: { id: string; views?: string; img: string }) {
  const [playing, setPlaying] = useState(false)
  return (
    <div className="relative w-[178px] overflow-hidden rounded-[16px] border border-[#e0d8f3]"
      style={{ aspectRatio: '9 / 16', background: 'linear-gradient(135deg,#241149,#1b0f38)' }}>
      {playing ? (
        <iframe
          title="GEM clip"
          src={`https://www.tiktok.com/embed/v2/${id}?autoplay=1`}
          className="absolute inset-0 h-full w-full"
          style={{ border: 0 }}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="absolute inset-0 h-full w-full cursor-pointer border-0 bg-transparent p-0"
          aria-label={views ? `Play clip, ${views} views` : 'Play clip'}
        >
          <img
            src={img}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
          />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: 'rgba(255,255,255,0.22)' }}>
              <svg width="18" height="18" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="#ffffff" /></svg>
            </span>
          </span>
          {views && <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[13px] font-semibold text-white" style={{ background: 'rgba(0,0,0,0.5)' }}>
            <svg width="11" height="11" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.5v9l7-4.5z" fill="#ffffff" /></svg>
            {views}
          </span>}
        </button>
      )}
    </div>
  )
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
          <a href="#story" className="hidden sm:inline hover:text-[#171520]">Our story</a>
          <a href="#read" className="hidden sm:inline hover:text-[#171520]">Free coverage</a>
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

      {/* OUR WORK — virality + social proof */}
      <section id="story" style={{ background: '#F4F0FC' }}>
        <div className="mx-auto max-w-[1080px] px-7 py-20 sm:py-28">
          <div className="text-center text-[13px] font-bold uppercase tracking-[1.6px] text-[#7C3AED]">Our work</div>
          <h2 style={serif} className="mt-3 text-center text-[30px] font-semibold tracking-[-0.3px] sm:text-[40px]">
            We got here by going viral.
          </h2>
          <p className="mx-auto mt-5 max-w-[640px] text-center text-[17px] leading-[1.6] text-[#5b5470]">
            Across our channels we&apos;ve done nearly a billion views, with a team out of companies like Uber and the
            Walt Disney Company. Now we&apos;re partnering with talented writers to make the best series and films in the
            world.
          </p>

          {/* Clips — click to play inline */}
          <div className="mt-12 flex flex-wrap items-start justify-center gap-5">
            <ClipTile id="7584299938708737312" views="111M" img="/clip-wedding.png" />
            <ClipTile id="7585421656076602657" views="84M" img="/clip-lawyer.png" />
            <ClipTile id="7568327414305148192" img="/clip-three.png" />
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link href="/get-started" className="rounded-[9px] bg-[#7C3AED] px-8 py-3.5 text-[16px] font-semibold text-white">
              Send us a script
            </Link>
            <a href="https://www.tiktok.com/@trygemstudios" target="_blank" rel="noopener noreferrer"
              className="rounded-[9px] border border-[#c9bdea] px-7 py-3.5 text-[16px] font-semibold text-[#6D28D9] no-underline">
              Watch more
            </a>
          </div>
        </div>
      </section>

      {/* THE READ — coverage feature */}
      <section id="read" style={{ background: 'linear-gradient(135deg,#241149,#1b0f38)' }}>
        <div className="mx-auto grid max-w-[1080px] grid-cols-1 items-center gap-10 px-7 py-16 md:grid-cols-[1fr_1.05fr] md:gap-[54px]">
          <div>
            <div className="text-[13px] font-bold uppercase tracking-[1.6px] text-[#D9A626]">Free script coverage</div>
            <h2 style={serif} className="mt-3.5 text-[30px] font-semibold leading-[1.08] tracking-[-0.4px] text-white sm:text-[42px]">
              Free coverage on your script, in minutes.
            </h2>
            <p className="mt-5 max-w-[440px] text-[16.5px] leading-[1.6] text-[#c9c2e6]">
              Sign up and get instant, free coverage on any script, powered by Selznick, the most advanced script
              evaluation model we have ever built. You get an overall score plus exactly what is working, what is not,
              and how to position it.
            </p>
            <p className="mt-3.5 max-w-[440px] text-[16.5px] leading-[1.6] text-[#c9c2e6]">
              Use it however you like, or send us a script you want us to produce. It always stays private to you.
            </p>
            <div className="mt-7">
              <Link href="/get-started" className="inline-block rounded-[9px] bg-white px-7 py-3.5 text-[16px] font-semibold text-[#241149]">
                Get started
              </Link>
            </div>
          </div>

          {/* coverage card */}
          <div className="rounded-[20px] bg-white p-[30px] shadow-[0_30px_70px_rgba(0,0,0,.35)]">
            <h3 style={serif} className="text-[30px] font-bold">Nightfall</h3>
            <div className="mt-0.5 text-sm text-[#8a8398]">Series · Thriller · Drama</div>
            <div className="my-5 rounded-[14px] bg-[#f3f0fb] px-5 py-[18px]">
              <div className="flex items-center justify-between text-[13px] font-bold tracking-[1px] text-[#7C3AED]">
                <span className="flex items-center gap-2"><span className="h-[13px] w-[13px] rotate-45 rounded-[2px] bg-[#7C3AED]" /> GEM SCORE</span>
                <span className="text-[10px] font-semibold tracking-[0.6px] text-[#8a7fb0]">POWERED BY SELZNICK</span>
              </div>
              <div className="mt-1.5 text-[52px] font-extrabold leading-none text-[#6D28D9]">
                88<span className="text-[22px] font-bold text-[#a99fc4]"> / 100</span>
              </div>
              <div className="mt-3.5 h-[9px] overflow-hidden rounded-[6px] bg-[#e2dcf2]">
                <span className="block h-full w-[88%] rounded-[6px]" style={{ background: 'linear-gradient(90deg,#8b5cf6,#6D28D9)' }} />
              </div>
            </div>
            <div className="mb-2 mt-[18px] text-xs font-bold tracking-[1px] text-[#6b6480]">STRENGTHS</div>
            {[
              'Breakout central character with a real contradiction at the core',
              'The hook lands inside the first ten pages and keeps pulling',
              "An ownable tone, you'd know this show from a single scene",
            ].map((t) => (
              <div key={t} className="my-[7px] flex gap-2.5 text-[15px] text-[#2a2536]"><span className="font-extrabold text-[#16a34a]">+</span> {t}</div>
            ))}
            <div className="mb-2 mt-[18px] text-xs font-bold tracking-[1px] text-[#6b6480]">WHERE IT NEEDS WORK</div>
            {[
              'Momentum sags through the midpoint of the pilot',
              "The antagonist's logic needs sharpening to match the lead",
            ].map((t) => (
              <div key={t} className="my-[7px] flex gap-2.5 text-[15px] text-[#2a2536]"><span className="font-extrabold text-[#c2740c]">–</span> {t}</div>
            ))}
            <div className="mt-5 flex justify-between border-t border-[#eee] pt-4 text-sm text-[#8a8398]">
              <span>Format · <b className="text-[#2a2536]">Series</b></span>
              <span>Budget · <span className="text-[#c2740c]">Indie</span> <b className="text-[#2a2536]">$1.5M–3M / ep</b></span>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE DO — technology + team */}
      <section id="how" className="mx-auto max-w-[1080px] px-7 py-20 sm:py-28">
        <div className="text-center text-[13px] font-bold uppercase tracking-[1.6px] text-[#7C3AED]">What we do</div>
        <h2 style={serif} className="mt-3 text-center text-[30px] font-semibold tracking-[-0.3px] sm:text-[40px]">
          Powerful technology, and people who know story.
        </h2>
        <div className="mx-auto mt-12 grid max-w-[920px] grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="rounded-[18px] border border-[#ece8f5] bg-white p-8 shadow-[0_12px_34px_rgba(36,17,73,.05)]">
            <Diamond size={22} glow={false} />
            <h3 className="mt-4 text-[19px] font-semibold leading-tight">The technology</h3>
            <p className="mt-2.5 text-[15px] leading-[1.55] text-[#5b5470]">
              We built proprietary technology that spots standout scripts and helps develop and position them. Our team
              uses it to read everything that comes in, and we put the same tool in your hands for free, so you never
              have to spend hundreds of dollars on coverage.
            </p>
          </div>
          <div className="rounded-[18px] border border-[#ece8f5] bg-white p-8 shadow-[0_12px_34px_rgba(36,17,73,.05)]">
            <Diamond size={22} glow={false} />
            <h3 className="mt-4 text-[19px] font-semibold leading-tight">The team</h3>
            <p className="mt-2.5 text-[15px] leading-[1.55] text-[#5b5470]">
              Behind it is a team of creators and producers. We personally read the scripts you send, with our tools
              alongside us, to decide which ones we want to help bring to the screen.
            </p>
          </div>
        </div>
      </section>

      {/* WHAT WE'RE LOOKING FOR */}
      <section style={{ background: '#F4F0FC' }}>
        <div className="mx-auto max-w-[1080px] px-7 py-20 sm:py-28">
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
        </div>
      </section>

      {/* HOW WE HELP — cards */}
      <section className="mx-auto max-w-[1080px] px-7 py-20 sm:py-28">
        <div className="text-center text-[13px] font-bold uppercase tracking-[1.6px] text-[#7C3AED]">How we help</div>
        <h2 style={serif} className="mt-3 text-center text-[30px] font-semibold tracking-[-0.3px] sm:text-[40px]">
          We become your production partner.
        </h2>
        <p className="mx-auto mt-5 max-w-[600px] text-center text-[17px] leading-[1.6] text-[#5b5470]">
          For the scripts we take on, we do what a studio does, and we move fast.
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
      </section>

      {/* CLOSE */}
      <section className="mx-auto max-w-[1080px] px-7 pb-7 pt-4 text-center">
        <h2 style={serif} className="mx-auto max-w-[600px] text-[27px] font-semibold sm:text-[31px]">
          Every great show started as a script someone almost missed.
        </h2>
        <p className="mx-auto mb-6 mt-3.5 max-w-[460px] text-[#5b5470]">We make sure the right ones don&apos;t.</p>
        <Link href="/get-started" className="inline-block rounded-[9px] bg-[#7C3AED] px-7 py-3.5 text-[16px] font-semibold text-white">
          Get your free coverage
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
