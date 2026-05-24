'use client'

import { useEffect, useState } from 'react'

// Shows a floating "New script" button that appears when the user scrolls
// past the dashboard header. On desktop it docks into the top-right;
// on mobile it floats above the bottom of the viewport.

export function StickyNewScript() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 160)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  if (!visible) return null

  return (
    <button
      onClick={() => window.dispatchEvent(new Event('gem:open-script-upload-modal'))}
      className="fixed z-50 flex items-center gap-1.5 px-4 py-2.5 rounded-full text-[13px] font-semibold text-white border-0 cursor-pointer transition-all hover:scale-105 active:scale-95"
      style={{
        background: 'linear-gradient(135deg, #7c3aed, #a855f7)',
        boxShadow: '0 4px 20px rgba(124,58,237,0.35)',
        bottom: '24px',
        right: '24px',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      New script
    </button>
  )
}
