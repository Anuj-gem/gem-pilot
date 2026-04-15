'use client'
// Contact Writer CTA — gated only by the WRITER's subscription.
// States:
//   - live             : non-owner viewing a Pro writer → opens modal (any viewer tier)
//   - owner_upsell     : owner on free tier viewing own report → "Upgrade to become reachable"
//   - writer_not_pro   : non-owner, writer is NOT Pro → "Writer isn't on GEM Pro"
import { useState } from 'react'
import { Mail, Lock } from 'lucide-react'

export type ContactWriterState = 'live' | 'owner_upsell' | 'writer_not_pro'

interface Props {
  evaluationId: string
  writerName: string
  state: ContactWriterState
}

export function ContactWriter({ evaluationId, writerName, state }: Props) {
  const [open, setOpen] = useState(false)

  const handleClick = () => {
    if (state === 'live') {
      setOpen(true)
      return
    }
    if (state === 'owner_upsell') {
      window.location.href = `/subscribe?next=/report/${evaluationId}`
      return
    }
    // writer_not_pro — nothing to do
  }

  const copy = getCopy(state, writerName)
  const locked = state !== 'live'

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
            {copy.title}
          </p>
          <p className="text-[12px] sm:text-[13px] text-[var(--gem-gray-400)] m-0 mt-0.5">
            {copy.subtitle}
          </p>
        </div>
        <button
          onClick={handleClick}
          disabled={state === 'writer_not_pro'}
          className="flex-shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-colors disabled:cursor-not-allowed"
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
          {copy.cta}
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

function getCopy(state: ContactWriterState, writerName: string) {
  switch (state) {
    case 'live':
      return {
        title: 'Interested in this script?',
        subtitle: `Reach out to ${writerName} directly.`,
        cta: 'Contact writer',
      }
    case 'owner_upsell':
      return {
        title: 'Get discovered by industry',
        subtitle: 'Upgrade to GEM Pro so producers and reps can reach you here.',
        cta: 'Upgrade — $20/mo',
      }
    case 'writer_not_pro':
      return {
        title: 'Writer isn’t on GEM Pro yet',
        subtitle: `${writerName} hasn’t upgraded — contact through GEM isn’t available until they do.`,
        cta: 'Not reachable',
      }
  }
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
