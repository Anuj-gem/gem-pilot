'use client'
// Public viewer's single call-to-action at the bottom of a shared report.
// Replaces all the scattered blurred teasers — instead of letting visitors
// squint at blurred content, we hide private sections entirely and route them
// here to request a connection through Anuj.
//
// States:
//   - contactOpen  : writer has contact_enabled → full form
//   - contactClosed: writer has disabled inbound contact → read-only notice
//   - authGate     : viewer not signed in → prompt to create free account
import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'

interface Props {
  evaluationId: string
  writerName: string
  /** How many of the private sections are we gating here? Drives copy ("3 more
   *  sections are private" vs generic "the full read"). */
  hiddenSectionCount: number
  contactEnabled: boolean
  isLoggedIn: boolean
}

export function PublicContactCard({
  evaluationId,
  writerName,
  hiddenSectionCount,
  contactEnabled,
  isLoggedIn,
}: Props) {
  const [open, setOpen] = useState(false)
  const [authGate, setAuthGate] = useState(false)

  const handleClick = () => {
    if (!contactEnabled) return
    if (!isLoggedIn) {
      setAuthGate(true)
      return
    }
    setOpen(true)
  }

  const gatingCopy =
    hiddenSectionCount > 0
      ? `${writerName} shared part of this report publicly. The rest — ${hiddenSectionCount} more ${
          hiddenSectionCount === 1 ? 'section' : 'sections'
        }, including the full development notes — stays with them.`
      : `${writerName} keeps the full report private.`

  return (
    <>
      <div
        className="mt-10 rounded-2xl p-6 sm:p-7"
        style={{
          background:
            'linear-gradient(135deg, rgba(124,58,237,0.07), rgba(212,160,23,0.04) 80%)',
          border: '1px solid rgba(124,58,237,0.28)',
        }}
      >
        <div className="flex items-start gap-3 mb-4">
          <div
            className="flex-shrink-0 w-10 h-10 rounded-full grid place-items-center text-white"
            style={{ background: 'var(--gem-accent)' }}
          >
            <Mail size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-[0.18em] font-semibold text-[var(--gem-accent)] m-0 mb-1">
              Want the full read?
            </p>
            <h3 className="text-[20px] sm:text-[22px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
              Reach out to {writerName}
            </h3>
          </div>
        </div>
        <p className="text-[14px] sm:text-[15px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-5 max-w-[60ch]">
          {gatingCopy}{' '}
          {contactEnabled
            ? `Send a note — we route it through and broker the connection.`
            : `They haven't opened inbound contact on this report yet.`}
        </p>
        {contactEnabled ? (
          <button
            onClick={handleClick}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-colors hover:brightness-110"
            style={{ background: 'var(--gem-accent)' }}
          >
            <Mail size={14} />
            Request to contact {writerName}
          </button>
        ) : (
          <div
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold"
            style={{ background: 'rgba(0,0,0,0.05)', color: 'var(--gem-gray-500)' }}
          >
            <Lock size={14} />
            Contact not available on this report
          </div>
        )}
      </div>

      {authGate && (
        <AuthGateModal
          evaluationId={evaluationId}
          writerName={writerName}
          onClose={() => setAuthGate(false)}
        />
      )}
      {open && (
        <ContactModal
          evaluationId={evaluationId}
          writerName={writerName}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  )
}

function AuthGateModal({
  evaluationId,
  writerName,
  onClose,
}: {
  evaluationId: string
  writerName: string
  onClose: () => void
}) {
  const redirect = encodeURIComponent(`/report/${evaluationId}`)
  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl"
      >
        <h3 className="text-lg font-semibold text-[var(--gem-white)] mb-2">
          Create a free account to reach {writerName}
        </h3>
        <p className="text-sm text-[var(--gem-gray-500)] mb-5">
          A free GEM account is all you need. You&apos;ll come right back to this report.
        </p>
        <div className="flex flex-col gap-2">
          <a
            href={`/signup?redirect=${redirect}`}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-white text-sm font-semibold"
            style={{ background: 'var(--gem-accent)' }}
          >
            Create free account
          </a>
          <a
            href={`/login?redirect=${redirect}`}
            className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-lg text-sm font-medium text-[var(--gem-gray-400)] border border-[var(--gem-gray-700)]"
          >
            Log in
          </a>
          <button
            onClick={onClose}
            className="mt-1 text-xs text-[var(--gem-gray-500)] hover:text-[var(--gem-gray-300)]"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ContactModal({
  evaluationId,
  writerName,
  onClose,
}: {
  evaluationId: string
  writerName: string
  onClose: () => void
}) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const send = async () => {
    setSending(true)
    setError(null)
    try {
      const res = await fetch('/api/contact-writer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ evaluation_id: evaluationId, message }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error || 'Could not send.')
      }
      setSent(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not send.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl"
      >
        {sent ? (
          <>
            <h3 className="text-lg font-semibold text-[var(--gem-white)] mb-2">
              Request sent
            </h3>
            <p className="text-sm text-[var(--gem-gray-400)] mb-5">
              We got your note. Anuj reviews every connection and will loop
              {' '}{writerName}{' '}in if it&apos;s a fit. Expect a reply within
              a couple days.
            </p>
            <button
              onClick={onClose}
              className="w-full px-4 py-2.5 rounded-lg text-white text-sm font-semibold"
              style={{ background: 'var(--gem-accent)' }}
            >
              Close
            </button>
          </>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-[var(--gem-white)] mb-1">
              Request to contact {writerName}
            </h3>
            <p className="text-sm text-[var(--gem-gray-500)] mb-4">
              Introduce yourself and tell them why you&apos;re reaching out. We&apos;ll
              forward to {writerName} if they approve the connection.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Who you are, what you're working on, and why this script caught your eye…"
              rows={6}
              className="w-full p-3 rounded-lg border border-[var(--gem-gray-700)] text-sm text-[var(--gem-white)] focus:outline-none focus:border-[var(--gem-accent)]"
            />
            {error && (
              <p className="text-xs text-red-600 mt-2">{error}</p>
            )}
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[var(--gem-gray-400)]"
              >
                Cancel
              </button>
              <button
                onClick={send}
                disabled={sending || message.trim().length < 10}
                className="px-4 py-2 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
                style={{ background: 'var(--gem-accent)' }}
              >
                {sending ? 'Sending…' : 'Send request'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
