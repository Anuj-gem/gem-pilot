'use client'

// FormatSelectorHero — cinematic hero with "What are you working on?" + Film / Series pills.
// Clicking either pill fires the upload modal event.

export function FormatSelectorHero() {
  function openUpload() {
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <div className="relative overflow-hidden rounded-2xl px-8 py-8 text-center"
      style={{
        background: 'linear-gradient(135deg, #1a1025 0%, #2d1b4e 40%, #4c1d95 100%)',
      }}>

      {/* Subtle star dots */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(1px 1px at 20% 30%, white, transparent), radial-gradient(1px 1px at 70% 20%, white, transparent), radial-gradient(1px 1px at 40% 70%, white, transparent), radial-gradient(1px 1px at 80% 60%, white, transparent), radial-gradient(1px 1px at 10% 80%, white, transparent), radial-gradient(1px 1px at 90% 40%, white, transparent), radial-gradient(1px 1px at 55% 10%, white, transparent), radial-gradient(1px 1px at 30% 50%, white, transparent)',
      }} />

      <div className="relative">
        <h1 className="text-[22px] font-bold text-white m-0 mb-4">
          What are you working on?
        </h1>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={openUpload}
            className="px-7 py-2.5 rounded-full text-[14px] font-semibold text-white border-0 cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
          >
            Film
          </button>
          <button
            onClick={openUpload}
            className="px-7 py-2.5 rounded-full text-[14px] font-semibold text-white border-0 cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
          >
            Series
          </button>
        </div>
      </div>
    </div>
  )
}
