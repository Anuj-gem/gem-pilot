'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Script = { id: string; title: string; score: number | null }

/**
 * Inline apply for the single "Partner with GEM" opportunity. The writer never
 * leaves the page: click Apply → a panel opens below with their completed
 * scripts → multi-select → submit. Signed-out writers are sent to get started.
 */
export function InlineApply({
  opportunityId,
  signedIn,
  scripts,
  alreadyApplied,
}: {
  opportunityId: string | null
  signedIn: boolean
  scripts: Script[]
  alreadyApplied: boolean
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)

  const card: React.CSSProperties = {
    background: 'linear-gradient(160deg,#241646,#3a2470)',
    borderRadius: 18,
    padding: '28px 30px',
    color: '#fff',
  }
  const diamond = (
    <span
      aria-hidden="true"
      className="inline-block rotate-45 shrink-0"
      style={{ width: 11, height: 11, background: 'linear-gradient(135deg,#c4b5fd,#a855f7)', borderRadius: 1 }}
    />
  )

  // Already applied (pending) or just submitted → confirmation state.
  if (alreadyApplied || done) {
    return (
      <div style={card}>
        <h2 className="flex items-center gap-2 m-0" style={{ fontSize: 21, fontWeight: 800, marginBottom: 10 }}>
          {diamond} Your application is in
        </h2>
        <p className="m-0" style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.78)' }}>
          Our team reads every application. We&apos;ll be in touch — and you&apos;ll always hear back, either way.
        </p>
      </div>
    )
  }

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const onApplyClick = () => {
    if (!signedIn) {
      // Send them through the get-started flow.
      router.push('/')
      return
    }
    setOpen((o) => !o)
  }

  const submit = async () => {
    if (selected.size === 0) {
      setError('Pick at least one script.')
      return
    }
    setSubmitting(true)
    setError('')
    const res = await fetch('/api/consideration/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: opportunityId, script_ids: [...selected] }),
    })
    const data = await res.json()
    if (!res.ok) {
      setError(data.error || 'Something went wrong.')
      setSubmitting(false)
      return
    }
    setDone(true)
  }

  return (
    <div style={card}>
      <h2 className="flex items-center gap-2 m-0" style={{ fontSize: 21, fontWeight: 800, marginBottom: 10 }}>
        {diamond} Apply to partner with us
      </h2>
      <p className="m-0" style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.78)', maxWidth: 560, marginBottom: 20 }}>
        Applications are open, and every one is read by our team. We work with only a handful — most
        won&apos;t be the right fit, and that&apos;s okay. You&apos;ll always hear back.
      </p>

      <button
        onClick={onApplyClick}
        className="inline-flex items-center gap-2 cursor-pointer"
        style={{
          background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
          color: '#fff',
          fontWeight: 700,
          fontSize: 15,
          padding: '13px 26px',
          borderRadius: 11,
          border: 0,
          opacity: open ? 0.6 : 1,
        }}
      >
        Apply with a script <span style={{ fontSize: 12 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px', marginTop: 14, color: '#1C1917' }}>
          {scripts.length === 0 ? (
            <div className="text-center" style={{ padding: '14px 0' }}>
              <p className="m-0" style={{ fontSize: 13.5, color: '#57534E' }}>
                You don&apos;t have a scored script yet.
              </p>
              <Link href="/" className="font-semibold" style={{ fontSize: 13, color: '#534AB7' }}>
                Score a script first →
              </Link>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>Which scripts should we consider?</div>
              <div style={{ fontSize: 12.5, color: '#9b958c', marginBottom: 14 }}>
                Pick as many as you like. Only your completed scripts show here.
              </div>

              <div>
                {scripts.map((s) => {
                  const sel = selected.has(s.id)
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggle(s.id)}
                      className="w-full flex items-center gap-3 cursor-pointer text-left"
                      style={{
                        border: `1px solid ${sel ? '#b9aef0' : '#ece8e1'}`,
                        background: sel ? '#faf9ff' : '#fff',
                        borderRadius: 11,
                        padding: '12px 14px',
                        marginBottom: 9,
                      }}
                    >
                      <span
                        className="flex items-center justify-center shrink-0"
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: sel ? 'none' : '2px solid #d6d0c4',
                          background: sel ? 'linear-gradient(135deg,#7c3aed,#a855f7)' : 'transparent',
                          color: '#fff',
                          fontSize: 13,
                          fontWeight: 800,
                        }}
                      >
                        {sel ? '✓' : ''}
                      </span>
                      <span className="flex-1 min-w-0" style={{ fontSize: 14.5, fontWeight: 600 }}>
                        {s.title}
                      </span>
                      {s.score != null && (
                        <span style={{ fontSize: 13, fontWeight: 800, color: '#534AB7' }}>{Math.round(s.score)}</span>
                      )}
                    </button>
                  )
                })}
              </div>

              {error && <p className="m-0" style={{ fontSize: 13, color: '#dc2626', marginTop: 4 }}>{error}</p>}

              <button
                onClick={submit}
                disabled={submitting}
                className="w-full cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
                  color: '#fff',
                  fontWeight: 700,
                  fontSize: 15,
                  padding: 13,
                  borderRadius: 11,
                  border: 0,
                  marginTop: 8,
                  opacity: submitting ? 0.6 : 1,
                }}
              >
                {submitting
                  ? 'Submitting…'
                  : `Submit ${selected.size > 0 ? `${selected.size} script${selected.size > 1 ? 's' : ''}` : ''} →`}
              </button>
              <div style={{ fontSize: 11.5, color: '#9b958c', textAlign: 'center', marginTop: 11 }}>
                Applying starts a conversation — we&apos;ll be in touch.
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
