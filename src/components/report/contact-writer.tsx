'use client'
// Contact Writer CTA — gated only by the WRITER's subscription.
// States:
//   - live             : non-owner viewing a Pro writer → opens modal (any viewer tier)
//   - owner_upsell     : owner on free tier viewing own report → "Upgrade to become reachable"
//   - writer_not_pro   : non-owner, writer is NOT Pro → "Writer isn't on GEM Pro"
import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'

export type ContactWriterState = 'live' | 'owner_live' | 'owner_upsell' | 'writer_not_pro'

interface Props {
  evaluationId: string
  writerName: string
  state: ContactWriterState
  // Anonymous viewers clicking "Contact writer" get an auth gate prompting them
  // to create a free account first, then return to the report.
  isLoggedIn: boolean
}

export function ContactWriter({ evaluationId, writerName, state, isLoggedIn }: Props) {
  const [open, setOpen] = useState(false)
  const [authGate, setAuthGate] = useState(false)

  const handleClick = () => {
    if (state === 'live') {
      if (!isLoggedIn) {
        setAuthGate(true)
        return
      }
      setOpen(true)
      return
    }
    if (state === 'owner_upsell') {
      window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))
      return
    }
    // writer_not_pro — nothing to do
  }

  if (state === 'live') {
    return (
      <>
        <div
          className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border"
          style={{
            background: 'linear-gradient(135deg, rgba(124,58,237,0.06), transparent 60%)',
            borderColor: 'rgba(124,58,237,0.28)',
          }}
        >
          <div className="min-w-0">
            <p className="text-[13px] sm:text-sm font-semibold text-[var(--gem-white)] m-0">
              Interested in this script?
            </p>
            <p className="text-[12px] sm:text-[13px] text-[var(--gem-gray-400)] m-0 mt-0.5">
              Reach out to {writerName} directly.
            </p>
          </div>
          <button
            onClick={handleClick}
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors"
            style={{ background: 'var(--gem-accent)', color: '#fff' }}
          >
            <Mail size={14} />
            Contact writer
          </button>
        </div>
        {open && (
          <ContactModal
            evaluationId={evaluationId}
            writerName={writerName}
            onClose={() => setOpen(false)}
          />
        )}
        {authGate && (
          <AuthGateModal
            evaluationId={evaluationId}
            writerName={writerName}
            onClose={() => setAuthGate(false)}
          />
        )}
      </>
    )
  }

  // Owner confirmation — show that readers can contact them
  if (state === 'owner_live') {
    return (
      <div
        className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border"
        style={{
          background: 'linear-gradient(135deg, rgba(5,150,105,0.06), transparent 60%)',
          borderColor: 'rgba(5,150,105,0.25)',
        }}
      >
        <div className="min-w-0">
          <p className="text-[13px] sm:text-sm font-semibold text-[var(--gem-white)] m-0">
            You&apos;re reachable
          </p>
          <p className="text-[12px] sm:text-[13px] text-[var(--gem-gray-400)] m-0 mt-0.5">
            Anyone reading this report can message you directly.
          </p>
        </div>
        <div
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold"
          style={{ background: 'rgba(5,150,105,0.12)', color: '#059669' }}
        >
          <Mail size={14} />
          Contact open
        </div>
      </div>
    )
  }

  // Owner upsell — free writer sees a locked "Contact writer" button
  // that makes it obvious producers would reach them here if they upgrade
  if (state === 'owner_upsell') {
    return (
      <div className="space-y-2">
        <div
          className="relative flex items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border border-[var(--gem-gray-700)] opacity-60"
        >
          <div className="min-w-0">
            <p className="text-[13px] sm:text-sm font-semibold text-[var(--gem-gray-400)] m-0">
              Interested in this script?
            </p>
            <p className="text-[12px] sm:text-[13px] text-[var(--gem-gray-500)] m-0 mt-0.5">
              Reach out to the writer directly.
            </p>
          </div>
          <div
            className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[var(--gem-gray-500)]"
            style={{ background: 'rgba(255,255,255,0.06)' }}
          >
            <Lock size={14} />
            Contact writer
          </div>
        </div>
        <button
          onClick={handleClick}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: 'var(--gem-accent)', color: '#fff' }}
        >
          <Lock size={13} />
          Go Pro to let producers contact you — $20/mo
        </button>
      </div>
    )
  }

  // Writer not on Pro — visitor sees that contact isn't available
  if (state === 'writer_not_pro') {
    return (
      <div
        className="flex items-center justify-between gap-4 p-4 sm:p-5 rounded-xl border border-[var(--gem-gray-700)]"
      >
        <div className="min-w-0">
          <p className="text-[13px] sm:text-sm font-semibold text-[var(--gem-gray-400)] m-0">
            Contact not available
          </p>
          <p className="text-[12px] sm:text-[13px] text-[var(--gem-gray-500)] m-0 mt-0.5">
            This writer hasn&apos;t enabled inbound contact yet.
          </p>
        </div>
        <div
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-[var(--gem-gray-500)]"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        >
          <Lock size={14} />
          Unavailable
        </div>
      </div>
    )
  }

  return null
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
          Create a free account to message {writerName}
        </h3>
        <p className="text-sm text-[var(--gem-gray-500)] mb-5">
          A free GEM account is all you need to contact writers. You&apos;ll come right back to this report.
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
                disabled={sending || message.trim().length < 1}
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
