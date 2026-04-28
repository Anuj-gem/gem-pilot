'use client'

// ProducerIntroButton — replaces the old mailto-based EmailWriterButton.
//
// The writer's email is no longer exposed to the producer. Instead, the
// producer types a short note (optional) and hits Send Intro; we POST to
// /api/partner/match/[matchId]/intro which fires a Postmark transactional
// email to the writer with the producer's email set as Reply-To. When the
// writer hits Reply, they go straight into the producer's inbox.
//
// States:
//   - idle:    "Send intro" button + collapsed
//   - open:    textarea + Send button (with optional note, max 2000)
//   - sending: spinner inside the Send button, controls disabled
//   - sent:    "Intro sent ✓" affordance, button locked. The
//              `producer_emailed_at` timestamp surfaced from the server.

import { useState } from 'react'
import { Mail, Check, Loader2, Send } from 'lucide-react'

interface Props {
  matchId: string
  /** If non-null on initial render, the producer has already sent the
   *  intro and we go straight to the "sent" state. */
  producerEmailedAt: string | null
}

export function ProducerIntroButton({ matchId, producerEmailedAt }: Props) {
  const [sent, setSent] = useState<boolean>(!!producerEmailedAt)
  const [open, setOpen] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (sent) {
    return (
      <span
        className="inline-flex items-center gap-2 rounded-lg font-semibold text-[14px] px-4 py-2.5 shrink-0"
        style={{
          background: 'rgba(5,150,105,0.08)',
          border: '1px solid rgba(5,150,105,0.30)',
          color: '#059669',
        }}
      >
        <Check size={15} strokeWidth={2.5} />
        Intro sent
      </span>
    )
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg font-semibold text-white px-5 py-2.5 text-[14px] transition-all duration-150 hover:brightness-110 active:scale-[0.97] shrink-0"
        style={{
          background: 'var(--gem-accent)',
          boxShadow: '0 2px 8px rgba(124,58,237,0.25)',
        }}
      >
        <Mail size={15} strokeWidth={2.25} />
        Send intro
      </button>
    )
  }

  async function handleSend() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`/api/partner/match/${matchId}/intro`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: note }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json?.error || 'Could not send the intro.')
      }
      setSent(true)
      setOpen(false)
      setNote('')
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Something went wrong.'
      setError(msg)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      className="rounded-xl p-4 w-full"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <p className="text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-2">
        Send your intro to the writer
      </p>
      <p className="text-[13px] text-[var(--gem-gray-400)] m-0 mb-3 leading-snug">
        Add a short note (optional). We&apos;ll send your intro by email — the
        writer can hit Reply to land in your inbox directly.
      </p>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={4}
        maxLength={2000}
        disabled={busy}
        placeholder="What hooked you about the script — or what kind of follow-up makes sense (a meeting, a phone call, a script note)."
        className="w-full text-[14px] leading-snug"
        style={{
          border: '1px solid var(--gem-gray-700)',
          borderRadius: 8,
          padding: '10px 12px',
        }}
      />
      <div className="flex items-center justify-between gap-2 mt-2 flex-wrap">
        <span className="text-[11px] text-[var(--gem-gray-500)]">
          {note.length}/2000
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setOpen(false)
              setNote('')
              setError(null)
            }}
            disabled={busy}
            className="text-[12.5px] font-medium text-[var(--gem-gray-500)] hover:text-[var(--gem-gray-200)]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-md font-semibold text-white px-3.5 py-2 text-[13px] disabled:opacity-50"
            style={{ background: 'var(--gem-accent)' }}
          >
            {busy ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <Send size={14} strokeWidth={2.25} />
            )}
            Send intro
          </button>
        </div>
      </div>
      {error && (
        <p className="mt-2 text-[12.5px] text-red-600 m-0">{error}</p>
      )}
    </div>
  )
}
