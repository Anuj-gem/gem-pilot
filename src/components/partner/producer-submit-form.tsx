'use client'

// ProducerSubmitForm — single-screen file + format picker for producer
// /partner/submit. Anuj 2026-04-30. Hits the same /api/start-submission
// → /api/score-submission pair the writer flow uses; the score route
// detects the producer-owned case and skips matching + auto-publish.

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, FileText, Lock } from 'lucide-react'

type DeclaredFormat = 'Feature film' | 'Series'

// Stage labels rotated through during the ~45s scoring phase. They
// match the order GPT actually works through (read → score → notes).
const SCORING_STAGES = [
  'Reading the screenplay…',
  'Sizing characters and cast…',
  'Mapping production reality…',
  'Sketching packaging and audience…',
  'Weighing the development priorities…',
  'Writing your report…',
] as const

export function ProducerSubmitForm() {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [format, setFormat] = useState<DeclaredFormat>('Feature film')
  const [busy, setBusy] = useState(false)
  const [phase, setPhase] = useState<'idle' | 'uploading' | 'scoring'>('idle')
  const [error, setError] = useState<string | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [stageIndex, setStageIndex] = useState(0)
  const [progressPct, setProgressPct] = useState(0)

  // Stage text + bar animation while the score endpoint is grinding.
  // Rotates every ~7s; bar fills from 0→95 over ~50s and the API
  // response snaps it to 100 right before the redirect. Anuj
  // 2026-04-30.
  useEffect(() => {
    if (phase !== 'scoring') {
      setStageIndex(0)
      setProgressPct(0)
      return
    }
    setStageIndex(0)
    setProgressPct(8)
    const stageInterval = window.setInterval(() => {
      setStageIndex((i) => Math.min(i + 1, SCORING_STAGES.length - 1))
    }, 7500)
    const fillInterval = window.setInterval(() => {
      setProgressPct((p) => (p < 95 ? p + 1.2 : p))
    }, 600)
    return () => {
      window.clearInterval(stageInterval)
      window.clearInterval(fillInterval)
    }
  }, [phase])

  function pickFile() {
    fileInputRef.current?.click()
  }

  function acceptFile(f: File) {
    if (f.type && f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('That file isn’t a PDF. Export from Final Draft, WriterSolo, or Highland.')
      return
    }
    setError(null)
    setFile(f)
    if (!title.trim()) {
      const base = f.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim()
      setTitle(base.slice(0, 120))
    }
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null
    if (f) acceptFile(f)
  }

  function onDragOver(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!busy) setDragActive(true)
  }

  function onDragLeave(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
  }

  function onDrop(e: React.DragEvent<HTMLButtonElement>) {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)
    if (busy) return
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) acceptFile(dropped)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) {
      setError('Pick a PDF first.')
      return
    }
    if (!title.trim()) {
      setError('Title is required.')
      return
    }
    setError(null)
    setBusy(true)
    setPhase('uploading')
    try {
      const startForm = new FormData()
      startForm.append('file', file)
      startForm.append('title', title.trim())
      startForm.append('declared_format', format)
      const startRes = await fetch('/api/start-submission', {
        method: 'POST',
        body: startForm,
      })
      const startData = await startRes.json().catch(() => null)
      if (!startRes.ok || !startData?.submission_id) {
        throw new Error(
          startData?.error ?? `Couldn't register submission (${startRes.status}).`
        )
      }
      const submissionId = startData.submission_id as string

      setPhase('scoring')
      const scoreRes = await fetch('/api/score-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId }),
      })
      const scoreData = await scoreRes.json().catch(() => null)
      if (!scoreRes.ok || !scoreData?.evaluation_id) {
        throw new Error(
          scoreData?.error ?? `Scoring failed (${scoreRes.status}).`
        )
      }
      // Snap the bar to 100 so the producer sees a full track for a
      // beat before the redirect — feels finished instead of cut off.
      setProgressPct(100)
      await new Promise((r) => setTimeout(r, 250))
      router.push(`/report/${scoreData.evaluation_id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setBusy(false)
      setPhase('idle')
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl bg-white p-6 sm:p-7"
      style={{
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
      }}
    >
      {/* Privacy callout */}
      <div
        className="rounded-xl p-3.5 mb-6 flex items-start gap-3"
        style={{
          background: 'rgba(124,58,237,0.06)',
          border: '1px solid rgba(124,58,237,0.20)',
        }}
      >
        <Lock
          size={16}
          className="mt-[2px] shrink-0"
          style={{ color: 'var(--gem-accent)' }}
        />
        <p className="text-[13px] text-[var(--gem-gray-200)] m-0 leading-[1.5]">
          <span
            className="font-semibold"
            style={{ color: 'var(--gem-gray-50)' }}
          >
            Private to you.
          </span>{' '}
          This script will never appear in the matched feed, never get
          shared with another producer, and never publish anywhere.
        </p>
      </div>

      {/* File picker */}
      <label className="block text-[13px] uppercase tracking-[0.16em] font-bold text-[var(--gem-gray-500)] mb-2">
        Script PDF
      </label>
      <input
        ref={fileInputRef}
        type="file"
        accept="application/pdf,.pdf"
        onChange={onFileChange}
        style={{ display: 'none' }}
      />
      <button
        type="button"
        onClick={pickFile}
        onDragOver={onDragOver}
        onDragEnter={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        disabled={busy}
        className="w-full rounded-xl px-4 py-5 mb-5 transition-all flex items-center gap-3 text-left"
        style={{
          background: dragActive
            ? 'rgba(124,58,237,0.10)'
            : file
              ? 'rgba(124,58,237,0.05)'
              : 'var(--gem-gray-900)',
          border: dragActive
            ? '2px dashed var(--gem-accent)'
            : file
              ? '1px solid rgba(124,58,237,0.25)'
              : '1px dashed var(--gem-gray-700)',
          opacity: busy ? 0.6 : 1,
          cursor: busy ? 'not-allowed' : 'pointer',
        }}
      >
        {file ? (
          <FileText size={20} style={{ color: 'var(--gem-accent)' }} />
        ) : (
          <Upload size={20} style={{ color: 'var(--gem-gray-400)' }} />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-[var(--gem-gray-50)] m-0 truncate">
            {dragActive
              ? 'Drop the PDF to upload'
              : file
                ? file.name
                : 'Drag a PDF here, or click to pick one'}
          </p>
          <p className="text-[12.5px] text-[var(--gem-gray-400)] m-0 mt-0.5">
            {file
              ? `${(file.size / (1024 * 1024)).toFixed(1)} MB · click to change`
              : 'Digital export from Final Draft, WriterSolo, or Highland'}
          </p>
        </div>
      </button>

      {/* Title */}
      <label className="block text-[13px] uppercase tracking-[0.16em] font-bold text-[var(--gem-gray-500)] mb-2">
        Title
      </label>
      <input
        type="text"
        value={title}
        onChange={(e) => setTitle(e.target.value.slice(0, 120))}
        placeholder="What's it called?"
        disabled={busy}
        className="w-full rounded-xl px-4 py-3 mb-5 text-[15px] text-[var(--gem-gray-50)] outline-none"
        style={{
          background: 'var(--gem-gray-900)',
          border: '1px solid var(--gem-gray-700)',
        }}
      />

      {/* Format */}
      <label className="block text-[13px] uppercase tracking-[0.16em] font-bold text-[var(--gem-gray-500)] mb-2">
        Format
      </label>
      <div className="grid grid-cols-2 gap-2 mb-6">
        {(['Feature film', 'Series'] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFormat(f)}
            disabled={busy}
            className="rounded-xl px-4 py-3 text-[14.5px] font-semibold transition-colors"
            style={{
              background:
                format === f
                  ? 'rgba(124,58,237,0.08)'
                  : 'var(--gem-gray-900)',
              border:
                format === f
                  ? '1px solid rgba(124,58,237,0.30)'
                  : '1px solid var(--gem-gray-700)',
              color:
                format === f ? 'var(--gem-gray-50)' : 'var(--gem-gray-300)',
            }}
          >
            {f}
          </button>
        ))}
      </div>

      {error && (
        <p
          className="text-[13.5px] m-0 mb-4"
          style={{ color: 'var(--gem-warning)' }}
        >
          {error}
        </p>
      )}

      {phase === 'scoring' ? (
        <ScoringProgress
          stageLabel={SCORING_STAGES[stageIndex]}
          percent={progressPct}
        />
      ) : (
        <button
          type="submit"
          disabled={busy || !file || !title.trim()}
          className="w-full py-3 rounded-xl text-[15px] font-semibold transition-opacity"
          style={{
            background: 'var(--gem-accent)',
            color: '#fff',
            opacity: busy || !file || !title.trim() ? 0.6 : 1,
            cursor: busy || !file || !title.trim() ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 14px rgba(124,58,237,0.25)',
          }}
        >
          {phase === 'uploading' ? 'Uploading…' : 'Submit for a private GEM read'}
        </button>
      )}

      <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mt-4 leading-[1.5] text-center">
        Submit as many as you want — there's no cap on industry-partner
        accounts.
      </p>
    </form>
  )
}

function ScoringProgress({
  stageLabel,
  percent,
}: {
  stageLabel: string
  percent: number
}) {
  const pct = Math.max(0, Math.min(100, percent))
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'rgba(124,58,237,0.05)',
        border: '1px solid rgba(124,58,237,0.20)',
      }}
    >
      <div className="flex items-baseline justify-between gap-3 mb-2.5">
        <p
          className="text-[14px] font-semibold m-0"
          style={{ color: 'var(--gem-gray-50)' }}
        >
          {stageLabel}
        </p>
        <span
          className="text-[12.5px] tabular-nums font-semibold"
          style={{ color: 'var(--gem-accent)' }}
        >
          {Math.round(pct)}%
        </span>
      </div>
      <div
        className="rounded-full overflow-hidden"
        style={{
          background: 'var(--gem-gray-900)',
          border: '1px solid var(--gem-gray-700)',
          height: 8,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: '100%',
            background: 'var(--gem-accent)',
            transition: 'width 0.6s ease-out',
          }}
        />
      </div>
      <p
        className="text-[11.5px] m-0 mt-2.5 text-center"
        style={{ color: 'var(--gem-gray-500)' }}
      >
        Hang tight — full read takes about 45 seconds.
      </p>
    </div>
  )
}
