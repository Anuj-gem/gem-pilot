'use client'

// UnmatchButton — writer-side. Subtle text trigger ("Unmatch") that opens
// an inline modal with a small reason picker + optional free-text field.
// Confirms with a red Unmatch button. POSTs to
// /api/writer/match/[id]/unmatch and refreshes the router on success so
// the row drops out of the writer's view.

import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Loader2, X } from 'lucide-react'

interface Props {
  matchId: string
}

const PRESET_REASONS = [
  'No response',
  'Lost interest',
  'Other',
] as const

type PresetReason = (typeof PRESET_REASONS)[number]

export function UnmatchButton({ matchId }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [reason, setReason] = useState<PresetReason>('No response')
  const [note, setNote] = useState('')
  const [error, setError] = useState<string | null>(null)

  // Lock body scroll while the modal is up — same pattern as the upgrade
  // modal listener used elsewhere in the dashboard.
  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  async function submit() {
    setBusy(true)
    setError(null)
    try {
      // Combine preset + free text into a single stored reason.
      const finalReason = note.trim() ? `${reason} — ${note.trim()}` : reason
      const res = await fetch(`/api/writer/match/${matchId}/unmatch`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: finalReason }),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(json.error || 'Could not unmatch.')
      }
      setOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[12px] font-medium text-[var(--gem-gray-500)] hover:text-red-600 transition-colors"
        title="End this match"
      >
        Unmatch
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 grid place-items-center px-4"
          style={{ background: 'rgba(15,15,15,0.55)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false)
          }}
        >
          <div
            className="relative w-full max-w-md rounded-2xl bg-white p-6"
            style={{
              border: '1px solid var(--gem-gray-700)',
              boxShadow: '0 12px 40px rgba(0,0,0,0.18)',
            }}
          >
            <button
              type="button"
              onClick={() => !busy && setOpen(false)}
              className="absolute top-3 right-3 p-1 text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-200)]"
              aria-label="Close"
            >
              <X size={16} />
            </button>

            <h3 className="text-[18px] font-extrabold tracking-tight text-[var(--gem-gray-50)] m-0 mb-1">
              Unmatch with this producer?
            </h3>
            <p className="text-[13.5px] text-[var(--gem-gray-400)] m-0 mb-4 leading-snug">
              They&apos;ll see this match was ended and your reason if you
              share one. The script stays on your dashboard.
            </p>

            <div className="space-y-2 mb-3">
              {PRESET_REASONS.map((r) => (
                <label
                  key={r}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg cursor-pointer transition-colors"
                  style={{
                    border: `1px solid ${reason === r ? 'var(--gem-accent)' : 'var(--gem-gray-700)'}`,
                    background:
                      reason === r ? 'rgba(124,58,237,0.06)' : '#fff',
                  }}
                >
                  <input
                    type="radio"
                    name="unmatch-reason"
                    value={r}
                    checked={reason === r}
                    onChange={() => setReason(r)}
                    className="accent-[var(--gem-accent)]"
                  />
                  <span className="text-[13.5px] font-medium text-[var(--gem-gray-100)]">
                    {r}
                  </span>
                </label>
              ))}
            </div>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Optional — a short note (private to GEM)."
              className="w-full text-[13.5px] mb-4"
              style={{
                border: '1px solid var(--gem-gray-700)',
                borderRadius: 8,
                padding: '8px 10px',
              }}
              maxLength={500}
              disabled={busy}
            />

            {error && (
              <p className="text-[12.5px] text-red-600 mb-3 m-0">{error}</p>
            )}

            <div className="flex items-center gap-2 justify-end">
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                className="text-[13px] font-medium text-[var(--gem-gray-500)] hover:text-[var(--gem-gray-200)] px-3 py-2"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={submit}
                className="inline-flex items-center gap-1.5 rounded-md font-semibold text-white px-4 py-2 text-[13px] disabled:opacity-60"
                style={{ background: '#dc2626' }}
              >
                {busy && <Loader2 size={14} className="animate-spin" />}
                Unmatch
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
