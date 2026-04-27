'use client'

// MessageThread — shared client component for the producer/writer comment
// thread on a script_matches row. Renders the messages array (oldest first)
// and lets the current user post a new reply. The `viewerRole` prop decides
// which API endpoint to hit and which side's bubble styling to use:
//   - 'producer' → POST /api/partner/match/[id]/react with action='message'
//   - 'writer'   → POST /api/writer/match/[id]/message
//
// Visual: producer bubbles right-aligned (violet), writer bubbles
// left-aligned (white card). When the viewer is the producer, *their*
// messages still appear right-aligned — the alignment cue is "self vs other"
// rather than fixed-by-role.

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Loader2, Send } from 'lucide-react'

export interface ThreadMessage {
  sender_role: 'producer' | 'writer'
  text: string
  at: string // ISO
}

interface Props {
  matchId: string
  viewerRole: 'producer' | 'writer'
  messages: ThreadMessage[]
  /** When true, the input is disabled with a hint — used for unmatched rows. */
  disabled?: boolean
  disabledHint?: string
}

function fmtWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  // "Apr 23, 2:14pm" — short and good for a chat row.
  const date = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  const time = d
    .toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
    .toLowerCase()
    .replace(' ', '')
  return `${date}, ${time}`
}

export function MessageThread({
  matchId,
  viewerRole,
  messages,
  disabled = false,
  disabledHint,
}: Props) {
  const router = useRouter()
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function send() {
    const body = text.trim()
    if (body.length < 1 || body.length > 2000) return
    setBusy(true)
    setError(null)
    try {
      const url =
        viewerRole === 'producer'
          ? `/api/partner/match/${matchId}/react`
          : `/api/writer/match/${matchId}/message`
      const payload =
        viewerRole === 'producer'
          ? { action: 'message', text: body }
          : { text: body }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Could not send your message.')
      }
      setText('')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  const sorted = [...messages].sort(
    (a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()
  )

  return (
    <div className="w-full">
      {sorted.length === 0 ? (
        <div
          className="rounded-lg px-4 py-6 text-center text-[13.5px] text-[var(--gem-gray-400)]"
          style={{
            border: '1px dashed var(--gem-gray-700)',
            background: 'var(--gem-gray-900)',
          }}
        >
          No messages yet — send the first note to{' '}
          {viewerRole === 'producer' ? 'the writer' : 'the producer'}.
        </div>
      ) : (
        <div className="space-y-2.5">
          {sorted.map((m, i) => {
            const isSelf = m.sender_role === viewerRole
            return (
              <div
                key={i}
                className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className="max-w-[85%] sm:max-w-[75%] rounded-2xl px-4 py-2.5"
                  style={
                    isSelf
                      ? {
                          background: 'var(--gem-accent)',
                          color: '#fff',
                          borderBottomRightRadius: 6,
                        }
                      : {
                          background: '#fff',
                          border: '1px solid var(--gem-gray-700)',
                          color: 'var(--gem-gray-100)',
                          borderBottomLeftRadius: 6,
                        }
                  }
                >
                  <p className="text-[14px] leading-snug m-0 whitespace-pre-wrap">
                    {m.text}
                  </p>
                  <p
                    className="text-[10.5px] mt-1 m-0"
                    style={{
                      color: isSelf ? 'rgba(255,255,255,0.78)' : 'var(--gem-gray-500)',
                    }}
                  >
                    {m.sender_role === 'producer' ? 'Producer' : 'Writer'} ·{' '}
                    {fmtWhen(m.at)}
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="mt-4">
        {disabled ? (
          <p className="text-[12.5px] text-[var(--gem-gray-500)] m-0">
            {disabledHint ?? 'This thread is closed.'}
          </p>
        ) : (
          <div
            className="rounded-lg p-2.5"
            style={{ border: '1px solid var(--gem-gray-700)', background: '#fff' }}
          >
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              placeholder={
                viewerRole === 'producer'
                  ? 'Reply to the writer — what hooked you, what you’d want to see next.'
                  : 'Reply to the producer — answer their questions, share next steps.'
              }
              className="w-full text-[14px] resize-y"
              style={{
                border: '1px solid var(--gem-gray-700)',
                borderRadius: 8,
                padding: '10px 12px',
                background: '#fff',
              }}
              maxLength={2000}
              disabled={busy}
            />
            <div className="flex items-center gap-2 mt-2">
              <span className="text-[11px] text-[var(--gem-gray-400)]">
                {text.length}/2000
              </span>
              <button
                type="button"
                disabled={busy || text.trim().length < 1}
                onClick={send}
                className="ml-auto inline-flex items-center gap-1.5 rounded-md font-semibold text-white px-3.5 py-2 text-[13px] disabled:opacity-50"
                style={{ background: 'var(--gem-accent)' }}
              >
                {busy ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Send size={14} />
                )}
                Send
              </button>
            </div>
          </div>
        )}
        {error && (
          <p className="mt-2 text-[12px] text-red-600 m-0">{error}</p>
        )}
      </div>
    </div>
  )
}
