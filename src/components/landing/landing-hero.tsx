// Landing hero — client component.
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
      className="relative px-6 sm:px-8 pt-14 pb-12 sm:pt-20 sm:pb-16"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(212,160,23,0.06) 0%, transparent 60%)',
      }}
    >
      <div className="max-w-5xl mx-auto grid grid-cols-1 sm:grid-cols-[1fr_0.95fr] gap-8 sm:gap-10 items-center">
        {/* LEFT — copy + action */}
        <div>
          <div
            className="text-[11px] tracking-[0.32em] uppercase font-semibold mb-4"
            style={{ color: 'var(--gem-gold)' }}
          >
            For Screenwriters
          </div>
          <h1
            className="font-semibold leading-[1.05] tracking-tight mb-4 text-[var(--gem-gray-50)]"
            style={{
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontSize: 'clamp(32px, 5vw, 44px)',
            }}
          >
            Score your screenplay.<br />
            Get notes.<br />
            Get discovered.
          </h1>
          <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-relaxed mb-6 max-w-[540px]">
            Upload your PDF. Get a full read of your script — plus a path to
            producers actively browsing Discover.
          </p>

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
            <div className="flex-1 min-w-0">
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
          <p className="text-center text-[12px] text-[var(--gem-gray-500)] m-0">
            First read free · No credit card
          </p>

          {error && (
            <div
              className="mt-3 rounded-lg px-3.5 py-2.5 text-[13px]"
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

        {/* RIGHT — sample report preview. On mobile this falls below the
            upload block (grid stacks to one column) — still visible because
            the card is strong visual proof of what comes back. */}
        <div className="relative min-h-[240px] sm:min-h-[300px] mt-2 sm:mt-0">
          <FloatingReportCard />
        </div>
      </div>
    </section>
  )
}

function FloatingReportCard() {
  return (
    <div
      className="landing-float-card relative rounded-2xl p-5"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 18px 40px rgba(0,0,0,0.08), 0 4px 12px rgba(0,0,0,0.04)',
        transform: 'rotate(-1deg)',
      }}
    >
      <div
        className="flex items-center justify-between mb-3 pb-3"
        style={{ borderBottom: '1px solid var(--gem-gray-800)' }}
      >
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ background: '#16a34a' }} />
          <span
            className="text-[10px] font-bold uppercase"
            style={{ letterSpacing: '0.18em', color: 'var(--gem-gray-500)' }}
          >
            Sample Report
          </span>
        </div>
        <span className="text-[10px] italic" style={{ color: 'var(--gem-gray-500)' }}>
          demo
        </span>
      </div>
      <div
        className="rounded-xl p-4 mb-2.5"
        style={{
          background:
            'linear-gradient(135deg, rgba(212,160,23,0.08), #fff 70%)',
          border: '1px solid rgba(212,160,23,0.3)',
        }}
      >
        <div
          className="text-[9px] font-bold uppercase mb-1"
          style={{ letterSpacing: '0.18em', color: '#92710f' }}
        >
          Commercial Potential
        </div>
        <div className="flex items-baseline gap-1 mb-1.5">
          <span
            className="text-[34px] font-bold leading-none"
            style={{ color: 'var(--gem-gold)', fontFamily: 'Georgia, serif' }}
          >
            78.4
          </span>
          <span className="text-[11px]" style={{ color: 'var(--gem-gray-400)' }}>
            /100
          </span>
        </div>
        <div
          className="h-1 rounded-full overflow-hidden"
          style={{ background: 'var(--gem-gray-800)' }}
        >
          <div
            className="h-full"
            style={{
              width: '78%',
              background: 'linear-gradient(90deg, #22c55e, var(--gem-gold))',
            }}
          />
        </div>
      </div>
      <div
        className="pl-2.5 py-2 mb-2.5"
        style={{ borderLeft: '2px solid var(--gem-gold)' }}
      >
        <div
          className="text-[9px] font-bold uppercase mb-1"
          style={{ letterSpacing: '0.18em', color: '#92710f' }}
        >
          Headline
        </div>
        <p
          className="text-[12px] font-semibold m-0 leading-[1.4] text-[var(--gem-gray-50)]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          A weather forecaster predicting his own town&apos;s end races to
          convince the people he loves before the storm proves him right.
        </p>
      </div>
      <div>
        <div
          className="text-[9px] font-bold uppercase mb-1.5"
          style={{ letterSpacing: '0.18em', color: 'var(--gem-accent)' }}
        >
          Why this can be a hit
        </div>
        <div className="flex flex-col gap-1">
          <div className="flex gap-1.5">
            <span
              className="text-[10px] font-bold"
              style={{ color: 'var(--gem-gold)' }}
            >
              01
            </span>
            <p
              className="text-[11px] font-medium m-0 leading-[1.4] text-[var(--gem-gray-100)]"
            >
              A contained-disaster setup that reads premium without scope
            </p>
          </div>
          <div className="flex gap-1.5">
            <span
              className="text-[10px] font-bold"
              style={{ color: 'var(--gem-gold)' }}
            >
              02
            </span>
            <p
              className="text-[11px] font-medium m-0 leading-[1.4] text-[var(--gem-gray-100)]"
            >
              Lead role that gives a veteran actor late-career heat
            </p>
          </div>
        </div>
      </div>
      <style jsx>{`
        .landing-float-card {
          animation: float 5s ease-in-out infinite;
        }
        @keyframes float {
          0%,
          100% {
            transform: translateY(0) rotate(-1deg);
          }
          50% {
            transform: translateY(-4px) rotate(-1deg);
          }
        }
      `}</style>
    </div>
  )
}
