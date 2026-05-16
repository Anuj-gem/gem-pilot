'use client'

// FormatSelectorHero — cinematic hero with inline upload flow.
// Flow: "What are you working on?" → Film/Series → file picker slides in from left →
// auto-submits → checkmark + fade right → resets to pills.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type DeclaredFormat = 'Feature film' | 'Series'
type HeroState = 'pick' | 'upload' | 'success'

export function FormatSelectorHero({ evalsRemaining = 99 }: { evalsRemaining?: number }) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [state, setState] = useState<HeroState>('pick')
  const [format, setFormat] = useState<DeclaredFormat | null>(null)
  const [error, setError] = useState<string | null>(null)

  function handleFormatSelect(f: DeclaredFormat) {
    setFormat(f)
    setError(null)
    setState('upload')
    // Auto-open file picker after brief delay for animation
    setTimeout(() => fileInputRef.current?.click(), 400)
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) {
      // User cancelled file picker — reset to format selection
      setState('pick')
      setFormat(null)
      return
    }
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are accepted')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large (max 10 MB)')
      return
    }
    setError(null)
    submitFile(f)
  }

  async function submitFile(f: File) {
    if (!format) return

    const placeholderTitle = f.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim() || 'Untitled'

    try {
      const formData = new FormData()
      formData.append('file', f)
      formData.append('title', placeholderTitle)
      formData.append('declared_format', format)

      const startRes = await fetch('/api/start-submission', {
        method: 'POST',
        body: formData,
      })
      const startData = await startRes.json().catch(() => null)

      if (startRes.status === 402 || startData?.error === 'paywall') {
        window.dispatchEvent(new Event('gem:open-upgrade-modal'))
        resetHero()
        return
      }
      if (!startRes.ok || !startData?.submission_id) {
        setError(startData?.error ?? 'Something went wrong')
        setState('pick')
        setFormat(null)
        return
      }

      // Fire scoring in the background
      fetch('/api/score-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: startData.submission_id }),
      }).catch(() => {})

      // Store anonymous upload IDs in cookie for later claim
      const existing = document.cookie
        .split('; ')
        .find(c => c.startsWith('gem_anon_scripts='))
        ?.split('=')[1] || ''
      const ids = existing ? existing.split(',') : []
      ids.push(startData.submission_id)
      document.cookie = `gem_anon_scripts=${ids.join(',')};path=/;max-age=3600;SameSite=Lax`

      // Dispatch event so dashboard shows processing card
      window.dispatchEvent(new CustomEvent('gem:script-uploaded', {
        detail: {
          id: startData.submission_id,
          title: placeholderTitle,
          format,
        },
      }))

      // Show success state
      setState('success')
      setTimeout(() => {
        resetHero()
        router.refresh()
      }, 1500)

    } catch (e: any) {
      setError(e?.message ?? 'Network error')
      setState('pick')
      setFormat(null)
    }
  }

  function resetHero() {
    setState('pick')
    setFormat(null)
    setError(null)
    // Reset file input
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  return (
    <div className="relative overflow-hidden rounded-2xl px-8 text-center flex flex-col items-center justify-center min-h-[48vh]"
      style={{
        background: 'linear-gradient(135deg, #1a1025 0%, #2d1b4e 40%, #4c1d95 100%)',
      }}>

      {/* Subtle star dots */}
      <div className="absolute inset-0 opacity-20" style={{
        backgroundImage: 'radial-gradient(1px 1px at 20% 30%, white, transparent), radial-gradient(1px 1px at 70% 20%, white, transparent), radial-gradient(1px 1px at 40% 70%, white, transparent), radial-gradient(1px 1px at 80% 60%, white, transparent), radial-gradient(1px 1px at 10% 80%, white, transparent), radial-gradient(1px 1px at 90% 40%, white, transparent), radial-gradient(1px 1px at 55% 10%, white, transparent), radial-gradient(1px 1px at 30% 50%, white, transparent)',
      }} />

      <div className="relative w-full max-w-lg">
        <h1 className="text-[36px] font-bold text-white m-0 mb-8">
          What are you working on?
        </h1>

        {/* FORMAT SELECTION — default state */}
        {state === 'pick' && evalsRemaining > 0 && (
          <div className="flex items-center justify-center gap-4 animate-in fade-in duration-300">
            <button
              onClick={() => handleFormatSelect('Feature film')}
              className="px-10 py-4 rounded-full text-[17px] font-semibold text-white border-0 cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
            >
              Film
            </button>
            <button
              onClick={() => handleFormatSelect('Series')}
              className="px-10 py-4 rounded-full text-[17px] font-semibold text-white border-0 cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
            >
              Series
            </button>
          </div>
        )}

        {/* LOCKED STATE — at limit */}
        {state === 'pick' && evalsRemaining <= 0 && (
          <div className="flex flex-col items-center gap-5 animate-in fade-in duration-300">
            <div className="flex items-center justify-center gap-4">
              <button
                disabled
                className="px-10 py-4 rounded-full text-[17px] font-semibold text-white/40 border-0 cursor-not-allowed"
                style={{ background: 'rgba(124,58,237,0.25)' }}
              >
                Film
              </button>
              <button
                disabled
                className="px-10 py-4 rounded-full text-[17px] font-semibold text-white/40 border-0 cursor-not-allowed"
                style={{ background: 'rgba(124,58,237,0.25)' }}
              >
                Series
              </button>
            </div>
            <p className="text-[14px] text-white/60 m-0">You&apos;ve used your free evaluations</p>
            <button
              onClick={() => window.dispatchEvent(new Event('gem:open-upgrade-modal'))}
              className="px-8 py-3.5 rounded-full text-[16px] font-bold text-white border-0 cursor-pointer transition-all hover:scale-[1.03] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
            >
              Become a member to keep uploading
            </button>
          </div>
        )}

        {/* DRAG & DROP ZONE — slides in from left after format selected */}
        {state === 'upload' && (
          <div className="animate-in slide-in-from-left-4 fade-in duration-300">
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = '#a855f7' }}
              onDragLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)' }}
              onDrop={e => {
                e.preventDefault()
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)'
                const f = e.dataTransfer.files?.[0]
                if (!f) return
                if (f.type !== 'application/pdf') { setError('Only PDF files are accepted'); return }
                if (f.size > 10 * 1024 * 1024) { setError('File too large (max 10 MB)'); return }
                setError(null)
                submitFile(f)
              }}
              className="w-full rounded-2xl py-12 px-8 text-center cursor-pointer transition-all hover:border-purple-400"
              style={{ border: '2px dashed rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.05)' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-4 opacity-70">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-[16px] text-white font-medium m-0 mb-2">Drop your screenplay here</p>
              <p className="text-[13px] text-white/50 m-0">or click to browse · PDF, up to 10 MB</p>
            </div>
            <p className="text-[12px] text-white/40 mt-4">Your scripts are completely private to you</p>
          </div>
        )}

        {/* SUCCESS — checkmark then fades out */}
        {state === 'success' && (
          <div className="animate-in slide-in-from-left-2 fade-in duration-200">
            <div className="flex items-center justify-center gap-3">
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <circle cx="14" cy="14" r="14" fill="#22c55e" />
                <path d="M8 14.5l3.5 3.5 8-8" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[18px] font-semibold text-white">Upload successful</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-[13px] text-red-300 mt-4">{error}</p>
        )}

        {/* Hidden file input (fallback for click-to-browse) */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,application/pdf"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>
    </div>
  )
}
