'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

type Script = { id: string; title: string; score: number | null }

/**
 * Inline apply / edit for the single "Partner with GEM" opportunity. The writer
 * never leaves the page. Scripts fall into three buckets:
 *   - pending     → already in their open application (read-only here)
 *   - considered  → already reviewed to completion for this opportunity
 *   - available   → completed scripts they can add and submit
 * Submitting adds the selected available scripts to their application (creating
 * one if needed) and re-queues it for review.
 */
type Reviewed = { id: string; outcome: string; tags: string[] }

const OUTCOME_LABEL: Record<string, string> = { pass: 'Pass', developing: 'Developing', advancing: 'Advancing' }

export function InlineApply({
  opportunityId,
  signedIn,
  scripts,
  pendingScriptIds,
  reviewed,
}: {
  opportunityId: string | null
  signedIn: boolean
  scripts: Script[]
  pendingScriptIds: string[]
  reviewed: Reviewed[]
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [withdrawing, setWithdrawing] = useState<string | null>(null)

  const pendingSet = new Set(pendingScriptIds)
  const reviewedMap = new Map(reviewed.map((r) => [r.id, r]))
  const pendingScripts = scripts.filter((s) => pendingSet.has(s.id) && !reviewedMap.has(s.id))
  const consideredScripts = scripts.filter((s) => reviewedMap.has(s.id))
  const availableScripts = scripts.filter((s) => !pendingSet.has(s.id) && !reviewedMap.has(s.id))
  const hasPending = pendingScripts.length > 0

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

  const toggle = (id: string) =>
    setSelected((prev) => {
      const n = new Set(prev)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })

  const onPrimaryClick = () => {
    if (!signedIn) {
      router.push('/') // get-started flow
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
    setSelected(new Set())
    setOpen(false)
    setSubmitting(false)
    router.refresh() // re-pull server data so the buckets update
  }

  const withdraw = async (scriptId: string) => {
    setWithdrawing(scriptId)
    const res = await fetch('/api/consideration/withdraw-script', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ opportunity_id: opportunityId, script_id: scriptId }),
    })
    if (res.ok) router.refresh()
    else setWithdrawing(null)
  }

  // A small read-only script chip (pending / considered). Pending rows get a
  // Withdraw action so a writer can drop a stale draft and add a new one.
  const ChipRow = ({
    s,
    tag,
    tagColor,
    onWithdraw,
    busy,
    pills,
  }: {
    s: Script
    tag: string
    tagColor: string
    onWithdraw?: () => void
    busy?: boolean
    pills?: string[]
  }) => (
    <div style={{ border: '1px solid #ece8e1', background: '#fff', borderRadius: 11, padding: '11px 14px', marginBottom: 8 }}>
      <div className="flex items-center gap-3">
        <span className="flex-1 min-w-0" style={{ fontSize: 14.5, fontWeight: 600, color: '#1C1917' }}>
          {s.title}
        </span>
        {s.score != null && <span style={{ fontSize: 13, fontWeight: 800, color: '#534AB7' }}>{Math.round(s.score)}</span>}
        <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: 0.4, textTransform: 'uppercase', color: tagColor }}>{tag}</span>
        {onWithdraw && (
          <button
            onClick={onWithdraw}
            disabled={busy}
            className="cursor-pointer"
            style={{ background: 'none', border: 0, fontSize: 12, fontWeight: 600, color: '#b4525a', textDecoration: 'underline', padding: 0 }}
          >
            {busy ? 'Withdrawing…' : 'Withdraw'}
          </button>
        )}
      </div>
      {pills && pills.length > 0 && (
        <div className="flex flex-wrap gap-1.5" style={{ marginTop: 8 }}>
          {pills.map((p) => (
            <span
              key={p}
              style={{ fontSize: 11, fontWeight: 600, color: '#534AB7', background: '#F0EDFB', borderRadius: 99, padding: '2px 9px' }}
            >
              {p}
            </span>
          ))}
        </div>
      )}
    </div>
  )

  return (
    <div style={card}>
      <h2 className="flex items-center gap-2 m-0" style={{ fontSize: 21, fontWeight: 800, marginBottom: 10 }}>
        {diamond} {hasPending ? 'Your application' : 'Apply to partner with us'}
      </h2>

      {hasPending ? (
        <p className="m-0" style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.78)', maxWidth: 560, marginBottom: 18 }}>
          Your application is in and our team is reviewing it — you&apos;ll always hear back. You can add more
          scripts anytime; doing so puts you back at the front of the queue.
        </p>
      ) : (
        <p className="m-0" style={{ fontSize: 14.5, lineHeight: 1.6, color: 'rgba(255,255,255,.78)', maxWidth: 560, marginBottom: 18 }}>
          Applications are open, and every one is read by our team. We work with only a handful — most won&apos;t be
          the right fit, and that&apos;s okay. You&apos;ll always hear back.
        </p>
      )}

      {/* Pending bucket — read-only */}
      {hasPending && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>
            In review
          </div>
          {pendingScripts.map((s) => (
            <ChipRow key={s.id} s={s} tag="Pending" tagColor="#92400e" onWithdraw={() => withdraw(s.id)} busy={withdrawing === s.id} />
          ))}
        </div>
      )}

      {/* Considered bucket — read-only */}
      {consideredScripts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5, textTransform: 'uppercase', color: 'rgba(255,255,255,.55)', marginBottom: 8 }}>
            Already considered
          </div>
          {consideredScripts.map((s) => {
            const r = reviewedMap.get(s.id)!
            return <ChipRow key={s.id} s={s} tag={OUTCOME_LABEL[r.outcome] || 'Reviewed'} tagColor="#57534E" pills={r.tags} />
          })}
        </div>
      )}

      {/* Primary action */}
      <button
        onClick={onPrimaryClick}
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
        {hasPending ? 'Add more scripts' : 'Apply with a script'} <span style={{ fontSize: 12 }}>{open ? '▴' : '▾'}</span>
      </button>

      {open && (
        <div style={{ background: '#fff', borderRadius: 14, padding: '20px', marginTop: 14, color: '#1C1917' }}>
          {availableScripts.length === 0 ? (
            <div className="text-center" style={{ padding: '14px 0' }}>
              <p className="m-0" style={{ fontSize: 13.5, color: '#57534E' }}>
                {scripts.length === 0 ? "You don't have a scored script yet." : 'All your scored scripts are already in your application.'}
              </p>
              <Link href="/" className="font-semibold" style={{ fontSize: 13, color: '#534AB7' }}>
                Score another script →
              </Link>
            </div>
          ) : (
            <>
              <div style={{ fontSize: 13.5, fontWeight: 700, marginBottom: 3 }}>
                {hasPending ? 'Add scripts to your application' : 'Which scripts should we consider?'}
              </div>
              <div style={{ fontSize: 12.5, color: '#9b958c', marginBottom: 14 }}>
                Pick as many as you like. Only your completed scripts show here.
              </div>

              <div>
                {availableScripts.map((s) => {
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
                  : `${hasPending ? 'Add' : 'Submit'} ${selected.size > 0 ? `${selected.size} script${selected.size > 1 ? 's' : ''}` : ''} →`}
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
