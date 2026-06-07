'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'

type CardKey = 'investment' | 'crew' | 'cast'

interface ProjectNeedsCardsProps {
  investmentChildren: React.ReactNode
  crewChildren: React.ReactNode
  castChildren: React.ReactNode
  investmentSummary: string | null
  investmentMetrics?: { projectCost: string | null; secured: string | null; considering: string | null } | null
  crewSummary: string | null
  castSummary: string | null
}

export function ProjectNeedsCards({
  investmentChildren,
  crewChildren,
  castChildren,
  crewSummary,
  castSummary,
}: ProjectNeedsCardsProps) {
  // One tab is always open (Finances by default) so the section is never an
  // empty, missable row of boxes. Familiar tab-menu pattern.
  const [activeTab, setActiveTab] = useState<CardKey>('investment')

  const childrenMap: Record<CardKey, React.ReactNode> = {
    investment: investmentChildren,
    crew: crewChildren,
    cast: castChildren,
  }

  const tabs: { key: CardKey; title: string; summary: string | null }[] = [
    { key: 'investment', title: 'Finances', summary: null },
    { key: 'crew', title: 'Crew', summary: crewSummary },
    { key: 'cast', title: 'Cast', summary: castSummary },
  ]

  // Pull the leading "N open" count out of a summary for the tab pill.
  const openCount = (summary: string | null): string | null => {
    if (!summary) return null
    const m = summary.match(/(\d+)\s*open/i)
    return m ? m[1] : null
  }

  return (
    <div>
      {/* Tab menu — familiar pattern, one tab always open */}
      <div className="flex" style={{ borderBottom: '1px solid #eee9e1', padding: '0 18px', background: '#fff' }}>
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key
          const count = tab.key === 'investment' ? null : openCount(tab.summary)
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="cursor-pointer"
              style={{
                appearance: 'none',
                background: 'none',
                border: 0,
                padding: '16px 4px 13px',
                marginRight: 22,
                fontSize: 15,
                fontWeight: 600,
                color: isActive ? '#1C1917' : '#78716C',
                borderBottom: isActive ? '2px solid #534AB7' : '2px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 7,
              }}
            >
              {tab.title}
              {count != null && (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 800,
                    color: isActive ? '#fff' : '#534AB7',
                    background: isActive ? '#534AB7' : '#F0EDFB',
                    borderRadius: 99,
                    padding: '1px 8px',
                  }}
                >
                  {count}
                </span>
              )}
            </button>
          )
        })}
      </div>

      {/* Body panel — one tab always open */}
      <div style={{ background: '#FFFFFF' }}>
        <div className="px-5 sm:px-7 py-5 sm:py-6">{childrenMap[activeTab]}</div>
      </div>
    </div>
  )
}

/* ── Collapsible GEM Analysis wrapper ── */
interface GemAnalysisCardProps {
  children: React.ReactNode
  score?: number | null
  tier?: string | null
}

export function GemAnalysisCard({ children, score, tier }: GemAnalysisCardProps) {
  const [open, setOpen] = useState(false)

  return (
    <div className="overflow-hidden" style={{ background: '#FFFFFF' }}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-6 py-5 cursor-pointer border-0 bg-transparent text-left"
      >
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center shrink-0 rotate-45"
          style={{ width: 28, height: 28 }}
        >
          <span className="absolute rotate-0" style={{ width: 28, height: 28, background: 'rgba(124, 58, 237, 0.08)', borderRadius: 2 }} />
          <span className="absolute rotate-0" style={{ width: 21, height: 21, background: 'rgba(124, 58, 237, 0.20)', borderRadius: 1.5 }} />
          <span className="absolute rotate-0" style={{ width: 15, height: 15, background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', borderRadius: 1 }} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[20px] font-bold m-0" style={{ color: '#1C1917' }}>GEM Analysis</h3>
        </div>
        <ChevronDown
          size={18}
          className="shrink-0 transition-transform duration-200"
          style={{ color: '#A8A29E', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      {open && (
        <div className="px-6 sm:px-8 pb-6 sm:pb-8 space-y-8" style={{ borderTop: '1px solid #E7E5E4' }}>
          {children}
        </div>
      )}
    </div>
  )
}
