'use client'
// Contact Writer button — placeholder wiring (Task 4 will plug in the full flow).
// Visible only on reports where the writer is subscribed (i.e., the report is fully unlocked).
// Click behavior:
//   - Not signed in  → scrolls to / opens signup
//   - Signed in      → opens modal to compose email (routed through Postmark)
import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'

interface Props {
  evaluationId: string
  writerName: string
  isLoggedIn: boolean
  locked?: boolean
}

export function ContactWriter({ evaluationId, writerName, isLoggedIn, locked }: Props) {
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    if (locked) {
      if (!isLoggedIn) {
        const el = document.getElementById('inline-signup')
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          return
        }
        window.location.href = `/signup?next=/report/${evaluationId}`
        return
      }
      // Logged-in viewer but writer not subscribed → send to subscribe
      window.location.href = `/subscribe?next=/report/${evaluationId}`
      return
    }
    if (!isLoggedIn) {
      const el = document.getElementById('inline-signup')
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }
      window.location.href = `/signup?next=/report/${evaluationId}`
      return
    }
    setOpen(true)
  }

  return (
    <>
      <div
        className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border"
        style={{
          background: locked
            ? 'var(--gem-gray-900)'
            : 'linear-gradient(135deg, rgba(124,58,237,0.06), transparent 60%)',
          borderColor: locked ? 'var(--gem-gray-700)' : 'rgba(124,58,237,0.28)',
        }}
      >
        <div className="min-w-0">
          <p className="text-[13px] sm:text-sm font-semibold text-[var(--gem-white)] m-0">
            {locked ? 'Reach the writer directly' : 'Interested in this script?'}
          </p>
          <p className="text-[12px] sm:text-[13px] text-[var(--gem-gray-400)] m-0 mt-0.5">
            {locked
              ? 'Upgrade to message writers and unlock industry connections.'
              : `Reach out to ${writerName} directly. ${isLoggedIn ? '' : 'Free account required.'}`}
          </p>
        </div>
        <button
          onClick={handleClick}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={
            locked
              ? {
                  background: 'var(--gem-gray-800)',
                  color: 'var(--gem-gray-300)',
                  border: '1px solid var(--gem-gray-700)',
                }
              : { background: 'var(--gem-accent)', color: '#fff' }
          }
        >
          {locked ? <Lock size={14} /> : <Mail size={14} />}
          {locked ? 'Upgrade to contact' : 'Contact writer'}
        </button>
      </div>

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
            <h3 className="text-lg font-semibold text-[var(--gem-white)] mb-2">Sent</h3>
            <p className="text-sm text-[var(--gem-gray-400)] mb-5">
              {writerName} will receive your message by email. If they reply, it will come
              straight to your inbox.
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
              Message {writerName}
            </h3>
            <p className="text-sm text-[var(--gem-gray-500)] mb-4">
              Your email address will be shared so they can reply directly.
            </p>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Introduce yourself and tell them why you're reaching out…"
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
                {sending ? 'Sending…' : 'Send message'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
