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

  // Structured investment lines for multi-line colored display
  const investmentLines: { text: string; color: string }[] = (() => {
    if (!investmentMetrics) return investmentSummary ? [{ text: investmentSummary, color: '#78716C' }] : []
    const lines: { text: string; color: string }[] = []
    if (investmentMetrics.projectCost) lines.push({ text: `Budget ${investmentMetrics.projectCost}`, color: '#78716C' })
    if (investmentMetrics.secured) lines.push({ text: `${investmentMetrics.secured} secured`, color: '#15803d' })
    if (investmentMetrics.considering) lines.push({ text: `${investmentMetrics.considering} pending`, color: '#d97706' })
    return lines
  })()

  const tabs: { key: CardKey; emoji: string; title: string; summary: string | null; highlightColor?: string }[] = [
    { key: 'investment', emoji: '💰', title: 'Finances', summary: null },
    { key: 'crew', emoji: '🎬', title: 'Crew', summary: crewSummary },
    { key: 'cast', emoji: '🎭', title: 'Cast', summary: castSummary },
  ]

  return (
    <div>
      {/* Tab strip — no wrapper title, tabs ARE the section */}
      <div className="flex" style={{ background: '#fff' }}>
        {tabs.map((tab, i) => {
          const isActive = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(isActive ? null : tab.key)}
              className="flex-1 cursor-pointer text-center transition-colors"
              style={{
                padding: '16px 12px 14px',
                border: 'none',
                borderLeft: i > 0 ? '1px solid #f0f0f0' : 'none',
                borderBottom: isActive ? '2px solid #534AB7' : '2px solid transparent',
                background: isActive ? '#F5F3FF' : '#fff',
              }}
            >
              <div className="text-[20px] m-0 mb-1">{tab.emoji}</div>
              <div
                className="text-[14px] font-semibold m-0"
                style={{ color: isActive ? '#534AB7' : '#78716C' }}
              >
                {tab.title}
              </div>
              {tab.key === 'investment' && investmentLines.length > 0 ? (
                <div className="m-0 mt-1">
                  {investmentLines.map((line, li) => (
                    <div
                      key={li}
                      className="text-[12px] leading-[1.4]"
                      style={{ color: isActive ? '#534AB7' : line.color }}
                    >
                      {line.text}
                    </div>
                  ))}
                </div>
              ) : tab.summary ? (
                <div
                  className="text-[12px] m-0 mt-1"
                  style={{ color: isActive ? '#534AB7' : '#78716C' }}
                >
                  {!isActive && tab.summary.includes('open') ? (
                    <>
                      {tab.summary.split(' · ').map((part, pi) => (
                        <span key={pi}>
                          {pi > 0 && <span> · </span>}
                          <span style={{ color: part.includes('open') ? '#15803d' : '#78716C' }}>{part}</span>
                        </span>
                      ))}
                    </>
                  ) : tab.summary}
                </div>
              ) : null}
            </button>
          )
        })}
      </div>

      {/* Body panel */}
      {activeTab && (
        <div style={{ borderTop: '1px solid #f0f0f0', background: '#FFFFFF' }}>
          <div className="px-5 sm:px-7 py-5 sm:py-6">
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
