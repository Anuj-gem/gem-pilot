'use client'

// EvaluatingClient — polls submission status, shows progress, then signup.
// Reads submission ID from the gem_anon_scripts cookie (last entry).

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, FileText, Sparkles, CheckCircle } from 'lucide-react'

type Phase = 'processing' | 'complete'

export function EvaluatingClient() {
  const router = useRouter()
  const [phase, setPhase] = useState<Phase>('processing')
  const [title, setTitle] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const submissionIdRef = useRef<string | null>(null)

  // Read submission ID from cookie
  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find(c => c.startsWith('gem_anon_scripts='))
      ?.split('=')[1]
    const ids = cookie?.split(',').filter(Boolean) ?? []
    const lastId = ids[ids.length - 1] ?? null
    submissionIdRef.current = lastId

    if (!lastId) {
      // No submission found — send to home
      router.push('/')
      return
    }

    // Start polling
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/submission-status?id=${lastId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.title) setTitle(data.title)
        if (data.status === 'completed') {
          setPhase('complete')
          setProgress(100)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {}
    }, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [router])

  // Animate progress bar (visual only — not tied to real progress)
  useEffect(() => {
    if (phase === 'complete') return
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p // Cap at 90 until actually complete
        // Fast at first, slower as it goes
        const increment = p < 30 ? 3 : p < 60 ? 1.5 : 0.5
        return Math.min(p + increment, 90)
      })
    }, 500)
    return () => clearInterval(timer)
  }, [phase])

  return (
    <div className="max-w-md mx-auto px-5 pt-20 sm:pt-28 pb-16 text-center">
      {phase === 'processing' ? (
        <>
          {/* Processing state */}
          <span
            className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-6"
            style={{
              background: 'rgba(124,58,237,0.08)',
              border: '1.5px solid rgba(124,58,237,0.20)',
            }}
          >
            <Sparkles size={24} style={{ color: 'var(--gem-accent)' }} />
          </span>

          <h1
            className="text-[24px] sm:text-[28px] font-bold tracking-tight mb-3 text-[var(--gem-gray-50)]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Evaluating your script
          </h1>

          {title && (
            <p className="text-[14px] font-medium text-[var(--gem-gray-300)] mb-1 flex items-center justify-center gap-2">
              <FileText size={14} className="shrink-0" />
              {title}
            </p>
          )}

          <p className="text-[14px] text-[var(--gem-gray-400)] mb-8">
            This usually takes less than a minute.
          </p>

          {/* Progress bar */}
          <div className="w-full h-2 rounded-full overflow-hidden mb-2" style={{ background: 'var(--gem-gray-800)' }}>
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, var(--gem-accent), #a78bfa)',
              }}
            />
          </div>
          <p className="text-[12px] text-[var(--gem-gray-500)] tabular-nums">
            {Math.round(progress)}%
          </p>
        </>
      ) : (
        <>
          {/* Complete state — prompt signup */}
          <span
            className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-6"
            style={{
              background: 'rgba(22,163,74,0.08)',
              border: '1.5px solid rgba(22,163,74,0.20)',
            }}
          >
            <CheckCircle size={24} style={{ color: '#16a34a' }} />
          </span>

          <h1
            className="text-[24px] sm:text-[28px] font-bold tracking-tight mb-3 text-[var(--gem-gray-50)]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Your evaluation is ready.
          </h1>

          {title && (
            <p className="text-[14px] font-medium text-[var(--gem-gray-300)] mb-1 flex items-center justify-center gap-2">
              <FileText size={14} className="shrink-0" />
              {title}
            </p>
          )}

          <p className="text-[14px] text-[var(--gem-gray-400)] mb-8">
            Create your account to see your full report.
          </p>

          <Link
            href="/start"
            className="w-full inline-flex items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-[15px] font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.985]"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 6px 20px rgba(124,58,237,0.30)',
            }}
          >
            Create your account <ArrowRight size={16} />
          </Link>

          <p className="text-[12px] text-[var(--gem-gray-500)] mt-3">
            Already have an account?{' '}
            <Link href="/login" className="font-semibold" style={{ color: 'var(--gem-accent)' }}>
              Log in
            </Link>
          </p>
        </>
      )}
    </div>
  )
}
