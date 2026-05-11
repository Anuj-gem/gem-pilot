'use client'

// EvaluatingClient — progress bar + signup shown together.
// Signup is visible immediately; progress bar runs in parallel.
// Reads submission ID from the gem_anon_scripts cookie (last entry).

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowRight, FileText, Sparkles, CheckCircle } from 'lucide-react'

export function EvaluatingClient() {
  const router = useRouter()
  const [done, setDone] = useState(false)
  const [title, setTitle] = useState<string | null>(null)
  const [progress, setProgress] = useState(0)
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Read submission ID from cookie + start polling
  useEffect(() => {
    const cookie = document.cookie
      .split('; ')
      .find(c => c.startsWith('gem_anon_scripts='))
      ?.split('=')[1]
    const ids = cookie?.split(',').filter(Boolean) ?? []
    const lastId = ids[ids.length - 1] ?? null

    if (!lastId) {
      router.push('/')
      return
    }

    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/submission-status?id=${lastId}`)
        if (!res.ok) return
        const data = await res.json()
        if (data.title) setTitle(data.title)
        if (data.status === 'completed') {
          setDone(true)
          setProgress(100)
          if (pollRef.current) clearInterval(pollRef.current)
        }
      } catch {}
    }, 2000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [router])

  // Animate progress bar
  useEffect(() => {
    if (done) return
    const timer = setInterval(() => {
      setProgress(p => {
        if (p >= 90) return p
        const increment = p < 30 ? 3 : p < 60 ? 1.5 : 0.5
        return Math.min(p + increment, 90)
      })
    }, 500)
    return () => clearInterval(timer)
  }, [done])

  return (
    <div className="max-w-md mx-auto px-5 pt-20 sm:pt-28 pb-16 text-center">
      {/* ── Progress section ── */}
      <span
        className="inline-flex w-14 h-14 rounded-full items-center justify-center mb-6 transition-all duration-500"
        style={done ? {
          background: 'rgba(22,163,74,0.08)',
          border: '1.5px solid rgba(22,163,74,0.20)',
        } : {
          background: 'rgba(124,58,237,0.08)',
          border: '1.5px solid rgba(124,58,237,0.20)',
        }}
      >
        {done
          ? <CheckCircle size={24} style={{ color: '#16a34a' }} />
          : <Sparkles size={24} style={{ color: 'var(--gem-accent)' }} />
        }
      </span>

      <h1
        className="text-[24px] sm:text-[28px] font-bold tracking-tight mb-3 text-[var(--gem-gray-50)]"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {done ? 'Your evaluation is ready.' : 'Evaluating your script'}
      </h1>

      {title && (
        <p className="text-[14px] font-medium text-[var(--gem-gray-300)] mb-1 flex items-center justify-center gap-2">
          <FileText size={14} className="shrink-0" />
          {title}
        </p>
      )}

      {/* Progress bar */}
      <div className="w-full h-2 rounded-full overflow-hidden mb-2 mt-4" style={{ background: 'var(--gem-gray-800)' }}>
        <div
          className="h-full rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${progress}%`,
            background: done
              ? '#16a34a'
              : 'linear-gradient(90deg, var(--gem-accent), #a78bfa)',
          }}
        />
      </div>
      <p className="text-[12px] text-[var(--gem-gray-500)] tabular-nums mb-10">
        {done ? 'Complete' : `${Math.round(progress)}%`}
      </p>

      {/* ── Signup CTA — always visible ── */}
      <p className="text-[14px] text-[var(--gem-gray-400)] mb-5">
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
    </div>
  )
}
