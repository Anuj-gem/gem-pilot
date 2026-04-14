'use client'
import { useState } from 'react'
import { Lock } from 'lucide-react'

interface Props {
  pitch: React.ReactNode
  details: React.ReactNode
}

export function PreviewTabs({ pitch, details }: Props) {
  const [tab, setTab] = useState<'pitch' | 'details'>('pitch')
  return (
    <>
      <div className="flex border-b border-[var(--gem-gray-700)] mb-8 -mx-1">
        <TabBtn active={tab === 'pitch'} onClick={() => setTab('pitch')}>
          The Pitch
        </TabBtn>
        <TabBtn active={tab === 'details'} onClick={() => setTab('details')}>
          <Lock size={12} />
          <span>Details</span>
        </TabBtn>
      </div>
      <div>{tab === 'pitch' ? pitch : details}</div>
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
        color: active ? 'var(--gem-gray-50)' : 'var(--gem-gray-400)',
        borderBottom: `2px solid ${active ? 'var(--gem-accent)' : 'transparent'}`,
      }}
    >
      {children}
    </button>
  )
}
