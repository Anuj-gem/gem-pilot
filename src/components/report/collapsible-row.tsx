'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

interface Props {
  emoji: string
  title: string
  subtitle: string
  value: string
  valueColor?: string
  children: React.ReactNode
  defaultOpen?: boolean
}

export function CollapsibleRow({ emoji, title, subtitle, value, valueColor = '#1C1917', children, defaultOpen = false }: Props) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div style={{ borderBottom: '1px solid #f5f5f4' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between cursor-pointer border-0 bg-transparent text-left"
        style={{ padding: '14px 0' }}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[14px] shrink-0"
            style={{ background: '#EEEDFE' }}
          >
            {emoji}
          </div>
          <div>
            <div className="text-[14px] font-medium" style={{ color: '#1C1917' }}>{title}</div>
            <div className="text-[12px]" style={{ color: '#78716C' }}>{subtitle}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[16px] font-medium" style={{ color: valueColor }}>{value}</span>
          <ChevronDown
            size={16}
            className="transition-transform duration-200"
            style={{ color: '#A8A29E', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
          />
        </div>
      </button>
      {open && (
        <div className="pb-4">
          {children}
        </div>
      )}
    </div>
  )
}
