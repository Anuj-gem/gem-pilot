'use client'

// Landing page v3 (2026-06-13) — production-company positioning.
// Hero → The Read (coverage card) → What you get → How we work → Partner form → Close.
// Faithful port of the approved mock. Light theme, GEM purple #7C3AED, navy accent bands.
// Serif display = Playfair via --font-display. Responsive desktop + mobile.

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

export function LandingV3() {
  const [sent, setSent] = useState(false)
  const [sending, setSending] = useState(false)
  const [form, setForm] = useState({ name: '', company: '', email: '', notes: '' })
  const [scriptCount, setScriptCount] = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/stats')
      .then((r) => r.json())
      .then((d) => { if (typeof d?.scriptsSubmitted === 'number') setScriptCount(d.scriptsSubmitted) })
      .catch(() => {})
  }, [])

  async function submitPartner(e: React.FormEvent) {
    e.preventDefault()
    if (sending) return
    setSending(true)
    try {
      await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: form.name,
          company: form.company,
          email: form.email,
          notes: form.notes,
          role: 'producer',
        }),
      })
      setSent(true)
    } catch {
      setSent(true)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#FAFAF9] text-[#171520]">
      {/* NAV */}
      <nav className="mx-auto flex max-w-[1080px] items-center justify-between px-7 py-[18px]">
        <div className="flex items-center gap-2.5 text-[20px] font-bold tracking-wide">
          <Diamond /> GEM
        </div>
        <div className="flex items-center gap-5 text-sm text-[#5b5470]">
          <a href="#read" className="hidden sm:inline hover:text-[#171520]">Free coverage</a>
          <a href="#help" className="hidden sm:inline hover:text-[#171520]">How we work</a>
          <a href="#partner" className="hidden sm:inline hover:text-[#171520]">Partner with us</a>
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
        <div className="mx-auto mt-11 flex max-w-[480px] items-stretch justify-center gap-10">
          <div className="flex-1 text-center">
            <div className="text-[36px] font-extrabold leading-none text-[#7C3AED] sm:text-[44px] tabular-nums">
              {scriptCount !== null ? scriptCount.toLocaleString() : '—'}
            </div>
            <div className="mt-1.5 text-[13.5px] text-[#5b5470]">scripts submitted to us</div>
          </div>
          <div className="w-px bg-[#e0d8f3]" />
          <div className="flex-1 text-center">
            <div className="text-[36px] font-extrabold leading-none text-[#7C3AED] sm:text-[44px]">$100K</div>
            <div className="mt-1.5 text-[13.5px] text-[#5b5470]">in direct financing per project</div>
          </div>
        </div>
      </header>

      {/* THE READ — coverage feature */}
      <section id="read" className="mt-[18px]" style={{ background: 'linear-gradient(135deg,#241149,#1b0f38)' }}>
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

      {/* HOW IT WORKS */}
      <section id="score" className="mx-auto max-w-[1080px] px-7 py-20 sm:py-28">
        <div className="text-center text-[13px] font-bold uppercase tracking-[1.6px] text-[#7C3AED]">How it works</div>
        <h2 style={serif} className="mt-3 text-center text-[30px] font-semibold tracking-[-0.3px] sm:text-[40px]">
          Simple from the start.
        </h2>
        <div className="mx-auto mt-12 grid max-w-[980px] grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            { n: '1', h: 'Get instant coverage', p: 'Sign up and upload a script. Selznick gives you a full, professional read in minutes, free and private to you.' },
            { n: '2', h: 'Submit to us', p: 'Send us a script you want us to produce, right from the app. One click shares your report with our team.' },
            { n: '3', h: 'We partner', p: 'We read every submission in detail. For the scripts we love, we become your production partner.' },
          ].map((c) => (
            <div key={c.n} className="rounded-[18px] border border-[#ece8f5] bg-white p-8 shadow-[0_12px_34px_rgba(36,17,73,.05)]">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#7C3AED] text-[15px] font-bold text-white">{c.n}</div>
              <h3 className="mt-4 text-[19px] font-semibold leading-tight">{c.h}</h3>
              <p className="mt-2 text-[15px] leading-[1.55] text-[#5b5470]">{c.p}</p>
            </div>
          ))}
        </div>
      </section>

      {/* WHO WE ARE — tinted band */}
      <section id="help" style={{ background: '#F4F0FC' }}>
        <div className="mx-auto max-w-[1080px] px-7 py-20 sm:py-28">
          <div className="text-center text-[13px] font-bold uppercase tracking-[1.6px] text-[#7C3AED]">Who we are</div>
          <h2 style={serif} className="mt-3 text-center text-[30px] font-semibold tracking-[-0.3px] sm:text-[40px]">
            Technologists and creators.
          </h2>
          <p className="mx-auto mt-5 max-w-[640px] text-center text-[17px] leading-[1.6] text-[#5b5470]">
            Technology powers what we do, but we are creators at heart. We come from companies like Uber and the Walt
            Disney Company, and we have built a social following with over a billion views of our own. Our team reads
            every submission directly, and you can partner with us on any script you write.
          </p>
          <div className="mx-auto mt-14 grid max-w-[780px] grid-cols-1 gap-y-12 sm:grid-cols-2 sm:gap-x-8">
            <div className="text-center sm:border-r sm:border-[#e0d8f3]">
              <div className="text-[12px] font-semibold uppercase tracking-[1.6px] text-[#9a93ad]">Where we have worked</div>
              <div className="mt-5 flex flex-wrap items-center justify-center gap-x-9 gap-y-4">
                <span className="text-[30px] font-bold tracking-tight text-[#171520]">Uber</span>
                <span style={{ fontFamily: "'Brush Script MT', 'Snell Roundhand', Georgia, cursive" }} className="text-[27px] italic font-semibold text-[#171520]">
                  The Walt Disney Company
                </span>
              </div>
            </div>
            <div className="text-center">
              <div className="text-[12px] font-semibold uppercase tracking-[1.6px] text-[#9a93ad]">What we have built</div>
              <div className="mt-4 flex items-baseline justify-center gap-2">
                <span className="text-[40px] font-extrabold leading-none text-[#7C3AED]">1B+</span>
                <span className="text-[16px] font-medium text-[#5b5470]">views on our own channels</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* WHAT WE'RE LOOKING FOR */}
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

      {/* HOW WE HELP — tinted band with cards */}
      <section style={{ background: '#F4F0FC' }}>
        <div className="mx-auto max-w-[1080px] px-7 py-20 sm:py-28">
          <div className="text-center text-[13px] font-bold uppercase tracking-[1.6px] text-[#7C3AED]">How we help</div>
          <h2 style={serif} className="mt-3 text-center text-[30px] font-semibold tracking-[-0.3px] sm:text-[40px]">
            We become your production partner.
          </h2>
          <p className="mx-auto mt-5 max-w-[600px] text-center text-[17px] leading-[1.6] text-[#5b5470]">
            For the scripts we take on, we do what a studio does, and we move fast.
          </p>
          <div className="mx-auto mt-12 grid max-w-[1000px] grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              { tag: 'Creative development', stat: '', p: 'We develop the work with you: positioning, format, talent, and the creative calls that get it made.' },
              { tag: 'Financing', stat: 'Up to $100K', p: 'We finance your project with up to $100,000 of our own money, then help you raise whatever else it needs.' },
              { tag: 'Marketing and distribution', stat: '', p: 'We secure the marketing and distribution partnerships to get it released, and amplify it through our own audience.' },
            ].map((c) => (
              <div key={c.tag} className="flex flex-col rounded-[18px] bg-white p-8 shadow-[0_12px_34px_rgba(36,17,73,.07)]">
                {c.stat
                  ? <div className="text-[30px] font-extrabold leading-none text-[#7C3AED]">{c.stat}</div>
                  : <Diamond size={22} glow={false} />}
                <h3 className="mt-4 text-[19px] font-semibold leading-tight">{c.tag}</h3>
                <p className="mt-2.5 text-[15px] leading-[1.55] text-[#5b5470]">{c.p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PARTNER */}
      <section className="mx-auto max-w-[1080px] px-7">
        <div id="partner" className="rounded-[20px] p-9 text-center sm:p-12" style={{ background: 'linear-gradient(135deg,#241149,#1b0f38)' }}>
          <div className="text-[13px] font-bold uppercase tracking-[1.6px] text-[#D9A626]">Partner with us</div>
          <h2 style={serif} className="mt-2.5 text-[26px] font-semibold text-white sm:text-[29px]">
            Studios, agencies, creators, financiers.
          </h2>
          <p className="mx-auto mt-3.5 max-w-[560px] text-[16px] text-[#c9c2e6]">
            If you make things or back things, we should talk. No script required, just tell us who you are and
            what you&apos;re interested in.
          </p>
          {sent ? (
            <div className="mx-auto mt-7 max-w-[560px] rounded-[12px] bg-[#2c1c50] px-6 py-8 text-[#e8e3f7]">
              Thanks. We&apos;ll be in touch.
            </div>
          ) : (
            <form onSubmit={submitPartner} className="mx-auto mt-6 grid max-w-[560px] grid-cols-1 gap-3 text-left sm:grid-cols-2">
              <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Name"
                className="w-full rounded-[9px] border border-[#4a3a6e] bg-[#2c1c50] px-3.5 py-3 text-sm text-white placeholder:text-[#a99cc6]" />
              <input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} placeholder="Company"
                className="w-full rounded-[9px] border border-[#4a3a6e] bg-[#2c1c50] px-3.5 py-3 text-sm text-white placeholder:text-[#a99cc6]" />
              <input required type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="Email"
                className="w-full rounded-[9px] border border-[#4a3a6e] bg-[#2c1c50] px-3.5 py-3 text-sm text-white placeholder:text-[#a99cc6] sm:col-span-2" />
              <textarea rows={3} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Who you are and what you're interested in"
                className="w-full rounded-[9px] border border-[#4a3a6e] bg-[#2c1c50] px-3.5 py-3 text-sm text-white placeholder:text-[#a99cc6] sm:col-span-2" />
              <div className="sm:col-span-2">
                <button disabled={sending} className="rounded-[9px] bg-white px-[19px] py-[11px] text-sm font-semibold text-[#241149] disabled:opacity-60">
                  {sending ? 'Sending…' : 'Reach out'}
                </button>
              </div>
            </form>
          )}
        </div>
      </section>

      {/* CLOSE */}
      <section className="mx-auto max-w-[1080px] px-7 pb-7 pt-16 text-center">
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
