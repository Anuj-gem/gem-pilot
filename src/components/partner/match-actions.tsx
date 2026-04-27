'use client'

// MatchActions — interested / pass / comment row used on both the dashboard
// cards and the script detail page. Manages local pending state per action,
// fires POST /api/partner/match/[id]/react, and refreshes the router on
// success so the parent re-fetches the updated row.

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Check, X, MessageCircle, Loader2 } from 'lucide-react'

type Variant = 'card' | 'hero' | 'detail'

type Status = 'pending' | 'opened' | 'interested' | 'passed' | 'commented'

interface Props {
  matchId: string
  status: Status
  variant?: Variant
  /**
   * If true, the comment button opens an inline textarea instead of a modal.
   * Cards use the inline textarea; the detail page uses a modal.
   */
  inlineComment?: boolean
  /**
   * When true, hide the Comment button entirely. Used by the gated detail
   * page (pre-Interested) and any list card where messaging happens through
   * the post-Interested message thread instead of a single comment field.
   * Defaults to true now that messaging is the main thread surface.
   */
  hideComment?: boolean
}

export function MatchActions({
  matchId,
  status,
  variant = 'card',
  inlineComment = true,
  hideComment = true,
}: Props) {
  const router = useRouter()
  const [busy, setBusy] = useState<null | 'interested' | 'pass' | 'comment'>(null)
  const [error, setError] = useState<string | null>(null)
  const [commentOpen, setCommentOpen] = useState(false)
  const [commentText, setCommentText] = useState('')

  // Once the producer has reacted, lock the row visually so they don't keep
  // double-tapping. They can still see the comment if they wrote one.
  const reacted = status === 'interested' || status === 'passed' || status === 'commented'

  async function react(action: 'interested' | 'pass' | 'comment', text?: string) {
    setBusy(action)
    setError(null)
    try {
      const res = await fetch(`/api/partner/match/${matchId}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, text }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Could not save your response.')
      }
      setCommentOpen(false)
      setCommentText('')
      router.refresh()
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setError(msg)
    } finally {
      setBusy(null)
    }
  }

  const isHero = variant === 'hero' || variant === 'detail'
  const btnSize = isHero
    ? 'text-[13.5px] px-4 py-2.5'
    : 'text-[13px] px-3.5 py-2'

  // Pill that surfaces the current state once a producer has reacted. We
  // keep the action buttons mounted underneath in case they want to revise
  // (e.g. switch from passed → interested), which the API supports.
  const StatePill = () => {
    if (status === 'interested') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-semibold ${btnSize}`}
          style={{
            background: 'rgba(5,150,105,0.10)',
            border: '1px solid rgba(5,150,105,0.35)',
            color: '#059669',
          }}
        >
          <Check size={14} strokeWidth={2.5} /> You&apos;re interested
        </span>
      )
    }
    if (status === 'passed') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-medium ${btnSize}`}
          style={{
            background: 'var(--gem-gray-900)',
            border: '1px solid var(--gem-gray-700)',
            color: 'var(--gem-gray-400)',
          }}
        >
          <X size={14} /> Passed
        </span>
      )
    }
    if (status === 'commented') {
      return (
        <span
          className={`inline-flex items-center gap-1.5 rounded-md font-semibold ${btnSize}`}
          style={{
            background: 'rgba(124,58,237,0.10)',
            border: '1px solid rgba(124,58,237,0.30)',
            color: 'var(--gem-accent)',
          }}
        >
          <MessageCircle size={14} /> Comment sent
        </span>
      )
    }
    return null
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 flex-wrap">
        {reacted ? <StatePill /> : null}

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => react('interested')}
          className={`inline-flex items-center gap-1.5 rounded-md font-semibold text-white transition-colors disabled:opacity-60 ${btnSize}`}
          style={{
            background:
              status === 'interested' ? 'var(--gem-accent-hover)' : 'var(--gem-accent)',
            border: '1px solid var(--gem-accent)',
          }}
        >
          {busy === 'interested' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Check size={14} strokeWidth={2.5} />
          )}
          Interested
        </button>

        <button
          type="button"
          disabled={busy !== null}
          onClick={() => react('pass')}
          className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-60 ${btnSize}`}
          style={{
            background: '#fff',
            border: '1px solid var(--gem-gray-700)',
            color: 'var(--gem-gray-300)',
          }}
        >
          {busy === 'pass' ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <X size={14} />
          )}
          Pass
        </button>

        {!hideComment && (
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => setCommentOpen((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-60 ml-auto ${btnSize}`}
            style={{
              background: '#fff',
              border: '1px solid var(--gem-gray-700)',
              color: 'var(--gem-gray-200)',
            }}
          >
            <MessageCircle size={14} />
            Comment
          </button>
        )}
      </div>

      {commentOpen && !hideComment && (
        <div className="mt-3 rounded-lg p-3" style={{ border: '1px solid var(--gem-gray-700)', background: '#fff' }}>
          <textarea
            value={commentText}
            onChange={(e) => setCommentText(e.target.value)}
            rows={inlineComment ? 3 : 5}
            placeholder="Note for the writer — what hooked you, what you'd want to see, what kind of follow-up makes sense."
            className="w-full text-sm"
            style={{ border: '1px solid var(--gem-gray-700)', borderRadius: 8, padding: '10px 12px' }}
            maxLength={2000}
          />
          <div className="flex items-center gap-2 mt-2">
            <span className="text-[11px] text-[var(--gem-gray-400)]">
              {commentText.length}/2000
            </span>
            <button
              type="button"
              disabled={busy !== null || commentText.trim().length < 5}
              onClick={() => react('comment', commentText)}
              className="ml-auto inline-flex items-center gap-1.5 rounded-md font-semibold text-white px-3.5 py-2 text-[13px] disabled:opacity-50"
              style={{ background: 'var(--gem-accent)' }}
            >
              {busy === 'comment' ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <MessageCircle size={14} />
              )}
              Send to writer
            </button>
            <button
              type="button"
              onClick={() => {
                setCommentOpen(false)
                setCommentText('')
              }}
              className="text-[12px] text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-200)]"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="mt-2 text-[12px] text-red-600 m-0">{error}</p>
      )}
    </div>
  )
}
