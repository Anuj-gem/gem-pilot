'use client'

// FormatSelectorHero — "What are you working on?" + Film / Series pills.
// Clicking either pill fires the upload modal event.

export function FormatSelectorHero() {
  function openUpload() {
    window.dispatchEvent(new Event('gem:open-script-upload-modal'))
  }

  return (
    <div className="text-center py-6">
      <h1 className="text-[22px] font-bold text-gray-900 m-0 mb-4">
        What are you working on?
      </h1>
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={openUpload}
          className="px-6 py-2.5 rounded-full text-[14px] font-semibold text-white border-0 cursor-pointer transition-all hover:brightness-110 hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          Film
        </button>
        <button
          onClick={openUpload}
          className="px-6 py-2.5 rounded-full text-[14px] font-semibold text-white border-0 cursor-pointer transition-all hover:brightness-110 hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
        >
          Series
        </button>
      </div>
    </div>
  )
}
