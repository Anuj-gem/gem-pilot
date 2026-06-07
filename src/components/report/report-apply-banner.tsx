'use client'

import { useState, useEffect } from 'react'

/**
 * Floating, dismissible "apply for GEM support" banner that sits at the top
 * of the report. It's the same offer as the in-section GEM support element —
 * surfaced up top so it doesn't get buried. Owner-only.
 *
 * Dismiss behavior:
 *  - × button  → hide for this session (comes back next visit)
 *  - "Don't show me this again" → permanent, stored in localStorage
 */
export function ReportApplyBanner({ applyHref = '/opportunities' }: { applyHref?: string }) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem('gem-apply-banner-hidden') !== '1') setShow(true)
    } catch {
      setShow(true)
    }
  }, [])

  if (!show) return null

  const dismissForever = () => {
    try {
      localStorage.setItem('gem-apply-banner-hidden', '1')
    } catch {}
    setShow(false)
  }

  return (
    <div
      className="overflow-hidden"
      style={{
        background: '#fff',
        borderRadius: 16,
        border: '1px solid #e6e0ff',
        boxShadow: '0 12px 34px rgba(40,20,90,0.10)',
      }}
    >
      <div style={{ height: 4, background: 'linear-gradient(90deg,#7c3aed,#a855f7)' }} />
      <div className="flex items-center gap-4" style={{ padding: '18px 20px' }}>
        <div className="flex-1 min-w-0">
          <h3
            className="flex items-center gap-2 m-0"
            style={{ fontSize: 16, fontWeight: 800, color: '#1C1917' }}
          >
            <span
              aria-hidden="true"
              className="inline-block rotate-45 shrink-0"
              style={{ width: 12, height: 12, background: 'linear-gradient(135deg,#a78bfa,#7c3aed)', borderRadius: 1 }}
            />
            GEM production &amp; financing support
          </h3>
          <p className="m-0 mt-1" style={{ fontSize: 13.5, lineHeight: 1.45, color: '#78716C' }}>
            We back a small number of projects with development, production, and financing. Apply with
            this script — our team reviews every one, and you&apos;ll always hear back.
          </p>
        </div>
        <a
          href={applyHref}
          className="no-underline shrink-0"
          style={{
            background: 'linear-gradient(135deg,#7c3aed,#a855f7)',
            color: '#fff',
            fontWeight: 700,
            fontSize: 14,
            padding: '11px 22px',
            borderRadius: 10,
            whiteSpace: 'nowrap',
          }}
        >
          Apply
        </a>
        <button
          onClick={() => setShow(false)}
          title="Dismiss"
          className="cursor-pointer self-start"
          style={{ background: 'none', border: 0, color: '#9b958c', fontSize: 20, lineHeight: 1, padding: '2px 4px' }}
        >
          ×
        </button>
      </div>
      <div style={{ padding: '0 20px 12px', textAlign: 'right' }}>
        <button
          onClick={dismissForever}
          className="cursor-pointer"
          style={{ background: 'none', border: 0, color: '#9b958c', fontSize: 12, textDecoration: 'underline' }}
        >
          Don&apos;t show me this again
        </button>
      </div>
    </div>
  )
}
