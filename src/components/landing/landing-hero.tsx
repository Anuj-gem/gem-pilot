// Landing hero — client component.
//
// Anuj 2026-04-30 v0.11.0 — community-first relaunch. The headline
// promises identity ("Where screenwriters get seen.") and the page
// flows into the four-step Arc + three product pillars. The PDF
// drop-zone is still here as the secondary path for writers who
// want to dive in with a script; "Join free" is the primary CTA.
//
// Two ways in from here:
//   1) Click "Join free" → /onboarding (account → privacy → profile
//      → dashboard).
//   2) Drop / pick a PDF → /submit?from=hero (account → privacy →
//      profile → report).
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
    try { trackHeroUpload() } catch {}
    router.push('/submit?from=hero')
  }

  function handleJoinClick() {
    try {
      trackEvent('cta_clicked', { location: 'hero', label: 'Join free' })
    } catch {}
    router.push('/onboarding')
  }

  return (
    <section
      className="relative px-6 sm:px-8 pt-16 pb-16 sm:pt-24 sm:pb-20"
      style={{
        background:
          'radial-gradient(ellipse at 50% 0%, rgba(124,58,237,0.10) 0%, transparent 65%)',
      }}
    >
      <div className="max-w-3xl mx-auto text-center">
        <p
          className="text-[11px] tracking-[0.32em] uppercase font-semibold mb-5"
          style={{ color: 'var(--gem-gold)' }}
        >
          For screenwriters
        </p>

        <h1
          className="font-semibold leading-[1.05] tracking-tight mb-5 text-[var(--gem-gray-50)]"
          style={{
            fontFamily: 'Georgia, "Times New Roman", serif',
            fontSize: 'clamp(38px, 6vw, 60px)',
          }}
        >
          Where screenwriters
          <br className="hidden sm:block" /> get seen.
        </h1>

        <p className="text-[16px] sm:text-[18px] text-[var(--gem-gray-300)] leading-relaxed mb-10 max-w-[640px] mx-auto">
          Post a script. Get a producer-grade read in a minute, real notes
          from other writers, and a profile the industry can find.
        </p>

        {/* Primary CTA */}
        <div className="max-w-[360px] mx-auto mb-3">
          <button
            id="landing-hero-cta-anchor"
            type="button"
            onClick={handleJoinClick}
            className="w-full rounded-xl px-4 py-4 text-[16px] font-semibold text-white flex items-center justify-center gap-2 transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
            }}
          >
            Join free <ArrowRight size={16} />
          </button>
        </div>
        <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mb-8">
          Free to start · No card needed
        </p>

        {/* Secondary path — drop zone, visually demoted from the
            primary CTA but still present for writers who want to
            dive in with a script in hand. */}
        <div className="max-w-[460px] mx-auto">
          <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] mb-3">
            Or start with your script
          </p>
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              const f = e.dataTransfer.files?.[0]
              if (f) acceptFile(f)
            }}
            className="flex items-center gap-3 p-3.5 rounded-xl cursor-pointer transition-all duration-150"
            style={{
              border: dragOver
                ? '2px dashed var(--gem-accent)'
                : '1px dashed var(--gem-gray-600)',
              background: dragOver
                ? 'rgba(124,58,237,0.04)'
                : 'transparent',
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
              <p className="text-[13.5px] font-semibold text-[var(--gem-gray-100)] m-0 leading-tight">
                Drop a PDF and start with a review.
              </p>
              <p className="text-[11px] text-[var(--gem-gray-500)] m-0 mt-0.5">
                or{' '}
                <span style={{ color: 'var(--gem-accent)', textDecoration: 'underline' }}>
                  choose a file
                </span>
              </p>
            </div>
          </label>

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
