// GEM Analysis — tabbed card layout (2026-05-22).
//
// Replaces the nested <details> collapsibles with a full-width card
// containing four tabs: Overview, Narrative Analysis, Production &
// Development, Audience & Distribution.
//
// The card uses a slightly elevated dark surface with purple accent
// tabs to feel vivid without breaking the dark-canvas report theme.
'use client'

import { useState } from 'react'

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'narrative', label: 'Narrative Analysis' },
  { id: 'production', label: 'Production & Development' },
  { id: 'audience', label: 'Audience & Distribution' },
] as const

type TabId = (typeof TABS)[number]['id']

interface Props {
  children: React.ReactNode
}

/**
 * Wrap each tab's content in a <div data-tab="overview|narrative|production|audience">
 * inside this component. Only the active tab's content is visible.
 */
export function GemAnalysisTabs({ children }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <div className="mt-10">
      {/* Section header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-px flex-1" style={{ background: 'rgba(124,58,237,0.25)' }} />
        <span
          className="text-[11px] uppercase tracking-[0.25em] font-bold shrink-0"
          style={{ color: 'var(--gem-accent)' }}
        >
          GEM Analysis
        </span>
        <div className="h-px flex-1" style={{ background: 'rgba(124,58,237,0.25)' }} />
      </div>

      {/* Card */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.10)',
        }}
      >
        {/* Tab bar */}
        <div
          className="flex overflow-x-auto"
          style={{
            borderBottom: '1px solid rgba(255,255,255,0.08)',
            scrollbarWidth: 'none',
          }}
        >
          {TABS.map((tab) => {
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className="relative whitespace-nowrap px-5 py-3.5 text-[13px] font-semibold tracking-wide transition-colors flex-shrink-0"
                style={{
                  color: isActive
                    ? 'rgba(255,255,255,0.95)'
                    : 'rgba(255,255,255,0.40)',
                  background: isActive
                    ? 'rgba(124,58,237,0.08)'
                    : 'transparent',
                }}
              >
                {tab.label}
                {/* Active indicator bar */}
                {isActive && (
                  <span
                    className="absolute bottom-0 left-0 right-0 h-[2px]"
                    style={{ background: 'var(--gem-accent)' }}
                  />
                )}
              </button>
            )
          })}
        </div>

        {/* Tab content — render all, show only active via CSS so
            server-rendered content doesn't disappear on hydration. */}
        <div className="p-5 sm:p-7">
          {/* We iterate the React children and show/hide based on data-tab */}
          <TabContent activeTab={activeTab}>{children}</TabContent>
        </div>
      </div>
    </div>
  )
}

/**
 * Reads `data-tab` from each direct child div and toggles visibility.
 * Children without `data-tab` are always visible.
 */
function TabContent({
  activeTab,
  children,
}: {
  activeTab: TabId
  children: React.ReactNode
}) {
  // We use a simple approach: wrap children in a container and use
  // CSS to show/hide. This avoids unmounting server-rendered content.
  return (
    <>
      {/* Inject a style tag for tab visibility. This avoids needing
          to clone React children (which breaks with server components). */}
      <style>{`
        .gem-tab-panel { display: none; }
        .gem-tab-panel[data-tab="${activeTab}"] { display: block; }
      `}</style>
      {children}
    </>
  )
}
