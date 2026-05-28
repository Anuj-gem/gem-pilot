'use client'

import { useState, useRef, useEffect } from 'react'

interface Props {
  heat: number
  heatRank: number | null
  isPublic: boolean
  collabHeatCount: number
}

export function HeatBreakdown({ heat, heatRank, isPublic, collabHeatCount }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Calculate breakdown — collabHeatCount = accepted collaborators only (heat granted on accept)
  const collabHeat = collabHeatCount
  const reviewHeat = Math.max(0, heat - collabHeat)

  return (
    <div className="relative flex items-center gap-1.5" ref={ref}>
      <span className="text-[11px] font-semibold" style={{ color: '#6b7280' }}>Project Heat</span>
      <button
        onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(!open) }}
        className="flex items-center gap-1 border-0 bg-transparent cursor-pointer p-0"
      >
        <span className="text-[11px]">🔥</span>
        <span className="text-[15px] font-extrabold leading-none" style={{ color: heat > 0 ? '#ea580c' : '#d1d5db' }}>{heat}</span>
        <span className="text-[10px]" style={{ color: '#9ca3af' }}>▾</span>
      </button>
      {isPublic && heat > 0 && heatRank ? (
        <span className="text-[11px] font-semibold" style={{ color: '#ea580c' }}>#{heatRank}</span>
      ) : (
        <span className="text-[11px] font-semibold" style={{ color: '#9ca3af' }}>Rank: N/A</span>
      )}

      {/* Dropdown */}
      {open && (
        <div
          className="absolute left-0 top-full mt-1.5 z-30 rounded-lg py-2 px-3"
          style={{ background: '#ffffff', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', minWidth: 200 }}
        >
          <p className="text-[11px] font-semibold m-0 mb-2" style={{ color: '#6b7280' }}>Heat breakdown</p>
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px]">🧑</span>
                <span className="text-[12px]" style={{ color: '#374151' }}>Collaborators</span>
              </div>
              <span className="text-[12px] font-semibold" style={{ color: collabHeat > 0 ? '#ea580c' : '#d1d5db' }}>+{collabHeat}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="text-[12px]">💼</span>
                <span className="text-[12px]" style={{ color: '#374151' }}>Opportunities</span>
              </div>
              <span className="text-[12px] font-semibold" style={{ color: reviewHeat > 0 ? '#ea580c' : '#d1d5db' }}>+{reviewHeat}</span>
            </div>
            <div className="flex items-center justify-between pt-1.5" style={{ borderTop: '1px solid #f3f4f6' }}>
              <span className="text-[12px] font-semibold" style={{ color: '#374151' }}>Total</span>
              <div className="flex items-center gap-1">
                <span className="text-[11px]">🔥</span>
                <span className="text-[12px] font-bold" style={{ color: '#ea580c' }}>{heat}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
