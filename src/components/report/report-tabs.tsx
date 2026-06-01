'use client'

import { useState } from 'react'

interface ReportTabsProps {
  publicPageUrl: string
  children: [React.ReactNode, React.ReactNode] // [ProjectTab, AnalysisTab]
}

export function ReportTabs({ publicPageUrl, children }: ReportTabsProps) {
  const [tab, setTab] = useState<'project' | 'analysis'>('project')

  return (
    <div>
      {/* Tab bar */}
      <div className="flex items-center border-b border-white/15 mb-6">
        <TabBtn active={tab === 'project'} onClick={() => setTab('project')}>
          Project
        </TabBtn>
        <TabBtn active={tab === 'analysis'} onClick={() => setTab('analysis')}>
          Analysis
        </TabBtn>
        <button
          className="px-4 py-2.5 text-sm text-white/30 cursor-default"
          disabled
        >
          Activity
        </button>
        <button
          className="px-4 py-2.5 text-sm text-white/30 cursor-default"
          disabled
        >
          Settings
        </button>
        <a
          href={publicPageUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto flex items-center gap-1.5 px-4 py-2.5 text-xs text-white/50 hover:text-white/70 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          View public page
        </a>
      </div>

      {/* Tab content — use display toggle to preserve state */}
      <div style={{ display: tab === 'project' ? 'block' : 'none' }}>
        {children[0]}
      </div>
      <div style={{ display: tab === 'analysis' ? 'block' : 'none' }}>
        {children[1]}
      </div>
    </div>
  )
}

function TabBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${
        active ? 'text-white' : 'text-white/50 hover:text-white/70'
      }`}
    >
      {children}
      {active && (
        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-white" />
      )}
    </button>
  )
}
