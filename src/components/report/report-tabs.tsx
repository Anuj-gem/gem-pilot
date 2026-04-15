'use client'
import { useState } from 'react'
import { Lock } from 'lucide-react'

interface Props {
  pitch: React.ReactNode
  details: React.ReactNode
  detailsLocked?: boolean
  // Details tab is owner-only. Non-owners never see the tab at all.
  showDetails?: boolean
}

export function ReportTabs({ pitch, details, detailsLocked, showDetails = true }: Props) {
  const [tab, setTab] = useState<'pitch' | 'details'>('pitch')
  const activeTab = showDetails ? tab : 'pitch'
  return (
    <>
      <div className="flex border-b border-[var(--gem-gray-700)] mb-8 -mx-1">
        <TabBtn active={activeTab === 'pitch'} onClick={() => setTab('pitch')}>
          The Pitch
        </TabBtn>
        {showDetails && (
          <TabBtn active={activeTab === 'details'} onClick={() => setTab('details')}>
            {detailsLocked && <Lock size={12} />}
            <span>Details</span>
          </TabBtn>
        )}
      </div>
      <div>{activeTab === 'pitch' ? pitch : details}</div>
    </>
  )
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2 px-5 py-3.5 text-sm font-medium -mb-px transition-colors"
      style={{
        color: active ? 'var(--gem-white)' : 'var(--gem-gray-500)',
        borderBottom: `2px solid ${active ? 'var(--gem-accent)' : 'transparent'}`,
      }}
    >
      {children}
    </button>
  )
}
