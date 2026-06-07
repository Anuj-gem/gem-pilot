'use client'

import { useState } from 'react'
import { ReportApplyBanner } from './report-apply-banner'

type Status =
  | { kind: 'none' }
  | { kind: 'pending' }
  | { kind: 'reviewed'; outcome: string; feedback: string | null; tags: string[] }

const OUTCOME_LABEL: Record<string, string> = { pass: 'Pass', developing: 'Developing', advancing: 'Advancing' }

const Diamond = () => (
  <span
    aria-hidden="true"
    className="inline-block rotate-45 shrink-0"
    style={{ width: 12, height: 12, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', borderRadius: 1 }}
  />
)

/**
 * Top-of-report status for the GEM partner program, scoped to this one script:
 *   none     → the apply banner (dismissible)
 *   pending  → "under review" status
 *   reviewed → outcome + feedback, dismissible to a reopenable chip so the
 *              writer can always come back and refer to it.
 */
export function ReportPartnerStatus({ status }: { status: Status }) {
  const [collapsed, setCollapsed] = useState(false)

  if (status.kind === 'none') return <ReportApplyBanner />

  if (status.kind === 'pending') {
    return (
      <div
        className="overflow-hidden"
        style={{ background: '#fff', borderRadius: 16, border: '1px solid #e6e0ff', boxShadow: '0 12px 34px rgba(40,20,90,0.10)' }}
      >
        <div style={{ height: 4, background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }} />
        <div className="flex items-center gap-3" style={{ padding: '16px 20px' }}>
          <Diamond />
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 15, fontWeight: 800, color: '#1C1917' }}>Under review</div>
            <div style={{ fontSize: 13, color: '#78716C', marginTop: 2 }}>
              Your script is with our team — you&apos;ll always hear back.
            </div>
          </div>
        </div>
      </div>
    )
  }

  // reviewed
  const label = OUTCOME_LABEL[status.outcome] || 'Reviewed'

  if (collapsed) {
    return (
      <button
        onClick={() => setCollapsed(false)}
        className="w-full flex items-center gap-2 cursor-pointer"
        style={{
          background: '#fff',
          border: '1px solid #e6e0ff',
          borderRadius: 12,
          padding: '10px 16px',
          color: '#534AB7',
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        <Diamond /> GEM reviewed this script · {label}
        <span style={{ marginLeft: 'auto', color: '#9b958c', fontWeight: 600 }}>View feedback</span>
      </button>
    )
  }

  return (
    <div
      className="overflow-hidden"
      style={{ background: '#fff', borderRadius: 16, border: '1px solid #e6e0ff', boxShadow: '0 12px 34px rgba(40,20,90,0.10)' }}
    >
      <div style={{ height: 4, background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }} />
      <div style={{ padding: '18px 20px' }}>
        <div className="flex items-center gap-3" style={{ marginBottom: 10 }}>
          <Diamond />
          <h3 className="m-0" style={{ fontSize: 16, fontWeight: 800, color: '#1C1917' }}>
            GEM reviewed this script
          </h3>
          <span
            style={{
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 0.4,
              textTransform: 'uppercase',
              color: '#534AB7',
              background: '#F0EDFB',
              borderRadius: 99,
              padding: '2px 10px',
            }}
          >
            {label}
          </span>
          <button
            onClick={() => setCollapsed(true)}
            title="Dismiss"
            className="cursor-pointer"
            style={{ marginLeft: 'auto', background: 'none', border: 0, color: '#9b958c', fontSize: 20, lineHeight: 1, padding: '0 2px' }}
          >
            ×
          </button>
        </div>

        {status.feedback && (
          <p className="m-0" style={{ fontSize: 14, lineHeight: 1.6, color: '#44403C' }}>
            {status.feedback}
          </p>
        )}

        {status.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5" style={{ marginTop: 12 }}>
            {status.tags.map((t) => (
              <span
                key={t}
                style={{ fontSize: 11, fontWeight: 600, color: '#534AB7', background: '#F0EDFB', borderRadius: 99, padding: '2px 9px' }}
              >
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
