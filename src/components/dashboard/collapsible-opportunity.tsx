'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createBrowserClient } from '@supabase/ssr'

const supabase = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

interface QScript {
  id: string
  title: string
  score: number | null
  evaluationId: string
}

interface Props {
  opportunityId: string
  title: string
  slug: string
  dealType: string | null
  perspective: string | null
  deadline: string | null
  qualifyingScripts: QScript[]
  dealTypeLabels: Record<string, string>
  perspectiveLabels: Record<string, string>
  atLimit: boolean
  /** Whether the writer has an active Pro subscription */
  isPro?: boolean
  /** Days until monthly submission limit resets */
  resetDaysLeft?: number
}

export function CollapsibleOpportunity({
  opportunityId, title, slug, dealType, perspective, deadline,
  qualifyingScripts, dealTypeLabels, perspectiveLabels, atLimit, isPro = true, resetDaysLeft,
}: Props) {
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<Set<string>>(new Set())
  const router = useRouter()

  const daysLeft = deadline
    ? Math.ceil((new Date(deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null

  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(scriptId: string) {
    setSubmitting(scriptId)
    setError(null)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Please sign in'); setSubmitting(null); return }

    // Try insert first; if unique constraint fails, upsert the withdrawn row
    const { error: insertErr } = await supabase
      .from('opportunity_submissions')
      .insert({
        opportunity_id: opportunityId,
        submission_id: scriptId,
        writer_id: user.id,
        status: 'pending',
      })

    if (insertErr) {
      if (insertErr.code === '23505') {
        // Already exists (likely withdrawn) — update status back to pending
        const { error: updateErr } = await supabase
          .from('opportunity_submissions')
          .update({ status: 'pending', feedback: null, next_steps: null, reviewed_at: null })
          .eq('opportunity_id', opportunityId)
          .eq('submission_id', scriptId)
          .eq('writer_id', user.id)

        if (updateErr) {
          setError('Could not resubmit')
          setSubmitting(null)
          return
        }
      } else {
        setError(insertErr.message)
        setSubmitting(null)
        return
      }
    }

    setSubmitting(null)
    setSubmitted(prev => new Set(prev).add(scriptId))
    router.refresh()
  }

  const visibleScripts = qualifyingScripts.filter(s => !submitted.has(s.id))
  const count = qualifyingScripts.length

  return (
    <div className="px-4 py-3.5 border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 text-left"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-gray-900 m-0 truncate">{title}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            {dealType && (
              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                {dealTypeLabels[dealType] ?? dealType}
              </span>
            )}
            {perspective && (
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-full">
                {perspectiveLabels[perspective] ?? perspective}
              </span>
            )}
            {daysLeft != null && daysLeft > 0 && (
              <span className={`text-[10.5px] font-medium ${daysLeft <= 7 ? 'text-red-400' : 'text-gray-300'}`}>
                {daysLeft}d left
              </span>
            )}
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
          {count} {count === 1 ? 'script qualifies' : 'scripts qualify'}
        </span>
      </button>

      {open && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          {visibleScripts.slice(0, 5).map((s, i) => (
            <div key={s.id} className={`flex items-center justify-between py-2 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
              <div className="flex items-center gap-2 min-w-0">
                <div className="shrink-0 w-7 h-7 rounded-md flex items-center justify-center" style={{
                  background: s.score != null && s.score >= 75 ? 'rgba(124,58,237,0.08)' : 'rgba(107,114,128,0.06)',
                }}>
                  {s.score != null ? (
                    <span className="text-[12px] font-bold" style={{
                      color: s.score >= 75 ? '#7c3aed' : '#6b7280',
                      ...(!isPro ? { filter: 'blur(6px)', userSelect: 'none' as const } : {}),
                    }}>
                      {Math.round(s.score)}
                    </span>
                  ) : (
                    <span className="text-[10px] text-gray-300">&mdash;</span>
                  )}
                </div>
                <span className="text-[13px] text-gray-900 truncate">{s.title}</span>
              </div>
              {isPro ? (
                <button
                  onClick={(e) => { e.stopPropagation(); handleSubmit(s.id) }}
                  disabled={submitting === s.id || atLimit}
                  className="shrink-0 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 px-3 py-1 rounded-md transition-colors"
                >
                  {submitting === s.id ? '…' : atLimit ? (resetDaysLeft ? `Resets in ${resetDaysLeft}d` : 'Limit reached') : 'Submit'}
                </button>
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal')) }}
                  className="shrink-0 text-[11px] font-bold text-gray-400 bg-gray-100 px-3 py-1 rounded-md transition-colors hover:bg-gray-200 flex items-center gap-1"
                >
                  <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.5V4a2 2 0 114 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
                  Pro
                </button>
              )}
            </div>
          ))}
          {visibleScripts.length > 5 && (
            <p className="text-[11px] text-gray-400 text-center mt-2 m-0">
              <Link href={`/opportunities/${slug}`} className="text-purple-600 hover:text-purple-800">
                + {visibleScripts.length - 5} more qualifying scripts
              </Link>
            </p>
          )}
          {error && (
            <p className="text-[11px] text-red-500 text-center mt-2 m-0">{error}</p>
          )}
          {submitted.size > 0 && (
            <p className="text-[11px] text-emerald-600 text-center mt-2 m-0 font-medium">
              {submitted.size} submitted
            </p>
          )}
        </div>
      )}
    </div>
  )
}
