'use client'

import { useState } from 'react'
import { ChevronDown, DollarSign, Users, Film } from 'lucide-react'

interface NeedsCardProps {
  title: string
  icon: React.ReactNode
  summary: string | null
  children: React.ReactNode
  defaultOpen?: boolean
}

function NeedsCard({ title, icon, summary, children, defaultOpen = false }: NeedsCardProps) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div
      className="rounded-xl overflow-hidden transition-all flex flex-col"
      style={{
        background: '#FAFAF9',
        border: '1px solid #E7E5E4',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex flex-col items-center gap-2 px-5 py-5 cursor-pointer border-0 bg-transparent text-center"
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: 'rgba(124,58,237,0.10)' }}
        >
          {icon}
        </div>
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold m-0" style={{ color: '#1C1917' }}>
            {title}
          </h3>
          {summary && (
            <p className="text-[22px] font-bold m-0 mt-1" style={{ color: '#7C3AED' }}>
              {summary}
            </p>
          )}
        </div>
        <ChevronDown
          size={16}
          className="shrink-0 transition-transform duration-200"
          style={{
            color: '#A8A29E',
            transform: open ? 'rotate(180deg)' : 'rotate(0deg)',
          }}
        />
      </button>

      {open && (
        <div
          className="px-5 pb-5 space-y-6"
          style={{ borderTop: '1px solid #E7E5E4' }}
        >
          <div className="pt-4">
            {children}
          </div>
        </div>
      )}
    </div>
  )
}

interface ProjectNeedsCardsProps {
  investmentChildren: React.ReactNode
  crewChildren: React.ReactNode
  castChildren: React.ReactNode
  investmentSummary: string | null
  crewSummary: string | null
  castSummary: string | null
}

export function ProjectNeedsCards({
  investmentChildren,
  crewChildren,
  castChildren,
  investmentSummary,
  crewSummary,
  castSummary,
}: ProjectNeedsCardsProps) {
  return (
    <div>
      <h2
        className="text-[11px] uppercase tracking-[0.18em] font-semibold m-0 mb-4"
        style={{ color: '#78716C' }}
      >
        What This Project Needs
      </h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <NeedsCard
          title="Investment"
          icon={<DollarSign size={20} style={{ color: '#a78bfa' }} />}
          summary={investmentSummary}
        >
          {investmentChildren}
        </NeedsCard>

        <NeedsCard
          title="Crew"
          icon={<Film size={20} style={{ color: '#a78bfa' }} />}
          summary={crewSummary}
        >
          {crewChildren}
        </NeedsCard>

        <NeedsCard
          title="Cast"
          icon={<Users size={20} style={{ color: '#a78bfa' }} />}
          summary={castSummary}
        >
          {castChildren}
        </NeedsCard>
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
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: '#FAFAF9',
        border: '1px solid #E7E5E4',
      }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-4 px-6 py-5 cursor-pointer border-0 bg-transparent text-left"
      >
        {/* GEM diamond icon */}
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
