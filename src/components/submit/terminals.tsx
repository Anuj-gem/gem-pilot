// Terminal screens for the guided submit flow.
//   - ScoringTerminal: PDF in flight, waiting for the eval to finish so we
//     can route them to /report/[id]. Shown to authenticated users.
//   - DraftSavedTerminal: account just created, no PDF yet. Two next moves
//     (upload now / come back later) — never trap the writer.
'use client'

import { Loader2, Check, Upload } from 'lucide-react'

export function ScoringTerminal({ progressLabel }: { progressLabel?: string }) {
  return (
    <div className="max-w-[440px] mx-auto px-6 py-14 text-center">
      <div
        className="w-16 h-16 rounded-full mx-auto mb-6 grid place-items-center"
        style={{
          background: 'rgba(124,58,237,0.06)',
          border: '1px solid var(--gem-gray-700)',
        }}
      >
        <Loader2
          size={28}
          className="animate-spin"
          style={{ color: 'var(--gem-accent)' }}
        />
      </div>
      <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight leading-[1.15] text-[var(--gem-gray-50)] m-0 mb-2">
        Reading your script…
      </h2>
      <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-300)] leading-[1.55] m-0 mb-5">
        {progressLabel ?? "We're scoring across ten craft dimensions. About 30 seconds."}
      </p>
      <div
        className="h-1.5 rounded-full overflow-hidden mx-auto max-w-[300px] mb-4 relative"
        style={{ background: 'var(--gem-gray-800)' }}
      >
        {/* Forward-only fill — reaches 92% over ~35s and pauses there until
            the eval actually returns. Avoids the bouncy back-and-forth that
            implies the progress is going backwards. */}
        <div
          className="h-full rounded-full"
          style={{
            background: 'var(--gem-accent)',
            width: '4%',
            animation: 'scoring-progress 35s cubic-bezier(0.2, 0.8, 0.3, 1) forwards',
          }}
        />
      </div>
      <p className="text-[12px] text-[var(--gem-gray-500)] m-0">
        Hang tight — we&apos;ll redirect to your report when it&apos;s ready.
      </p>
      <style jsx>{`
        @keyframes scoring-progress {
          0% { width: 4%; }
          100% { width: 92%; }
        }
      `}</style>
    </div>
  )
}

export function DraftSavedTerminal({
  onUploadNow,
  onLater,
}: {
  onUploadNow: () => void
  onLater: () => void
}) {
  return (
    <div className="max-w-[440px] mx-auto px-6 py-12">
      <div
        className="w-14 h-14 rounded-2xl grid place-items-center mx-auto mb-5"
        style={{
          background: 'rgba(212,160,23,0.10)',
          border: '1px solid rgba(212,160,23,0.4)',
          color: 'var(--gem-gold)',
        }}
      >
        <Check size={26} strokeWidth={2.5} />
      </div>
      <h2 className="text-[24px] sm:text-[28px] font-bold tracking-tight leading-[1.15] text-[var(--gem-gray-50)] m-0 mb-2 text-center">
        Your draft is saved.
      </h2>
      <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-300)] leading-[1.55] m-0 mb-7 text-center">
        Drop in your PDF anytime to unlock your full GEM read — score, notes, and
        the pitch a producer would write.
      </p>
      <button
        type="button"
        onClick={onUploadNow}
        className="w-full rounded-xl px-4 py-3.5 text-[15px] font-semibold text-white mb-2.5 flex items-center justify-center gap-2 transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
        style={{ background: 'var(--gem-accent)' }}
      >
        <Upload size={16} />
        Upload my script now
      </button>
      <button
        type="button"
        onClick={onLater}
        className="w-full rounded-xl px-4 py-3 text-[14px] font-medium text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] hover:bg-[var(--gem-gray-900)] transition-all duration-150 active:scale-[0.985]"
        style={{ background: 'transparent', border: '1px solid var(--gem-gray-700)' }}
      >
        I&apos;ll come back later
      </button>
      <p className="text-center text-[12px] text-[var(--gem-gray-500)] mt-5 m-0">
        We&apos;ll email you a reminder in a few days.
      </p>
    </div>
  )
}
