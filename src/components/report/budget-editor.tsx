'use client'

import { useState, useCallback, useRef, useEffect } from 'react'

export interface BudgetLineItem {
  label: string
  amount: number
}

export interface BudgetPlan {
  line_items: BudgetLineItem[]
  explanation: string
  total: number
  budget_low?: number
  budget_high?: number
  episodes?: number
}

interface Props {
  initial: BudgetPlan | null
  gemEstimate: string | null
  gemNote: string | null
  gemTier: string | null
  gemPerEpisode?: string | null
  gemSeasonTotal?: string | null
  submissionId: string
  onSave?: (plan: BudgetPlan) => void
}

/* ── Parse "$3M", "$500K", "3000000" → number ── */
function parseInput(s: string): number {
  const c = s.replace(/[,$\s]/g, '')
  const m = c.match(/^([0-9.]+)\s*(K|M|B)?$/i)
  if (m) {
    const n = parseFloat(m[1])
    const u = (m[2] || '').toUpperCase()
    return Math.round(u === 'B' ? n * 1e9 : u === 'M' ? n * 1e6 : u === 'K' ? n * 1e3 : n)
  }
  return parseInt(c.replace(/[^0-9]/g, ''), 10) || 0
}

/* ── Parse "$3M-$6M/ep" → { low, high } ── */
function parseBudgetStr(s: string | null | undefined): { low: number; high: number } | null {
  if (!s) return null
  const ms = s.match(/\$([0-9.]+)\s*(K|M|B)?/gi)
  if (!ms) return null
  function one(m: string): number {
    const r = m.match(/\$([0-9.]+)\s*(K|M|B)?/i)
    if (!r) return 0
    const n = parseFloat(r[1])
    const u = (r[2] || '').toUpperCase()
    return Math.round(u === 'B' ? n * 1e9 : u === 'M' ? n * 1e6 : u === 'K' ? n * 1e3 : n)
  }
  return ms.length >= 2
    ? { low: one(ms[0]), high: one(ms[1]) }
    : { low: one(ms[0]), high: one(ms[0]) }
}

function fmtShort(n: number): string {
  if (n >= 1e9) return `$${(n / 1e9).toFixed(n % 1e9 === 0 ? 0 : 1)}B`
  if (n >= 1e6) return `$${(n / 1e6).toFixed(n % 1e6 === 0 ? 0 : 1)}M`
  if (n >= 1e3) return `$${Math.round(n / 1e3).toLocaleString()}K`
  return `$${n.toLocaleString()}`
}

/* ── Click-to-edit number ── */
function EditableNum({ value, onChange, isDollar = true, fontSize = '22px' }: {
  value: number
  onChange: (n: number) => void
  isDollar?: boolean
  fontSize?: string
}) {
  const [editing, setEditing] = useState(false)
  const [text, setText] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  function start() {
    setText(value > 0 ? (isDollar ? fmtShort(value) : String(value)) : '')
    setEditing(true)
  }

  function commit() {
    const n = isDollar ? parseInput(text) : Math.max(1, parseInt(text, 10) || 1)
    onChange(n)
    setEditing(false)
  }

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  const display = value > 0
    ? (isDollar ? fmtShort(value) : String(value))
    : (isDollar ? '___' : '1')

  if (!editing) {
    return (
      <span
        onClick={start}
        className="cursor-pointer inline-block"
        style={{
          fontSize,
          fontWeight: 600,
          color: value > 0 ? '#1C1917' : '#c4b5fd',
          borderBottom: '1.5px dashed #c4b5fd',
          lineHeight: 1.3,
        }}
      >
        {display}
      </span>
    )
  }

  return (
    <input
      ref={ref}
      type="text"
      value={text}
      onChange={e => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={e => e.key === 'Enter' && commit()}
      placeholder={isDollar ? '$0' : '1'}
      style={{
        fontSize,
        fontWeight: 600,
        width: isDollar ? '6rem' : '2.5rem',
        textAlign: 'center',
        border: 'none',
        borderBottom: '2px solid #534AB7',
        outline: 'none',
        background: 'transparent',
        padding: '0 2px',
        lineHeight: 1.3,
        color: '#1C1917',
      }}
    />
  )
}

/* ── Main ── */
export function BudgetEditor({ initial, gemEstimate, gemNote, gemTier, gemPerEpisode, gemSeasonTotal, submissionId, onSave }: Props) {
  const isSeries = !!gemPerEpisode
  const gemParsed = parseBudgetStr(isSeries ? gemPerEpisode : gemEstimate)
  const gemLow = gemParsed?.low || 0
  const gemHigh = gemParsed?.high || 0

  const [low, setLow] = useState(initial?.budget_low || gemLow)
  const [high, setHigh] = useState(initial?.budget_high || gemHigh || initial?.total || 0)
  const [eps, setEps] = useState(initial?.episodes || 1)
  const [saving, setSaving] = useState(false)

  // Whether user has changed anything from GEM defaults
  const isCustom = low !== gemLow || high !== gemHigh || eps !== 1

  const totalLow = isSeries ? low * eps : low
  const totalHigh = isSeries ? high * eps : high

  const save = useCallback(async (l: number, h: number, e: number) => {
    const total = isSeries ? (h || l) * e : (h || l)
    const plan: BudgetPlan = { line_items: [], explanation: '', total, budget_low: l, budget_high: h, episodes: e }
    setSaving(true)
    try {
      const res = await fetch('/api/report/financial-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submissionId, budgetPlan: plan }),
      })
      if (res.ok) onSave?.(plan)
    } finally {
      setSaving(false)
    }
  }, [submissionId, onSave, isSeries])

  function handleRevert() {
    setLow(gemLow)
    setHigh(gemHigh)
    setEps(1)
    save(gemLow, gemHigh, 1)
  }

  // Total display string
  const totalDisplay = totalLow > 0 && totalHigh > 0 && totalLow !== totalHigh
    ? `${fmtShort(totalLow)}–${fmtShort(totalHigh)}`
    : fmtShort(totalHigh || totalLow)

  return (
    <div>
      <div className="flex items-start justify-between gap-4">
        {/* Left — editable fields */}
        <div>
          {/* Cost line */}
          <div className="flex items-baseline gap-2 flex-wrap">
            <EditableNum value={low} onChange={n => { setLow(n); save(n, high, eps) }} />
            <span className="text-[16px]" style={{ color: '#A8A29E' }}>–</span>
            <EditableNum value={high} onChange={n => { setHigh(n); save(low, n, eps) }} />
            {isSeries && (
              <span className="text-[14px]" style={{ color: '#78716C' }}>per episode</span>
            )}
          </div>

          {/* Episodes — series only */}
          {isSeries && (
            <div className="flex items-baseline gap-1.5 mt-2">
              <span className="text-[14px]" style={{ color: '#78716C' }}>×</span>
              <EditableNum
                value={eps}
                onChange={n => { const e = Math.max(1, n); setEps(e); save(low, high, e) }}
                isDollar={false}
                fontSize="17px"
              />
              <span className="text-[14px]" style={{ color: '#78716C' }}>
                episode{eps !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Revert */}
          {isCustom && (
            <button
              onClick={handleRevert}
              className="text-[12px] underline border-0 bg-transparent cursor-pointer p-0 mt-2"
              style={{ color: '#78716C' }}
            >
              Revert
            </button>
          )}
        </div>

        {/* Right — total (only for series with >1 episode where it's a calculated total) */}
        {isSeries && eps > 1 && (totalHigh > 0 || totalLow > 0) && (
          <div className="text-right shrink-0 pt-1">
            <div className="text-[20px] font-bold" style={{ color: '#534AB7' }}>
              {totalDisplay}
            </div>
            <div className="text-[12px]" style={{ color: '#78716C' }}>total</div>
          </div>
        )}
      </div>

      {/* GEM note */}
      {gemNote && (
        <div className="rounded-lg px-4 py-3 mt-3" style={{ background: '#fafaf9' }}>
          <p className="text-[13px] m-0 leading-relaxed" style={{ color: '#44403C' }}>{gemNote}</p>
        </div>
      )}

      {saving && <p className="text-[12px] mt-1" style={{ color: '#78716C' }}>Saving...</p>}
    </div>
  )
}
