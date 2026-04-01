'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Nav from '@/components/nav'
import { Upload, FileText, Loader2, AlertCircle } from 'lucide-react'

export default function SubmitPage() {
  const router = useRouter()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0]
    if (selected) {
      if (selected.type !== 'application/pdf') {
        setError('Please upload a PDF file')
        return
      }
      if (selected.size > 10 * 1024 * 1024) {
        setError('File too large (max 10MB)')
        return
      }
      setFile(selected)
      setError(null)
      // Auto-fill title from filename if empty
      if (!title) {
        const name = selected.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ')
        setTitle(name)
      }
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    const dropped = e.dataTransfer.files?.[0]
    if (dropped) {
      if (dropped.type !== 'application/pdf') {
        setError('Please upload a PDF file')
        return
      }
      setFile(dropped)
      setError(null)
      if (!title) {
        const name = dropped.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ')
        setTitle(name)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return

    setSubmitting(true)
    setError(null)
    setProgress('Uploading script...')

    try {
      // Check auth
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/login?redirect=/submit')
        return
      }

      setProgress('Analyzing your script — this takes about 30 seconds...')

      const formData = new FormData()
      formData.append('file', file)
      formData.append('title', title)

      const res = await fetch('/api/evaluate', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (!res.ok || data.status === 'failed') {
        throw new Error(data.error || 'Evaluation failed')
      }

      // Redirect to report
      router.push(`/report/${data.evaluation_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
      setProgress(null)
    }
  }

  return (
    <>
      <Nav />
      <div className="max-w-lg mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold mb-1">Submit a script</h1>
        <p className="text-sm text-[var(--gem-gray-400)] mb-8">
          Upload your screenplay and get a professional development evaluation with scores, insights, and production analysis.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">
              Script title
            </label>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
              placeholder="e.g. Superstition, Canela Café"
            />
          </div>

          {/* File upload */}
          <div>
            <label className="block text-sm font-medium text-[var(--gem-gray-300)] mb-1">
              Script file (PDF)
            </label>
            <div
              onDragOver={e => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`
                relative flex flex-col items-center justify-center py-10 px-4
                border-2 border-dashed rounded-xl cursor-pointer transition-colors
                ${file
                  ? 'border-[var(--gem-accent)] bg-[var(--gem-accent)]/5'
                  : 'border-[var(--gem-gray-600)] hover:border-[var(--gem-gray-400)]'
                }
              `}
            >
              {file ? (
                <>
                  <FileText size={32} className="text-[var(--gem-accent)] mb-2" />
                  <span className="text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-[var(--gem-gray-400)] mt-1">
                    {(file.size / 1024).toFixed(0)} KB — click to change
                  </span>
                </>
              ) : (
                <>
                  <Upload size={32} className="text-[var(--gem-gray-400)] mb-2" />
                  <span className="text-sm text-[var(--gem-gray-300)]">
                    Drop your PDF here or click to browse
                  </span>
                  <span className="text-xs text-[var(--gem-gray-500)] mt-1">
                    Max 10MB
                  </span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800 text-red-300 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Submit button */}
          <button
            type="submit"
            disabled={submitting || !file || !title}
            className="w-full py-3 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 size={18} className="animate-spin" />
                {progress}
              </span>
            ) : (
              'Evaluate my script — $20'
            )}
          </button>

          <p className="text-xs text-center text-[var(--gem-gray-500)]">
            Your script is evaluated by AI using the same rubric applied to produced film and television.
            Results include dimension scores, development notes, and production analysis.
          </p>
        </form>
      </div>
    </>
  )
}
