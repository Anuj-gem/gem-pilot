'use client'

import { useState, type ReactNode } from 'react'

export type TabDef = { id: string; label: string; count?: number }

export function DashboardTabs({
  tabs,
  panels,
}: {
  tabs: TabDef[]
  panels: Record<string, ReactNode>
}) {
  const [active, setActive] = useState(tabs[0]?.id || '')

  return (
    <div>
      {/* Tab buttons */}
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className="px-4 py-2.5 text-[15px] font-semibold transition-colors cursor-pointer bg-transparent border-0"
            style={{
              borderBottom: active === tab.id ? '2px solid #7c3aed' : '2px solid transparent',
              color: active === tab.id ? '#ffffff' : 'rgba(255,255,255,0.45)',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className="ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: active === tab.id ? 'rgba(124,58,237,0.2)' : 'rgba(255,255,255,0.08)',
                  color: active === tab.id ? '#c4b5fd' : 'rgba(255,255,255,0.45)',
                }}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab panels — all rendered, visibility toggled */}
      {tabs.map(tab => (
        <div key={tab.id} style={{ display: active === tab.id ? 'block' : 'none' }}>
          {panels[tab.id]}
        </div>
      ))}
    </div>
  )
}
