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
      className="relative px-6 sm:px-8 pt-16 pb-14 sm:pt-24 sm:pb-20"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(212,160,23,0.06) 0%, transparent 60%)',
      }}
    >
      <div className="max-w-3xl mx-auto text-center">
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
            fontSize: 'clamp(34px, 6vw, 54px)',
          }}
        >
          We connect promising writers
          <br className="hidden sm:block" /> to the industry.
        </h1>
        <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-300)] leading-relaxed mb-8 max-w-[560px] mx-auto">
          Upload your screenplay. Selznick reads it like a producer would
          and gives you a structured report. If it qualifies, our industry
          partners reach out directly. First read on us.
        </p>

        <div className="max-w-[460px] mx-auto">
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
    </section>
  )
}
