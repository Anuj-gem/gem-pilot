'use client'

export function NewScriptButton() {
  return (
    <button
      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-white border-0 cursor-pointer transition-all hover:opacity-90"
      style={{ background: '#7c3aed' }}
      onClick={() => window.dispatchEvent(new Event('gem:open-script-upload-modal'))}
    >
      <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
        <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
      New script
    </button>
  )
}
