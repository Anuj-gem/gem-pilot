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
        {/* Clapperboard icon */}
        <div className="inline-flex items-center justify-center w-10 h-10 rounded-xl mb-3"
          style={{ background: 'rgba(255,255,255,0.1)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 20h16a2 2 0 002-2V8H2v10a2 2 0 002 2z" />
            <path d="M2 8l2-4h16l2 4" />
            <path d="M6 4l2 4" />
            <path d="M10 4l2 4" />
            <path d="M14 4l2 4" />
          </svg>
        </div>

        <h1 className="text-[20px] font-bold text-white m-0 mb-4">
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
