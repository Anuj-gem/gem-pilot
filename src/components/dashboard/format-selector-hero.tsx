'use client'

// FormatSelectorHero — cinematic hero with inline upload flow.
// Flow: "What are you working on?" → Film/Series → file picker slides in from left →
// auto-submits → checkmark + fade right → resets to pills.

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type DeclaredFormat = 'Feature film' | 'Series'
type HeroState = 'pick' | 'upload' | 'success'

export function FormatSelectorHero() {
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

      <div className="relative w-full max-w-md">
        <h1 className="text-[28px] font-bold text-white m-0 mb-6">
          What are you working on?
        </h1>

        {/* FORMAT SELECTION — default state */}
        {state === 'pick' && (
          <div className="flex items-center justify-center gap-3 animate-in fade-in duration-300">
            <button
              onClick={() => handleFormatSelect('Feature film')}
              className="px-8 py-3 rounded-full text-[15px] font-semibold text-white border-0 cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
            >
              Film
            </button>
            <button
              onClick={() => handleFormatSelect('Series')}
              className="px-8 py-3 rounded-full text-[15px] font-semibold text-white border-0 cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
            >
              Series
            </button>
          </div>
        )}

        {/* FILE PICKER — slides in from left after format selected */}
        {state === 'upload' && (
          <div className="animate-in slide-in-from-left-4 fade-in duration-300">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-8 py-3 rounded-full text-[15px] font-semibold text-white border-0 cursor-pointer transition-all hover:scale-[1.04] active:scale-[0.98]"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)', boxShadow: '0 4px 14px rgba(124,58,237,0.4)' }}
            >
              <span className="flex items-center gap-2">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                Upload your screenplay
              </span>
            </button>
            <p className="text-[12px] text-white/50 mt-3">PDF only, up to 10 MB</p>
          </div>
        )}

        {/* SUCCESS — checkmark then fades out to right */}
        {state === 'success' && (
          <div className="animate-in slide-in-from-left-2 fade-in duration-200">
            <div className="flex items-center justify-center gap-2">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle cx="10" cy="10" r="10" fill="#22c55e" />
                <path d="M6 10.5l2.5 2.5 5.5-5.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span className="text-[15px] font-semibold text-white">Upload successful</span>
            </div>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-[12px] text-red-300 mt-3">{error}</p>
        )}

        {/* Hidden file input */}
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
