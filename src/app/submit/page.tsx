'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import Nav from '@/components/nav'
import { PaywallModal } from '@/components/ui/paywall-modal'
import { Upload, FileText, Loader2, AlertCircle, CheckCircle, Settings } from 'lucide-react'

export default function SubmitPage() {
  return (
    <Suspense>
      <SubmitPageInner />
    </Suspense>
  )
}

function SubmitPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [progress, setProgress] = useState<string | null>(null)
  const [showPaywall, setShowPaywall] = useState(false)
  const [subscriptionStatus, setSubscriptionStatus] = useState<string | null>(null)
  const [freeEvalUsed, setFreeEvalUsed] = useState<boolean | null>(null)

  const justSubscribed = searchParams.get('subscribed') === 'true'

  // Check subscription status on mount
  useEffect(() => {
    async function checkAccess() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('subscription_status, free_eval_used')
        .eq('id', user.id)
        .single()

      if (profile) {
        setSubscriptionStatus(profile.subscription_status)
        setFreeEvalUsed(profile.free_eval_used)
      }
    }
    checkAccess()
  }, [])

  const isSubscribed = subscriptionStatus === 'active'
  const hasFreeEval = freeEvalUsed === false

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

  const handleManageSubscription = async () => {
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const data = await res.json()
    if (data.url) window.location.href = data.url
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file || !title) return

    setSubmitting(true)
    setError(null)
    setProgress('Uploading script...')

    try {
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

      if (data.error === 'subscription_required') {
        setShowPaywall(true)
        setSubmitting(false)
        setProgress(null)
        return
      }

      if (!res.ok || data.status === 'failed') {
        throw new Error(data.error || 'Evaluation failed')
      }

      router.push(`/report/${data.evaluation_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setSubmitting(false)
      setProgress(null)
    }
  }

  // Determine button text
  let buttonText = 'Evaluate my script'
  if (hasFreeEval && !isSubscribed) {
    buttonText = 'Evaluate my script — free'
  } else if (isSubscribed) {
    buttonText = 'Evaluate my script'
  }

  return (
    <>
      <Nav />
      <div className="max-w-lg mx-auto px-4 py-10">
        {justSubscribed && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-emerald-950/30 border border-emerald-800 text-emerald-300 text-sm mb-6">
            <CheckCircle size={16} className="mt-0.5 shrink-0" />
            You're subscribed — evaluate unlimited scripts.
          </div>
        )}

        <h1 className="text-2xl font-bold mb-1">Submit a script</h1>
        <p className="text-sm text-[var(--gem-gray-400)] mb-2">
          Upload your screenplay and get a professional evaluation with scores, development notes, and production analysis.
        </p>

        {/* Subscription status badge */}
        {subscriptionStatus !== null && (
          <div className="flex items-center gap-3 mb-8">
            {isSubscribed ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-950/50 border border-emerald-700 text-emerald-400">
                <CheckCircle size={12} /> Subscribed — unlimited evals
              </span>
            ) : hasFreeEval ? (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-blue-950/50 border border-blue-700 text-blue-400">
                1 free evaluation available
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-[var(--gem-gray-800)] border border-[var(--gem-gray-600)] text-[var(--gem-gray-400)]">
                Subscribe to evaluate scripts
              </span>
            )}
            {isSubscribed && (
              <button
                onClick={handleManageSubscription}
                className="inline-flex items-center gap-1 text-xs text-[var(--gem-gray-400)] hover:text-white transition-colors"
              >
                <Settings size={12} /> Manage
              </button>
            )}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
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
                  <span className="text-xs text-[var(--gem-gray-500)] mt-1">Max 10MB</span>
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

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/30 border border-red-800 text-red-300 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              {error}
            </div>
          )}

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
              buttonText
            )}
          </button>

          <p className="text-xs text-center text-[var(--gem-gray-500)]">
            Your script is evaluated by AI using the same rubric applied to produced film and television.
          </p>
        </form>
      </div>

      {showPaywall && <PaywallModal onClose={() => setShowPaywall(false)} />}
    </>
  )
}
