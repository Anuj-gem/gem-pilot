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
      <div className="flex gap-1 mb-4" style={{ borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActive(tab.id)}
            className="px-4 py-2.5 text-[14px] font-medium transition-colors cursor-pointer bg-transparent border-0"
            style={{
              borderBottom: active === tab.id ? '2px solid #7c3aed' : '2px solid transparent',
              color: active === tab.id ? '#111827' : '#9ca3af',
              marginBottom: '-1px',
            }}
          >
            {tab.label}
            {tab.count !== undefined && tab.count > 0 && (
              <span
                className="ml-1.5 text-[11px] font-bold px-1.5 py-0.5 rounded-full"
                style={{
                  background: active === tab.id ? '#f3f0ff' : '#f3f4f6',
                  color: active === tab.id ? '#7c3aed' : '#9ca3af',
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
