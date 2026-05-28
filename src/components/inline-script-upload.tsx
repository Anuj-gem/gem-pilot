'use client'

// InlineScriptUpload — drop-in inline upload component.
// Flow: format → upload PDF → validate → confirm → submit.
// Title, genre, and logline are extracted automatically by the eval prompt.
// Works on dashboard, scripts page, and review draft page.
// Supports dark variant for modal use (dark?: true).

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type DeclaredFormat = 'Feature film' | 'Series'

type Step = 'closed' | 'format' | 'upload' | 'validating' | 'confirmed' | 'submitting'

export function InlineScriptUpload({
  className,
  startOpen = false,
  onClose,
  redirectTo,
  dark = false,
}: {
  className?: string
  /** When true, the component starts on the format step instead of showing the closed button. */
  startOpen?: boolean
  /** Called when the user closes the component (X button or after successful upload). */
  onClose?: () => void
  /** If set, navigate here after successful upload instead of refreshing the current page. */
  redirectTo?: string
  /** Dark theme variant for modal use — #2b1a55 background, white text */
  dark?: boolean
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(startOpen ? 'format' : 'closed')
  const [format, setFormat] = useState<DeclaredFormat | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pageEstimate, setPageEstimate] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── Dark / light style tokens ──
  const bg = dark ? 'bg-[#2b1a55]' : 'bg-white'
  const textPrimary = dark ? 'text-white' : 'text-gray-900'
  const textSecondary = dark ? 'text-white/60' : 'text-gray-500'
  const textTertiary = dark ? 'text-white/40' : 'text-gray-400'
  const borderColor = dark ? 'border-white/10' : 'border-gray-100'
  const borderMedium = dark ? 'border-white/15' : 'border-gray-200'
  const borderDashed = dark ? 'border-white/20' : 'border-gray-300'
  const closeBtnClasses = dark
    ? 'text-white/40 hover:text-white/70 hover:bg-white/10'
    : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
  const cardBg = dark ? 'bg-white/5' : 'bg-gray-50'
  const iconColor = dark ? 'text-white/50' : 'text-gray-500'
  const dotInactive = dark ? 'bg-white/20' : 'bg-gray-200'
  const dropHover = dark
    ? 'hover:border-purple-400 hover:bg-purple-500/10'
    : 'hover:border-purple-400 hover:bg-purple-50/20'
  const formatCardBorder = dark ? 'border-white/10' : 'border-gray-200'
  const formatCardHover = dark ? 'hover:border-white/25' : 'hover:border-gray-300'
  const formatCardActive = dark ? 'border-purple-400 bg-purple-500/15' : 'border-purple-400 bg-purple-50/50'
  const backBtnClasses = dark
    ? 'text-white/50 hover:text-white/70'
    : 'text-gray-500 hover:text-gray-700'
  const retryClasses = dark
    ? 'text-purple-300 hover:text-purple-200'
    : 'text-purple-600 hover:text-purple-800'
  const outerBorder = dark
    ? '1px solid rgba(255,255,255,0.08)'
    : '1px solid rgba(0,0,0,0.08)'
  const outerShadow = dark
    ? '0 1px 3px rgba(0,0,0,0.2)'
    : '0 1px 3px rgba(0,0,0,0.04)'

  function reset() {
    setStep(startOpen ? 'format' : 'closed')
    setFormat(null)
    setFile(null)
    setError(null)
    setPageEstimate(null)
  }

  function handleClose() {
    reset()
    onClose?.()
  }

  function open() {
    setStep('format')
  }

  function handleFormatSelect(f: DeclaredFormat) {
    setFormat(f)
    setTimeout(() => setStep('upload'), 350)
  }

  function checkFileBasics(f: File): boolean {
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are accepted')
      return false
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large (max 10 MB)')
      return false
    }
    return true
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f || !checkFileBasics(f)) return
    setError(null)
    setFile(f)
    validateFile(f)
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f || !checkFileBasics(f)) return
    setError(null)
    setFile(f)
    validateFile(f)
  }

  async function validateFile(f: File) {
    setStep('validating')
    try {
      const formData = new FormData()
      formData.append('file', f)
      const res = await fetch('/api/validate-pdf', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json().catch(() => null)

      if (data?.valid) {
        setPageEstimate(data.page_estimate ?? null)
        setStep('confirmed')
      } else {
        setError(data?.reason ?? 'We couldn\'t read this file. Try a different PDF.')
        setStep('upload')
        setFile(null)
        if (fileInputRef.current) fileInputRef.current.value = ''
      }
    } catch {
      setError('Something went wrong checking your file. Please try again.')
      setStep('upload')
      setFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function beginAnalysis() {
    if (!format || !file) return
    setStep('submitting')
    setError(null)

    const placeholderTitle = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim() || 'Untitled'

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('title', placeholderTitle)
      form.append('declared_format', format)

      const startRes = await fetch('/api/start-submission', {
        method: 'POST',
        body: form,
      })
      const startData = await startRes.json().catch(() => null)

      if (startRes.status === 402 || startData?.error === 'paywall') {
        window.dispatchEvent(new Event('gem:open-upgrade-modal'))
        reset()
        return
      }
      if (!startRes.ok || !startData?.submission_id) {
        setError(startData?.error ?? 'Something went wrong')
        setStep('confirmed')
        return
      }

      // Fire scoring in the background — don't await
      fetch('/api/score-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: startData.submission_id }),
      }).catch(() => {})

      // Store anonymous upload IDs in a cookie
      {
        const existing = document.cookie
          .split('; ')
          .find(c => c.startsWith('gem_anon_scripts='))
          ?.split('=')[1] || ''
        const ids = existing ? existing.split(',') : []
        ids.push(startData.submission_id)
        document.cookie = `gem_anon_scripts=${ids.join(',')};path=/;max-age=3600;SameSite=Lax`
      }

      // Dispatch event so all pages can show an instant processing card
      window.dispatchEvent(new CustomEvent('gem:script-uploaded', {
        detail: {
          id: startData.submission_id,
          title: placeholderTitle,
          format,
        },
      }))

      reset()
      onClose?.()
      if (redirectTo) {
        router.push(redirectTo)
      } else {
        router.refresh()
      }
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
      setStep('confirmed')
    }
  }

  const activeStepIndex = step === 'format' ? 0 : 1
  const stepDots = (
    <div className="flex items-center gap-1.5 mb-4">
      <div className={`h-[3px] rounded-full transition-all ${activeStepIndex === 0 ? 'w-6 bg-purple-600' : `w-2 bg-purple-600`}`} />
      <div className={`h-[3px] rounded-full transition-all ${activeStepIndex >= 1 ? 'w-6 bg-purple-600' : `w-2 ${dotInactive}`}`} />
    </div>
  )

  if (step === 'closed') {
    return (
      <button
        onClick={open}
        className={`flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-[13px] font-semibold text-gray-400 hover:text-gray-600 hover:bg-white transition-all ${className ?? ''}`}
        style={{ border: '1px solid rgba(0,0,0,0.08)' }}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="7" y1="2" x2="7" y2="12" /><line x1="2" y1="7" x2="12" y2="7" />
        </svg>
        Add new script
      </button>
    )
  }

  return (
    <div className={`rounded-xl ${bg} overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${className ?? ''}`}
      style={{ border: outerBorder, boxShadow: outerShadow }}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b ${borderColor}`}>
        <span className={`text-[14px] font-semibold ${textPrimary}`}>Add script</span>
        <button
          onClick={handleClose}
          className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${closeBtnClasses}`}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <line x1="3" y1="3" x2="11" y2="11" /><line x1="11" y1="3" x2="3" y2="11" />
          </svg>
        </button>
      </div>

      <div className="px-4 py-4">
        {stepDots}

        {/* ── STEP 1: FORMAT ── */}
        {step === 'format' && (
          <div className="grid grid-cols-2 gap-2">
            {([
              { id: 'Feature film' as DeclaredFormat, label: 'Feature film', caption: '90–180 pages', icon: 'film' },
              { id: 'Series' as DeclaredFormat, label: 'Series', caption: 'Pilot or TV', icon: 'tv' },
            ]).map(f => (
              <button
                key={f.id}
                onClick={() => handleFormatSelect(f.id)}
                className={`flex flex-col items-center gap-1.5 py-4 px-3 border rounded-lg transition-all ${formatCardHover} ${
                  format === f.id ? formatCardActive : formatCardBorder
                }`}
              >
                <div className={`w-8 h-8 rounded-lg ${cardBg} flex items-center justify-center ${iconColor}`}>
                  {f.icon === 'film' ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="2" width="20" height="20" rx="2.18" /><line x1="7" y1="2" x2="7" y2="22" /><line x1="17" y1="2" x2="17" y2="22" /><line x1="2" y1="12" x2="22" y2="12" />
                    </svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="15" rx="2" /><polyline points="17 2 12 7 7 2" />
                    </svg>
                  )}
                </div>
                <span className={`text-[13px] font-semibold ${textPrimary}`}>{f.label}</span>
                <span className={`text-[11px] ${textTertiary}`}>{f.caption}</span>
              </button>
            ))}
          </div>
        )}

        {/* ── STEP 2: UPLOAD ── */}
        {step === 'upload' && (
          <div>
            <div
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              className={`border-[1.5px] border-dashed ${borderDashed} rounded-lg py-8 px-4 text-center cursor-pointer ${dropHover} transition-colors`}
            >
              <div className={`flex justify-center mb-2 ${textTertiary}`}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className={`text-[13px] ${textSecondary}`}>Drop your PDF here or click to browse</p>
              <p className={`text-[11px] ${textTertiary} mt-1`}>PDF only, up to 10 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {error && (
              <div className="mt-2">
                <p className="text-[12px] text-red-400">{error}</p>
                <button
                  onClick={() => { setError(null); fileInputRef.current?.click() }}
                  className={`text-[12px] font-semibold ${retryClasses} mt-1`}
                >
                  Try a different file
                </button>
              </div>
            )}
            <div className="flex justify-start mt-3">
              <button
                onClick={() => { setStep('format'); setError(null) }}
                className={`text-[12px] font-semibold ${backBtnClasses}`}
              >
                &larr; Back
              </button>
            </div>
          </div>
        )}

        {/* ── VALIDATING ── */}
        {step === 'validating' && (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className={`w-6 h-6 border-2 ${dark ? 'border-purple-300/30 border-t-purple-400' : 'border-purple-200 border-t-purple-600'} rounded-full animate-spin`} />
            </div>
            <p className={`text-[13px] font-semibold ${dark ? 'text-white/80' : 'text-gray-700'}`}>Checking your file...</p>
            <p className={`text-[11px] ${textTertiary} mt-1`}>{file?.name}</p>
          </div>
        )}

        {/* ── CONFIRMED — ready to go ── */}
        {step === 'confirmed' && (
          <div className="py-4 text-center">
            <div className="rounded-lg py-5 px-4" style={{
              border: dark ? '1px solid rgba(34,197,94,0.2)' : '1px solid rgba(34,197,94,0.3)',
              background: dark ? 'rgba(34,197,94,0.08)' : 'rgba(34,197,94,0.04)',
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="mx-auto mb-3">
                <circle cx="12" cy="12" r="12" fill="rgba(34,197,94,0.15)" />
                <path d="M7 12.5l3 3 6-6" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className={`text-[14px] font-semibold ${textPrimary} m-0 mb-0.5`}>Your script is ready</p>
              <p className={`text-[12px] ${textSecondary} m-0 mb-4`}>
                {file?.name}{pageEstimate ? ` · ~${pageEstimate} pages` : ''}
              </p>
              <button
                onClick={beginAnalysis}
                className="w-full py-3 rounded-lg text-[14px] font-bold text-white border-0 cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
              >
                Begin analysis
              </button>
              <p className={`text-[11px] ${textTertiary} mt-3 mb-0`}>Your report will appear on your dashboard. Delete it anytime.</p>
            </div>
            {error && (
              <p className="text-[12px] text-red-400 mt-2">{error}</p>
            )}
          </div>
        )}

        {/* ── SUBMITTING ── */}
        {step === 'submitting' && (
          <div className="py-8 text-center">
            <div className="flex justify-center mb-3">
              <div className={`w-6 h-6 border-2 ${dark ? 'border-purple-300/30 border-t-purple-400' : 'border-purple-200 border-t-purple-600'} rounded-full animate-spin`} />
            </div>
            <p className={`text-[13px] font-semibold ${dark ? 'text-white/80' : 'text-gray-700'}`}>Starting analysis...</p>
          </div>
        )}
      </div>
    </div>
  )
}
