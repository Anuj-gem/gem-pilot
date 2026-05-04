'use client'

// Tiny pill button that triggers the upgrade modal. Used inside locked
// script card overlays where the full UpgradeBanner is too large.

export function UpgradePill({ label = 'Upgrade to view' }: { label?: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
      className="text-[11px] font-bold text-purple-600 bg-white border border-purple-200 px-3 py-1 rounded-full shadow-sm flex items-center gap-1 hover:bg-purple-50 transition-colors cursor-pointer"
    >
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="5" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.5V4a2 2 0 114 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      {label}
    </button>
  )
}
