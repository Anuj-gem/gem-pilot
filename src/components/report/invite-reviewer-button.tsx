'use client'

// InviteReviewerButton — top-of-report-page CTA for the script owner.
// Opens a small modal: email input + optional note + send.
// Anuj 2026-04-29 (peer-reviews v0.2).

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createReviewInvite } from '@/app/report/[id]/invite-actions'

interface Props {
  submissionId: string
  /** Pending invites count for display on the button (e.g. "3 pending"). */
  pendingCount?: number
}

export function InviteReviewerButton({ submissionId, pendingCount }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [email, setEmail] = useState('')
  const [note, setNote] = useState('')
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  function handleSend(e: React.FormEvent) {
    e.preventDefault()
    setErr(null)
    setSentTo(null)
    startTransition(async () => {
      const res = await createReviewInvite({
        submissionId,
        email: email.trim(),
        note: note.trim() || null,
      })
      if (res.error) {
        setErr(res.error)
        return
      }
      setSentTo(email.trim())
      setEmail('')
      setNote('')
      router.refresh()
    })
  }

  return (
    <>
      <button
        type="button"
        onClick={() => { setOpen(true); setErr(null); setSentTo(null) }}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-purple-600 text-white text-sm font-semibold hover:bg-purple-700 shadow-sm"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
          <circle cx="9" cy="7" r="4"></circle>
          <line x1="19" y1="8" x2="19" y2="14"></line>
          <line x1="22" y1="11" x2="16" y2="11"></line>
        </svg>
        Invite reviewer
        {pendingCount ? (
          <span className="ml-1 inline-block px-1.5 py-0.5 rounded-full bg-purple-500 text-white text-[10px] font-bold tabular-nums">
            {pendingCount}
          </span>
        ) : null}
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setOpen(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 100,
            background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
          >
            <div className="px-6 py-5 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">Invite a reviewer</h3>
              <p className="text-sm text-gray-500 mt-1">
                Send a personal review request. They'll get an email and be
                able to read your script + leave their honest take.
              </p>
            </div>

            <form onSubmit={handleSend} className="px-6 py-5">
              <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-gray-700 mb-2">
                Reviewer email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="them@example.com"
                required
                autoFocus
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[15px] text-gray-900 mb-4 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />

              <label className="block text-[11px] uppercase tracking-[0.16em] font-bold text-gray-700 mb-2">
                Personal note <span className="font-normal normal-case text-gray-400">(optional)</span>
              </label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                placeholder="Hey — would love your honest read on this. Thanks!"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-[14px] text-gray-900 mb-4 focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500"
              />

              {err && (
                <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                  {err}
                </div>
              )}
              {sentTo && (
                <div className="mb-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
                  Invite sent to <strong>{sentTo}</strong>.
                </div>
              )}

              <div className="flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-sm font-semibold text-gray-500 hover:text-gray-900"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={pending || !email.trim()}
                  className="px-5 py-2.5 rounded-lg bg-purple-600 text-white font-semibold text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {pending ? 'Sending…' : 'Send invite'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
