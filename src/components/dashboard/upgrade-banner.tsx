'use client'

// Small inline upgrade banner for free users. Dispatches the global
// upgrade modal event (handled by UpgradeModalListener).

interface Props {
  message: string
}

export function UpgradeBanner({ message }: Props) {
  return (
    <div className="rounded-lg bg-purple-50 border border-purple-100 px-4 py-2.5 mb-2.5 flex items-center justify-between">
      <p className="text-[12.5px] text-purple-700 font-semibold m-0">
        {message}
      </p>
      <button
        type="button"
        onClick={() => window.dispatchEvent(new CustomEvent('gem:open-upgrade-modal'))}
        className="shrink-0 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 px-3 py-1 rounded-md transition-colors"
      >
        Upgrade
      </button>
    </div>
  )
}
