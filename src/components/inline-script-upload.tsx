'use client'

// InlineScriptUpload — drop-in inline upload component.
// 3 steps: format → upload PDF → confirm title + genre + logline.
// Works on dashboard, scripts page, and review draft page.

import { useCallback, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

type DeclaredFormat = 'Feature film' | 'Series'

const GENRES = [
  'Action', 'Adventure', 'Animation', 'Comedy', 'Crime', 'Drama',
  'Fantasy', 'Horror', 'Mystery', 'Romance', 'Sci-fi', 'Thriller', 'Western',
]

type Step = 'closed' | 'format' | 'upload' | 'confirm'

export function InlineScriptUpload({
  className,
  startOpen = false,
  onClose,
}: {
  className?: string
  /** When true, the component starts on the format step instead of showing the closed button. */
  startOpen?: boolean
  /** Called when the user closes the component (X button or after successful upload). */
  onClose?: () => void
}) {
  const router = useRouter()
  const [step, setStep] = useState<Step>(startOpen ? 'format' : 'closed')
  const [format, setFormat] = useState<DeclaredFormat | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [genrePrimary, setGenrePrimary] = useState('')
  const [genreSecondary, setGenreSecondary] = useState('')
  const [logline, setLogline] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function reset() {
    setStep(startOpen ? 'format' : 'closed')
    setFormat(null)
    setFile(null)
    setTitle('')
    setGenrePrimary('')
    setGenreSecondary('')
    setLogline('')
    setError(null)
    setSubmitting(false)
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

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are accepted')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large (max 10 MB)')
      return
    }
    setError(null)
    setFile(f)
    // Infer title from filename
    const inferred = f.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim() || 'Untitled'
    setTitle(inferred)
    setStep('confirm')
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault()
    const f = e.dataTransfer.files?.[0]
    if (!f) return
    if (f.type !== 'application/pdf') {
      setError('Only PDF files are accepted')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('File too large (max 10 MB)')
      return
    }
    setError(null)
    setFile(f)
    const inferred = f.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim() || 'Untitled'
    setTitle(inferred)
    setStep('confirm')
  }

  async function handleSubmit() {
    if (!file || !format || !title.trim()) return
    setSubmitting(true)
    setError(null)

    try {
      const form = new FormData()
      form.append('file', file)
      form.append('title', title.trim())
      form.append('declared_format', format)
      if (title.trim()) form.append('declared_title', title.trim())
      if (genrePrimary) form.append('declared_genre_primary', genrePrimary)
      if (genreSecondary) form.append('declared_genre_secondary', genreSecondary)
      if (logline.trim()) form.append('declared_logline', logline.trim())

      const startRes = await fetch('/api/start-submission', {
        method: 'POST',
        body: form,
      })
      const startData = await startRes.json().catch(() => null)

      if (startRes.status === 402 || startData?.error === 'paywall') {
        window.dispatchEvent(new Event('gem:open-upgrade-modal'))
        setSubmitting(false)
        return
      }
      if (!startRes.ok || !startData?.submission_id) {
        setError(startData?.error ?? 'Something went wrong')
        setSubmitting(false)
        return
      }

      // Fire scoring in the background — don't await
      fetch('/api/score-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: startData.submission_id }),
      }).catch(() => {})

      // Store anonymous upload IDs in a cookie so the server can claim them
      // after the user signs up. The /start server page reads this cookie,
      // sets user_id on the matching rows, then clears it.
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
          title: title.trim(),
          format,
        },
      }))

      reset()
      onClose?.()
      router.refresh()
    } catch (e: any) {
      setError(e?.message ?? 'Network error')
      setSubmitting(false)
    }
  }

  const stepDots = (
    <div className="flex items-center gap-1.5 mb-4">
      <div className={`h-[3px] rounded-full transition-all ${step === 'format' ? 'w-6 bg-purple-600' : 'w-2 bg-purple-600'}`} />
      <div className={`h-[3px] rounded-full transition-all ${step === 'upload' ? 'w-6 bg-purple-600' : step === 'confirm' ? 'w-2 bg-purple-600' : 'w-2 bg-gray-200'}`} />
      <div className={`h-[3px] rounded-full transition-all ${step === 'confirm' ? 'w-6 bg-purple-600' : 'w-2 bg-gray-200'}`} />
    </div>
  )

  if (step === 'closed') {
    return (
      <button
        onClick={open}
        className={`flex items-center justify-center gap-2 w-full py-3 border-[1.5px] border-dashed border-gray-300 rounded-xl text-[13px] font-semibold text-gray-500 hover:border-purple-400 hover:text-purple-600 hover:bg-purple-50/30 transition-colors ${className ?? ''}`}
      >
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
          <line x1="7" y1="2" x2="7" y2="12" /><line x1="2" y1="7" x2="12" y2="7" />
        </svg>
        Add new script
      </button>
    )
  }

  return (
    <div className={`rounded-xl border-[1.5px] border-purple-400 bg-white overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 ${className ?? ''}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-[14px] font-semibold text-gray-900">Add script</span>
        <button
          onClick={handleClose}
          className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
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
                className={`flex flex-col items-center gap-1.5 py-4 px-3 border rounded-lg transition-all hover:border-gray-300 ${
                  format === f.id ? 'border-purple-400 bg-purple-50/50' : 'border-gray-200'
                }`}
              >
                <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center text-gray-500">
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
                <span className="text-[13px] font-semibold text-gray-900">{f.label}</span>
                <span className="text-[11px] text-gray-400">{f.caption}</span>
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
              className="border-[1.5px] border-dashed border-gray-300 rounded-lg py-8 px-4 text-center cursor-pointer hover:border-purple-400 hover:bg-purple-50/20 transition-colors"
            >
              <div className="flex justify-center mb-2 text-gray-400">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <p className="text-[13px] text-gray-500">Drop your PDF here or click to browse</p>
              <p className="text-[11px] text-gray-400 mt-1">PDF only, up to 10 MB</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
            {error && (
              <p className="text-[12px] text-red-600 mt-2">{error}</p>
            )}
            <div className="flex justify-start mt-3">
              <button
                onClick={() => { setStep('format'); setError(null) }}
                className="text-[12px] font-semibold text-gray-500 hover:text-gray-700"
              >
                &larr; Back
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: CONFIRM ── */}
        {step === 'confirm' && file && (
          <div>
            {/* File badge */}
            <div className="flex items-center gap-2.5 px-3 py-2.5 bg-gray-50 rounded-lg">
              <div className="w-8 h-8 rounded-md bg-purple-50 text-purple-600 flex items-center justify-center text-[11px] font-bold shrink-0">
                PDF
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold text-gray-900 m-0 truncate">{file.name}</p>
                <p className="text-[11px] text-gray-400 m-0 mt-0.5">
                  {(file.size / (1024 * 1024)).toFixed(1)} MB · {format}
                </p>
              </div>
              <button
                onClick={() => { setFile(null); setStep('upload') }}
                className="w-6 h-6 flex items-center justify-center rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 shrink-0"
              >
                <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                  <line x1="3" y1="3" x2="11" y2="11" /><line x1="11" y1="3" x2="3" y2="11" />
                </svg>
              </button>
            </div>

            {/* Title */}
            <div className="mt-3">
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-[13px] text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 placeholder:text-gray-300"
                placeholder="Script title"
              />
            </div>

            {/* Genre */}
            <div className="mt-3">
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Genre</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={genrePrimary}
                  onChange={e => setGenrePrimary(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 bg-white appearance-auto"
                >
                  <option value="">Primary</option>
                  {GENRES.map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
                <select
                  value={genreSecondary}
                  onChange={e => setGenreSecondary(e.target.value)}
                  className="w-full px-3 py-2 text-[13px] text-gray-900 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 bg-white appearance-auto"
                >
                  <option value="">Secondary (optional)</option>
                  {GENRES.filter(g => g !== genrePrimary).map(g => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Logline */}
            <div className="mt-3">
              <label className="block text-[12px] font-semibold text-gray-500 mb-1.5">Logline</label>
              <textarea
                value={logline}
                onChange={e => setLogline(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 text-[13px] text-gray-900 leading-[1.55] border border-gray-200 rounded-lg resize-y focus:outline-none focus:ring-2 focus:ring-purple-200 focus:border-purple-300 placeholder:text-gray-300"
                placeholder="One sentence that captures the premise..."
              />
            </div>

            {error && (
              <p className="text-[12px] text-red-600 mt-2">{error}</p>
            )}

            {/* Buttons */}
            <div className="flex items-center justify-end gap-2 mt-4">
              <button
                onClick={() => { setFile(null); setStep('upload'); setError(null) }}
                className="text-[12px] font-semibold text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-md border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !title.trim()}
                className="text-[12px] font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed px-4 py-1.5 rounded-md transition-colors"
              >
                {submitting ? 'Uploading...' : 'Upload and evaluate'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
