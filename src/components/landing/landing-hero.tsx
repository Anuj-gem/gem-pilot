// Landing hero — client component. Single-column, focused on the
// writer's first action (drop in a PDF). Anuj 2026-04-28: dropped the
// right-side floating report card; the rich product mockups now live in
// the dedicated features section further down the page.
//
// Two ways in from here:
//   1) User drags / picks a PDF in the drop zone → we stash it via
//      setPendingFile() and route to /submit. The submit page detects the
//      pending file on mount and lets the writer skip the script step
//      (they've already uploaded), so they go Format → Account directly.
//   2) User clicks "Get Started — Free" → routes to /submit with no file.
//      Normal Format → Script → Account flow.
'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Upload } from 'lucide-react'
import { setPendingFile } from '@/lib/pending-file'
import { trackEvent, trackHeroUpload } from '@/lib/posthog'

export function LandingHero() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  function acceptFile(file: File) {
    setError(null)
    if (file.type !== 'application/pdf') {
      setError('Please upload a PDF — Final Draft, WriterSolo, or Highland all export to it.')
      return
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('That file is over 10MB. Try re-exporting from your screenwriting app.')
      return
    }
    setPendingFile(file)
    try {
      trackHeroUpload()
    } catch {}
    router.push('/submit?from=hero')
  }

  function handleStartClick() {
    try {
      trackEvent('cta_clicked', { location: 'hero', label: 'Get Started — Free' })
    } catch {}
    router.push('/submit?from=hero')
  }

  return (
    <section
      className="relative px-6 sm:px-8 pt-14 pb-14 sm:pt-20 sm:pb-20"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(212,160,23,0.06) 0%, transparent 60%)',
      }}
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-[1fr_0.85fr] gap-10 lg:gap-12 items-center">
        <div className="text-center lg:text-left">
          <div
            className="text-[11px] tracking-[0.32em] uppercase font-semibold mb-5"
            style={{ color: 'var(--gem-gold)' }}
          >
            Where Hollywood meets its hidden gems
          </div>
          <h1
            className="font-semibold leading-[1.05] tracking-tight mb-5 text-[var(--gem-gray-50)]"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(34px, 5.2vw, 50px)',
            }}
          >
            We connect promising writers
            <br className="hidden sm:block" /> to the industry.
          </h1>
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-300)] leading-relaxed mb-8 max-w-[540px] lg:max-w-none mx-auto lg:mx-0">
            Upload your screenplay. Selznick reads it like a producer would
            and gives you a structured report. If it qualifies, our industry
            partners reach out directly. First read on us.
          </p>

          <div className="max-w-[460px] mx-auto lg:mx-0">
          <label
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files?.[0]
              if (f) acceptFile(f)
            }}
            className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-150 mb-2.5"
            style={{
              border: dragOver
                ? '2px dashed var(--gem-accent)'
                : '2px dashed var(--gem-gold)',
              background: dragOver
                ? 'rgba(124,58,237,0.04)'
                : 'rgba(212,160,23,0.04)',
            }}
          >
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf"
              className="sr-only"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) acceptFile(f)
              }}
            />
            <div
              className="w-9 h-9 rounded-full grid place-items-center flex-shrink-0"
              style={{
                background: 'rgba(124,58,237,0.10)',
                color: 'var(--gem-accent)',
              }}
            >
              <Upload size={16} />
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-[14px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
                Drop your PDF here
              </p>
              <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mt-0.5">
                or{' '}
                <span style={{ color: 'var(--gem-accent)', textDecoration: 'underline' }}>
                  choose a file
                </span>
              </p>
            </div>
          </label>

          <button
            id="landing-hero-cta-anchor"
            type="button"
            onClick={handleStartClick}
            className="w-full rounded-xl px-4 py-3.5 text-[15px] font-semibold text-white flex items-center justify-center gap-2 mb-2.5 transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 6px 20px rgba(124,58,237,0.25)',
            }}
          >
            Get Started — Free <ArrowRight size={15} />
          </button>
          <p className="text-[12px] text-[var(--gem-gray-500)] m-0">
            First read free · No credit card
          </p>

          {error && (
            <div
              className="mt-3 rounded-lg px-3.5 py-2.5 text-[13px] text-left"
              style={{
                background: 'rgba(220,38,38,0.06)',
                border: '1px solid rgba(220,38,38,0.25)',
                color: '#b91c1c',
              }}
            >
              {error}
            </div>
          )}
          </div>
        </div>

        {/* Right side — story-in-a-graphic. Tiny report card on top,
            a "matched" connector, then a tiny producer-reach-out card.
            Communicates "submit your script → get connected to the
            industry" in one beat without dragging the hero into a full
            product mockup. Anuj 2026-04-28. */}
        <HeroStoryGraphic />
      </div>
    </section>
  )
}

function HeroStoryGraphic() {
  return (
    <div className="relative max-w-[360px] mx-auto lg:mx-0 lg:ml-auto w-full">
      {/* Top — script report card */}
      <div
        className="relative rounded-2xl p-4"
        style={{
          background: '#fff',
          border: '1px solid var(--gem-gray-700)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
          transform: 'rotate(-1deg)',
        }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-1">
              Your script
            </p>
            <p
              className="text-[13px] font-bold m-0 leading-tight text-[var(--gem-gray-50)] truncate"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Untitled mob therapy pilot
            </p>
          </div>
          <div
            className="shrink-0 flex flex-col items-center justify-center rounded-lg tabular-nums"
            style={{
              background: 'rgba(124,58,237,0.08)',
              border: '1px solid rgba(124,58,237,0.25)',
              minWidth: 46,
              padding: '4px 8px',
            }}
          >
            <span
              className="text-[8px] uppercase tracking-[0.16em] font-bold leading-none mb-0.5"
              style={{ color: 'var(--gem-gray-50)', opacity: 0.85 }}
            >
              Score
            </span>
            <span
              className="font-bold leading-none text-[var(--gem-gray-50)]"
              style={{ fontSize: 17 }}
            >
              78
            </span>
          </div>
        </div>
        <div
          className="rounded-lg px-2.5 py-2 mb-2.5"
          style={{
            background:
              'linear-gradient(135deg, rgba(212,160,23,0.10), #fff 70%)',
            border: '1px solid rgba(212,160,23,0.30)',
          }}
        >
          <div
            className="text-[8px] font-bold uppercase mb-1"
            style={{ letterSpacing: '0.16em', color: '#92710f' }}
          >
            Headline
          </div>
          <p
            className="text-[10.5px] font-semibold m-0 leading-[1.3] text-[var(--gem-gray-50)]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            A New Jersey mob boss in therapy races to hide panic attacks before
            family and rivals expose him.
          </p>
        </div>
        <div>
          <div
            className="text-[8px] font-bold uppercase mb-1"
            style={{ letterSpacing: '0.16em', color: 'var(--gem-accent)' }}
          >
            Why this is a hit
          </div>
          <ol className="list-none p-0 m-0 space-y-1">
            <HeroWhyRow n="01" text="The premise is a built-in engine" />
            <HeroWhyRow n="02" text="Tony is a star-making contradiction" />
          </ol>
        </div>
      </div>

      {/* Connector — short downward arrow with "matched" label */}
      <div
        aria-hidden
        className="relative my-2 flex items-center justify-center"
      >
        <span
          className="absolute left-1/2 top-0 bottom-0 -translate-x-1/2 w-px"
          style={{ background: 'var(--gem-gray-700)' }}
        />
        <span
          className="relative inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[9.5px] font-bold uppercase tracking-[0.16em]"
          style={{
            background: 'var(--gem-black)',
            color: 'var(--gem-accent)',
            border: '1px solid rgba(124,58,237,0.30)',
          }}
        >
          <span
            className="inline-block w-1 h-1 rounded-full"
            style={{ background: '#16a34a' }}
          />
          matched
        </span>
      </div>

      {/* Bottom — producer reach-out card */}
      <div
        className="relative rounded-2xl p-4"
        style={{
          background: '#fff',
          border: '1px solid var(--gem-gray-700)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
          transform: 'rotate(1deg)',
        }}
      >
        <div className="flex items-center justify-between mb-2.5">
          <p
            className="text-[9px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0"
          >
            Industry inbox
          </p>
          <span className="text-[8.5px] italic" style={{ color: 'var(--gem-gray-500)' }}>
            demo
          </span>
        </div>
        <div className="space-y-1.5">
          <HeroProducerRow name="Lena Park" company="Westview Pictures" status="interested" />
          <HeroProducerRow name="Marcus Hill" company="Lighthouse Studios" status="reached out" />
        </div>
      </div>
    </div>
  )
}

function HeroWhyRow({ n, text }: { n: string; text: string }) {
  return (
    <li className="flex gap-1.5">
      <span className="text-[9.5px] font-bold tabular-nums" style={{ color: 'var(--gem-gold)' }}>
        {n}
      </span>
      <p className="text-[10.5px] font-medium m-0 leading-[1.3] text-[var(--gem-gray-100)]">
        {text}
      </p>
    </li>
  )
}

function HeroProducerRow({
  name,
  company,
  status,
}: {
  name: string
  company: string
  status: 'interested' | 'reached out'
}) {
  const accent = status === 'reached out' ? 'var(--gem-accent)' : '#16a34a'
  return (
    <div
      className="rounded-lg px-2.5 py-1.5 flex items-center justify-between gap-2"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-semibold m-0 text-[var(--gem-gray-50)] truncate leading-tight">
          {name}
          <span className="text-[var(--gem-gray-400)] font-normal"> · {company}</span>
        </p>
      </div>
      <span
        className="shrink-0 text-[8.5px] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded"
        style={{
          color: accent,
          background:
            status === 'reached out'
              ? 'rgba(124,58,237,0.10)'
              : 'rgba(22,163,74,0.10)',
        }}
      >
        {status === 'reached out' ? 'Reached out' : 'Interested'}
      </span>
    </div>
  )
}
