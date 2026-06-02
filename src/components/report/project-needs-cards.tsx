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
  investmentSummary,
  investmentMetrics,
  crewSummary,
  castSummary,
}: ProjectNeedsCardsProps) {
  const [activeTab, setActiveTab] = useState<CardKey | null>(null)

  const childrenMap: Record<CardKey, React.ReactNode> = {
    investment: investmentChildren,
    crew: crewChildren,
    cast: castChildren,
  }

  // Build summary text lines for each tab
  const investmentLine = (() => {
    if (investmentMetrics) {
      const parts: string[] = []
      if (investmentMetrics.projectCost) parts.push(`${investmentMetrics.projectCost} cost`)
      if (investmentMetrics.secured) parts.push(`${investmentMetrics.secured} secured`)
      if (investmentMetrics.considering) parts.push(`${investmentMetrics.considering} considering`)
      if (parts.length > 0) return parts.join(' · ')
    }
    return investmentSummary
  })()

  const tabs: { key: CardKey; title: string; summary: string | null }[] = [
    { key: 'investment', title: 'Investment', summary: investmentLine },
    { key: 'crew', title: 'Crew', summary: crewSummary },
    { key: 'cast', title: 'Cast', summary: castSummary },
  ]

  return (
    <div>
      <h2
        className="text-[11px] uppercase tracking-[0.18em] font-semibold m-0 mb-4"
        style={{ color: '#78716C' }}
      >
        What This Project Needs
      </h2>

      {/* Tab strip — connected to body panel */}
      <div
        className="flex overflow-hidden"
        style={{
          border: 'none',
          borderBottom: activeTab ? 'none' : 'none',
        }}
      >
        {tabs.map((tab, i) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(isActive ? null : tab.key)}
              className="flex-1 cursor-pointer text-center transition-colors"
              style={{
                padding: '14px 12px 12px',
                border: 'none',
                borderLeft: i > 0 ? '1px solid #E7E5E4' : 'none',
                borderBottom: isActive ? '2px solid #534AB7' : '2px solid transparent',
                background: isActive ? '#F5F3FF' : '#FAFAF9',
              }}
            >
              <div
                className="text-[14px] font-semibold m-0"
                style={{ color: isActive ? '#534AB7' : '#78716C' }}
              >
                {tab.title}
              </div>
              {tab.summary && (
                <div
                  className="text-[12px] m-0 mt-1"
                  style={{ color: tab.key === 'cast' && !isActive ? '#534AB7' : '#78716C' }}
                >
                  {tab.summary}
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Body panel — directly attached below tabs */}
      {activeTab && (
        <div
          style={{
            borderTop: '1px solid #E7E5E4',
            background: '#FFFFFF',
          }}
        >
          <div className="px-5 sm:px-6 py-5 sm:py-6">
            {childrenMap[activeTab]}
          </div>
        </div>
      )}
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
    <div
      className="overflow-hidden"
      style={{ background: '#FFFFFF' }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-6 py-5 cursor-pointer border-0 bg-transparent text-left"
      >
        <span
          aria-hidden="true"
          className="inline-flex items-center justify-center shrink-0 rotate-45"
          style={{ width: 28, height: 28 }}
        >
          <span className="absolute rotate-0" style={{
            width: 28, height: 28,
            background: 'rgba(124, 58, 237, 0.08)',
            borderRadius: 2,
          }} />
          <span className="absolute rotate-0" style={{
            width: 21, height: 21,
            background: 'rgba(124, 58, 237, 0.20)',
            borderRadius: 1.5,
          }} />
          <span className="absolute rotate-0" style={{
            width: 15, height: 15,
            background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
            borderRadius: 1,
          }} />
        </span>
        <div className="flex-1 min-w-0">
          <h3 className="text-[17px] font-bold m-0" style={{ color: '#1C1917' }}>
            GEM Analysis
          </h3>
          <p className="text-[13px] m-0 mt-0.5" style={{ color: '#78716C' }}>
            Score breakdown, strengths, and development notes
          </p>
        </div>
        {score != null && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <span className="text-[28px] font-bold" style={{ color: '#7C3AED' }}>
                {score}
              </span>
              {tier && (
                <p className="text-[11px] font-medium m-0 uppercase tracking-wider" style={{ color: '#78716C' }}>
                  {tier}
                </p>
              )}
            </div>
          </div>
        )}
        <ChevronDown
          size={18}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: '#A8A29E',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
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
