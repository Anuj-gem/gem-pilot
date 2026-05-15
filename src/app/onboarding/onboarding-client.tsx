'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { trackSignupStart, trackSignupComplete, identifyUser } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'

// ─── Types ──────────────────────────────────────────────────────────

type Step = 'name' | 'upload' | 'results' | 'account'
type DeclaredFormat = 'Feature film' | 'Series'

type UploadedScript = {
  id: string
  title: string
  format: DeclaredFormat
  status: 'processing' | 'completed'
  progress: number
  score?: number
  tier?: string
  genres?: string[]
  evaluation?: any
  discoverOn: boolean
  selectedOpps: string[]
}

type MatchedOpp = {
  id: string
  title: string
  deadline: string | null
  min_score: number | null
}

// ─── Helpers ────────────────────────────────────────────────────────

function getCookie(name: string): string {
  if (typeof document === 'undefined') return ''
  const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'))
  return match ? decodeURIComponent(match[2]) : ''
}

function setCookie(name: string, value: string, days = 7) {
  if (typeof document === 'undefined') return
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${name}=${encodeURIComponent(value)};expires=${expires};path=/`
}

function tierColor(tier: string | undefined): string {
  if (!tier) return 'bg-gray-100 text-gray-700'
  if (tier === 'Greenlight Material') return 'bg-emerald-50 text-emerald-700 border border-emerald-200'
  if (tier === 'Optionable') return 'bg-purple-50 text-purple-700 border border-purple-200'
  return 'bg-amber-50 text-amber-700 border border-amber-200'
}

function scoreGradient(score: number | undefined): string {
  if (!score) return 'from-purple-600 to-purple-500'
  return score >= 70 ? 'from-emerald-500 to-emerald-400' : 'from-purple-600 to-purple-500'
}

// ─── Component ──────────────────────────────────────────────────────

export function OnboardingClient() {
  const router = useRouter()
  const supabase = createClient()

  // Global state
  const [step, setStep] = useState<Step>('name')
  const [firstName, setFirstName] = useState('')

  // Upload state
  const [scripts, setScripts] = useState<UploadedScript[]>([])
  const [showFormatPicker, setShowFormatPicker] = useState(false)
  const [pendingFormat, setPendingFormat] = useState<DeclaredFormat | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Results state
  const [selectedScriptId, setSelectedScriptId] = useState<string | null>(null)
  const [opportunities, setOpportunities] = useState<MatchedOpp[]>([])

  // Account state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [accountError, setAccountError] = useState('')
  const [accountLoading, setAccountLoading] = useState(false)
  const [showLeaveDialog, setShowLeaveDialog] = useState(false)

  // Auto-advance progress animation
  useEffect(() => {
    const interval = setInterval(() => {
      setScripts(prev =>
        prev.map(s => {
          if (s.status === 'processing' && s.progress < 90) {
            return { ...s, progress: Math.min(s.progress + Math.random() * 8 + 2, 90) }
          }
          return s
        })
      )
    }, 500)
    return () => clearInterval(interval)
  }, [])

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      pollingRefs.current.forEach(t => clearInterval(t))
    }
  }, [])

  // Auto-select first script when entering results
  useEffect(() => {
    if (step === 'results' && scripts.length > 0 && !selectedScriptId) {
      setSelectedScriptId(scripts[0].id)
    }
  }, [step, scripts, selectedScriptId])

  // Fetch opportunities when entering results
  useEffect(() => {
    if (step !== 'results') return
    const completedIds = scripts.filter(s => s.status === 'completed').map(s => s.id)
    if (completedIds.length === 0) return

    fetch(`/api/onboarding-opportunities?ids=${completedIds.join(',')}`)
      .then(r => r.ok ? r.json() : { opportunities: [] })
      .then(data => setOpportunities(data.opportunities || []))
      .catch(() => setOpportunities([]))
  }, [step, scripts])

  // ─── Polling ────────────────────────────────────────────────────────

  const startPolling = useCallback((scriptId: string) => {
    if (pollingRefs.current.has(scriptId)) return

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/submission-status?id=${scriptId}`)
        if (!res.ok) return
        const data = await res.json()

        if (data.status === 'completed') {
          clearInterval(interval)
          pollingRefs.current.delete(scriptId)

          setScripts(prev =>
            prev.map(s =>
              s.id === scriptId
                ? {
                    ...s,
                    status: 'completed' as const,
                    progress: 100,
                    title: data.title || s.title,
                    score: data.score,
                    tier: data.tier,
                    genres: data.genres || [],
                    evaluation: data.evaluation,
                  }
                : s
            )
          )
        }
      } catch {
        // Silently retry on next interval
      }
    }, 2000)

    pollingRefs.current.set(scriptId, interval)
  }, [])

  // Auto-advance from upload to results
  useEffect(() => {
    if (step !== 'upload') return
    if (scripts.length === 0) return
    const allDone = scripts.every(s => s.status === 'completed')
    if (!allDone) return

    const timeout = setTimeout(() => setStep('results'), 1500)
    return () => clearTimeout(timeout)
  }, [step, scripts])

  // ─── Upload handlers ───────────────────────────────────────────────

  async function handleFileUpload(file: File, format: DeclaredFormat) {
    if (file.type !== 'application/pdf') return
    if (file.size > 10 * 1024 * 1024) return
    const titleFromFile = file.name.replace(/\.pdf$/i, '').replace(/[_-]/g, ' ').trim() || 'Untitled'
    const formData = new FormData()
    formData.append('file', file)
    formData.append('title', titleFromFile)
    formData.append('declared_format', format)

    try {
      const res = await fetch('/api/start-submission', { method: 'POST', body: formData })
      if (!res.ok) return
      const data = await res.json()
      const submissionId = data.submission_id || data.id

      // Fire-and-forget scoring
      fetch('/api/score-submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ submission_id: submissionId }),
      })

      // Store in cookie
      const existing = getCookie('gem_anon_scripts')
      const ids = existing ? `${existing},${submissionId}` : submissionId
      setCookie('gem_anon_scripts', ids)

      const newScript: UploadedScript = {
        id: submissionId,
        title: titleFromFile,
        format,
        status: 'processing',
        progress: 0,
        discoverOn: false,
        selectedOpps: [],
      }

      setScripts(prev => [...prev, newScript])
      startPolling(submissionId)

      // Reset format picker
      setShowFormatPicker(false)
      setPendingFormat(null)
    } catch {
      // Upload failed silently
    }
  }

  function handleFormatSelect(format: DeclaredFormat) {
    setPendingFormat(format)
    setTimeout(() => fileInputRef.current?.click(), 50)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !pendingFormat) return
    handleFileUpload(file, pendingFormat)
    e.target.value = ''
  }

  // ─── Results handlers ──────────────────────────────────────────────

  function toggleDiscover(scriptId: string) {
    setScripts(prev =>
      prev.map(s => (s.id === scriptId ? { ...s, discoverOn: !s.discoverOn } : s))
    )
  }

  function toggleOpp(scriptId: string, oppId: string) {
    setScripts(prev =>
      prev.map(s => {
        if (s.id !== scriptId) return s
        const has = s.selectedOpps.includes(oppId)
        return {
          ...s,
          selectedOpps: has
            ? s.selectedOpps.filter(id => id !== oppId)
            : [...s.selectedOpps, oppId],
        }
      })
    )
  }

  // ─── Account handlers ─────────────────────────────────────────────

  async function handleGoogleSignup() {
    trackSignupStart()
    const origin = window.location.origin
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${origin}/auth/callback?next=/start`,
      },
    })
  }

  async function handleEmailSignup() {
    setAccountError('')
    setAccountLoading(true)
    trackSignupStart()

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: firstName },
        },
      })

      if (error) {
        setAccountError(error.message)
        setAccountLoading(false)
        return
      }

      const userId = data.user?.id
      if (userId) {
        identifyUser(userId, { email, full_name: firstName })
        trackSignupComplete()
        gtagSignupCompleted()

        // Claim anonymous scripts
        try {
          await fetch('/api/claim-scripts', { method: 'POST' })
        } catch {}

        // Send welcome email
        try {
          await fetch('/api/send-welcome', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: userId, email }),
          })
        } catch {}

        // Submit opportunity applications
        const appliedOpps = scripts.flatMap(s =>
          s.selectedOpps.map(oppId => ({ script_id: s.id, opportunity_id: oppId }))
        )
        if (appliedOpps.length > 0) {
          try {
            await fetch('/api/opportunity/batch-apply', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ applications: appliedOpps }),
            })
          } catch {}
        }

        // Publish selected scripts to Discover
        const discoverScripts = scripts.filter(s => s.discoverOn)
        for (const s of discoverScripts) {
          try {
            await fetch(`/api/scripts/${s.id}/visibility`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ is_public: true }),
            })
          } catch {}
        }

        router.push('/dashboard')
      }
    } catch {
      setAccountError('Something went wrong. Please try again.')
    } finally {
      setAccountLoading(false)
    }
  }

  async function handleLeaveWithoutSaving() {
    // Just redirect — scripts remain unclaimed and will expire
    router.push('/')
  }

  // ─── Selected script for results ──────────────────────────────────

  const selectedScript = scripts.find(s => s.id === selectedScriptId) || scripts[0]

  const totalOppsSelected = scripts.reduce((acc, s) => acc + s.selectedOpps.length, 0)

  // ─── Render ────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Step 1: Name */}
      {step === 'name' && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <h1
              className="text-[28px] font-bold text-gray-900 text-center mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Hey. What&apos;s your first name?
            </h1>
            <p className="text-[15px] text-gray-500 text-center mb-8">
              We use this to personalize your reports.
            </p>

            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="First name"
              autoFocus
              className="w-full text-[17px] text-center px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 transition-colors"
              onKeyDown={e => {
                if (e.key === 'Enter' && firstName.trim()) setStep('upload')
              }}
            />

            <button
              onClick={() => { if (firstName.trim()) setStep('upload') }}
              disabled={!firstName.trim()}
              className="w-full mt-4 py-3 rounded-xl text-white font-medium text-[15px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              Continue
            </button>

            <div className="mt-6 rounded-xl border px-4 py-3 flex items-start gap-3" style={{ backgroundColor: '#f0fdf4', borderColor: '#bbf7d0' }}>
              <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <p className="text-[13px] text-green-800 leading-relaxed">
                Privacy first. Delete your scripts or account anytime. You control what&apos;s visible.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Upload */}
      {step === 'upload' && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-lg">
            <h1
              className="text-[28px] font-bold text-gray-900 text-center mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Evaluate your scripts
            </h1>
            <p className="text-[15px] text-gray-500 text-center mb-8">
              Upload a PDF and your evaluation starts immediately.
            </p>

            {/* Uploaded scripts list */}
            <div className="space-y-3 mb-4">
              {scripts.map(script => (
                <div key={script.id} className="rounded-xl border border-gray-200 p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-medium text-gray-900 truncate">{script.title}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[13px] text-gray-400">{script.format}</span>
                        <span className="text-gray-300">-</span>
                        {script.status === 'processing' ? (
                          <span className="text-[13px] text-purple-600">Evaluating...</span>
                        ) : (
                          <span className="text-[13px] text-emerald-600 flex items-center gap-1">
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                            Done
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-3 h-1 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500 ease-out"
                      style={{ width: `${script.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Add script button */}
            {scripts.length < 2 ? (
              <>
                {!showFormatPicker ? (
                  <button
                    onClick={() => setShowFormatPicker(true)}
                    className="w-full rounded-xl border-2 border-dashed border-gray-300 py-4 px-4 text-center hover:border-purple-400 hover:bg-purple-50/30 transition-colors group"
                  >
                    <div className="flex items-center justify-center gap-2">
                      <svg className="w-5 h-5 text-gray-400 group-hover:text-purple-500" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                      </svg>
                      <span className="text-[14px] text-gray-500 group-hover:text-purple-600">
                        You have {2 - scripts.length} more free evaluation{2 - scripts.length !== 1 ? 's' : ''} — add another script
                      </span>
                    </div>
                  </button>
                ) : !pendingFormat ? (
                  <div className="rounded-xl border border-gray-200 p-4">
                    <p className="text-[14px] text-gray-600 mb-3 text-center">What format is your script?</p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => handleFormatSelect('Feature film')}
                        className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[14px] text-gray-700 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                      >
                        Feature film
                      </button>
                      <button
                        onClick={() => handleFormatSelect('Series')}
                        className="flex-1 py-2.5 rounded-lg border border-gray-200 text-[14px] text-gray-700 hover:border-purple-400 hover:bg-purple-50 transition-colors"
                      >
                        Series
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-xl border border-gray-200 p-4 text-center">
                    <p className="text-[14px] text-gray-500 mb-2">Drop your PDF here or click to browse</p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="px-4 py-2 rounded-lg bg-purple-50 text-purple-600 text-[14px] font-medium hover:bg-purple-100 transition-colors"
                    >
                      Choose file
                    </button>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full rounded-xl border border-gray-200 py-4 px-4 text-center">
                <span className="text-[14px] text-gray-400">2 of 2 free evaluations used</span>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className="hidden"
            />

            {/* Manual advance button */}
            {scripts.some(s => s.status === 'completed') && (
              <button
                onClick={() => setStep('results')}
                className="w-full mt-4 py-3 rounded-xl text-white font-medium text-[15px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 transition-all"
              >
                View results
              </button>
            )}
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 'results' && selectedScript && (
        <div className="flex-1 flex flex-col pb-20">
          <div className="flex-1 overflow-y-auto">
            <div className="w-full max-w-lg mx-auto px-4 pt-8 pb-8">
              {/* Script selector (2 scripts) */}
              {scripts.length === 2 && (
                <div className="grid grid-cols-2 gap-3 mb-6">
                  {scripts.map(script => (
                    <button
                      key={script.id}
                      onClick={() => setSelectedScriptId(script.id)}
                      className={`rounded-xl border p-3 text-left transition-all ${
                        script.id === selectedScriptId
                          ? 'border-purple-400 bg-purple-50/50 ring-1 ring-purple-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-[16px] font-bold bg-gradient-to-br ${scoreGradient(script.score)}`}
                        >
                          {script.score ?? '--'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-gray-900 truncate">{script.title}</p>
                          {script.tier && (
                            <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${tierColor(script.tier)}`}>
                              {script.tier}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Score hero */}
              <div className="text-center mb-6">
                <div
                  className={`w-20 h-20 rounded-full flex items-center justify-center text-white text-[24px] font-bold bg-gradient-to-br mx-auto ${scoreGradient(selectedScript.score)}`}
                >
                  {selectedScript.score ?? '--'}
                </div>
                <h2
                  className="text-[22px] font-bold text-gray-900 mt-3"
                  style={{ fontFamily: 'Georgia, serif' }}
                >
                  {selectedScript.title}
                </h2>
                <div className="flex items-center justify-center gap-2 mt-1.5">
                  <span className="text-[13px] text-gray-500">{selectedScript.format}</span>
                  {selectedScript.genres && selectedScript.genres.length > 0 && (
                    <>
                      <span className="text-gray-300">-</span>
                      <span className="text-[13px] text-gray-500">{selectedScript.genres.join(', ')}</span>
                    </>
                  )}
                </div>
                {selectedScript.tier && (
                  <span className={`inline-block mt-2 px-3 py-1 rounded-full text-[12px] font-medium ${tierColor(selectedScript.tier)}`}>
                    {selectedScript.tier}
                  </span>
                )}
              </div>

              {/* Genre tags */}
              {selectedScript.genres && selectedScript.genres.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center mb-6">
                  {selectedScript.genres.map(genre => (
                    <span
                      key={genre}
                      className="px-2.5 py-1 bg-gray-100 border border-gray-200 rounded-full text-[11px] text-gray-600"
                    >
                      {genre}
                    </span>
                  ))}
                </div>
              )}

              {/* Discover toggle */}
              <div className="rounded-xl border border-gray-200 p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div className="flex-1 mr-4">
                    <p className="text-[14px] font-medium text-gray-900">Visible to industry professionals</p>
                    <p className="text-[13px] text-gray-500 mt-0.5">Reps and producers on Discover can find this script.</p>
                  </div>
                  <button
                    onClick={() => toggleDiscover(selectedScript.id)}
                    className={`relative w-11 h-6 rounded-full transition-colors flex-shrink-0 ${
                      selectedScript.discoverOn ? 'bg-purple-600' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${
                        selectedScript.discoverOn ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="h-px bg-gray-200 mb-4" />

              {/* Opportunities */}
              <div className="mb-6">
                {opportunities.length > 0 ? (
                  <>
                    <h3 className="text-[16px] font-semibold text-gray-900 mb-1">
                      Qualifies for {opportunities.length} opportunit{opportunities.length === 1 ? 'y' : 'ies'}
                    </h3>
                    <p className="text-[13px] text-gray-500 mb-4">Select the ones you want to apply to.</p>
                    <div className="space-y-2">
                      {opportunities.map(opp => {
                        const isChecked = selectedScript.selectedOpps.includes(opp.id)
                        return (
                          <button
                            key={opp.id}
                            onClick={() => toggleOpp(selectedScript.id, opp.id)}
                            className={`w-full rounded-xl border p-4 text-left transition-all flex items-start gap-3 ${
                              isChecked
                                ? 'border-purple-300 bg-purple-50/40'
                                : 'border-gray-200 hover:border-gray-300'
                            }`}
                          >
                            <div
                              className={`w-[22px] h-[22px] rounded-md border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                                isChecked
                                  ? 'bg-purple-600 border-purple-600'
                                  : 'border-gray-300 bg-white'
                              }`}
                            >
                              {isChecked && (
                                <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                                </svg>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-[14px] font-medium text-gray-900">{opp.title}</p>
                              <div className="flex items-center gap-3 mt-1">
                                {opp.deadline && (
                                  <span className="text-[12px] text-gray-400">
                                    Deadline: {new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                                {opp.min_score != null && (
                                  <span className="text-[12px] text-gray-400">
                                    Min score: {opp.min_score}
                                  </span>
                                )}
                              </div>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-[14px] text-gray-400">No matching opportunities right now.</p>
                    <p className="text-[13px] text-gray-400 mt-1">New opportunities drop regularly.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Fixed bottom bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 z-50">
            <div className="max-w-lg mx-auto flex items-center justify-between">
              <span className="text-[13px] text-gray-500">
                {scripts.length} of 2 free evaluations used
              </span>
              <button
                onClick={() => setStep('account')}
                className="px-6 py-2.5 rounded-xl text-white font-medium text-[14px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 transition-all"
              >
                Save your scripts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Account */}
      {step === 'account' && (
        <div className="flex-1 flex items-center justify-center px-4">
          <div className="w-full max-w-md">
            <h1
              className="text-[28px] font-bold text-gray-900 text-center mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Save your scripts
            </h1>
            <p className="text-[15px] text-gray-500 text-center mb-8">
              Create an account to keep your scores, reports, and opportunity applications.
            </p>

            {/* Google OAuth */}
            <button
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-3 py-3 rounded-xl border border-gray-300 text-[15px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.76.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              Continue with Google
            </button>

            {/* Divider */}
            <div className="flex items-center gap-4 my-6">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[13px] text-gray-400">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Email/password form */}
            <div className="space-y-3">
              <input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full text-[15px] px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 transition-colors"
              />
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Password"
                className="w-full text-[15px] px-4 py-3 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 transition-colors"
                onKeyDown={e => {
                  if (e.key === 'Enter' && email && password) handleEmailSignup()
                }}
              />
            </div>

            {accountError && (
              <p className="mt-2 text-[13px] text-red-600">{accountError}</p>
            )}

            <button
              onClick={handleEmailSignup}
              disabled={!email || !password || accountLoading}
              className="w-full mt-4 py-3 rounded-xl text-white font-medium text-[15px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {accountLoading ? 'Creating account...' : 'Create account'}
            </button>

            {/* Privacy badge */}
            <div className="mt-6 rounded-xl border border-gray-200 px-4 py-3 flex items-start gap-3 bg-gray-50">
              <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Your data is only saved once you create an account.
              </p>
            </div>

            {/* Leave without saving */}
            <button
              onClick={() => setShowLeaveDialog(true)}
              className="w-full mt-4 text-center text-[13px] text-gray-400 hover:text-gray-600 transition-colors py-2"
            >
              Leave without saving
            </button>
          </div>
        </div>
      )}

      {/* Leave confirm dialog */}
      {showLeaveDialog && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h3
              className="text-[20px] font-bold text-gray-900 mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Leave without saving?
            </h3>
            <p className="text-[14px] text-gray-500 mb-6">
              Your scripts and scores will be permanently deleted.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLeaveDialog(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Go back
              </button>
              <button
                onClick={handleLeaveWithoutSaving}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-[14px] font-medium hover:bg-red-700 transition-colors"
              >
                Delete everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
