'use client'

import { useState, useEffect, useRef, useCallback, type CSSProperties } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase-browser'
import { trackSignupStart, trackSignupComplete, identifyUser } from '@/lib/posthog'
import { gtagSignupCompleted } from '@/lib/gtag'
import Link from 'next/link'

// ─── Types ──────────────────────────────────────────────────────────

type Step = 'name' | 'upload' | 'account'
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

// ─── Props ──────────────────────────────────────────────────────────

interface OnboardingClientProps {
  /** Called when user submits their name — parent switches to app mode */
  onEnterApp?: () => void
  /** Called when user wants to go back from app mode to landing */
  onExitApp?: () => void
  /** Pre-filled name — skips the name step when provided */
  initialName?: string
  /** Pre-filled intent */
  initialIntent?: string
  /** Called with name+intent when user submits the name step */
  onNameSubmit?: (name: string, intent: string) => void
}

// ─── Component ──────────────────────────────────────────────────────

export function OnboardingClient({ onEnterApp, onExitApp, initialName, initialIntent, onNameSubmit }: OnboardingClientProps) {
  const router = useRouter()
  const supabase = createClient()

  // Global state — skip name step if pre-filled
  const [step, setStep] = useState<Step>(initialName ? 'upload' : 'name')
  const [firstName, setFirstName] = useState(initialName || '')
  const [intent, setIntent] = useState<string | null>(initialIntent || null)

  // Sidebar active page
  const [activePage, setActivePage] = useState<'new-script' | 'my-scripts' | 'discover' | 'opportunities'>('new-script')

  // All opportunities (for inline opportunities page)
  const [allOppsExpanded, setAllOppsExpanded] = useState<{ id: string; title: string; subtitle: string | null; deadline: string | null; min_score: number | null }[]>([])

  // Upload state
  const [scripts, setScripts] = useState<UploadedScript[]>([])
  const [showFormatPicker, setShowFormatPicker] = useState(false)
  const [pendingFormat, setPendingFormat] = useState<DeclaredFormat | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const pollingRefs = useRef<Map<string, NodeJS.Timeout>>(new Map())

  // Results state
  const [opportunities, setOpportunities] = useState<MatchedOpp[]>([])

  // All active opportunities (for preview section)
  const [allOpps, setAllOpps] = useState<{ id: string; title: string; subtitle: string | null; deadline: string | null; min_score: number | null }[]>([])

  // Account state
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [phone, setPhone] = useState('')
  const [accountError, setAccountError] = useState('')
  const [accountLoading, setAccountLoading] = useState(false)
  const [showAccountForm, setShowAccountForm] = useState(false)

  // Opportunity detail expand state (for inline opportunities page)
  const [expandedOppId, setExpandedOppId] = useState<string | null>(null)

  // beforeunload — warn user about unsaved progress
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (scripts.length > 0) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [scripts.length])

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

  // Fetch all active opportunities on mount (for preview)
  useEffect(() => {
    fetch('/api/opportunities-preview')
      .then(r => r.ok ? r.json() : { opportunities: [] })
      .then(data => setAllOpps(data.opportunities || []))
      .catch(() => {})
  }, [])


  // Track which script cards have their opportunities expanded
  const [expandedOpps, setExpandedOpps] = useState<Set<string>>(new Set())

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

  // Fetch matched opportunities when scripts complete (regardless of step)
  useEffect(() => {
    const completedIds = scripts.filter(s => s.status === 'completed').map(s => s.id)
    if (completedIds.length === 0) return

    fetch(`/api/onboarding-opportunities?ids=${completedIds.join(',')}`)
      .then(r => r.ok ? r.json() : { opportunities: [] })
      .then(data => setOpportunities(data.opportunities || []))
      .catch(() => setOpportunities([]))
  }, [scripts])

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

        // Save phone to profile
        if (phone.trim()) {
          try {
            await supabase
              .from('profiles')
              .update({ phone: phone.trim() })
              .eq('id', userId)
          } catch {}
        }

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

  // ─── Selected script for results ──────────────────────────────────

  const totalOppsSelected = scripts.reduce((acc, s) => acc + s.selectedOpps.length, 0)

  // ─── Transition key — triggers fade on step change ─────────────────
  const [animKey, setAnimKey] = useState(0)
  const prevStepRef = useRef(step)
  useEffect(() => {
    if (step !== prevStepRef.current) {
      setAnimKey(k => k + 1)
      prevStepRef.current = step
    }
  }, [step])

  const fadeSlide: CSSProperties = {
    animation: 'onboard-fade-in 0.35s ease-out both',
  }

  const initial = (firstName || 'U').charAt(0).toUpperCase()

  // ─── Shared render helpers ────────────────────────────────────────

  function renderScriptCard(script: UploadedScript) {
    const isExpanded = expandedOpps.has(script.id)
    const scriptOpps = script.status === 'completed' ? opportunities : []
    return (
      <div key={script.id} className="rounded-xl bg-white overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
        <div className="p-5">
          <div className="flex items-start gap-4">
            {script.status === 'completed' && script.score != null ? (
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center text-white text-[20px] font-bold bg-gradient-to-br flex-shrink-0 ${scoreGradient(script.score)}`}
              >
                {script.score}
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: '#f3f4f6' }}>
                <svg className="w-6 h-6 text-purple-500 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h3
                className="text-[17px] font-bold text-gray-900 m-0 truncate"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {script.title}
              </h3>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[13px] text-gray-400">{script.format}</span>
                {script.status === 'processing' && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-[13px] text-purple-600">Evaluating...</span>
                  </>
                )}
                {script.genres && script.genres.length > 0 && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span className="text-[13px] text-gray-400">{script.genres.join(', ')}</span>
                  </>
                )}
              </div>
              {script.tier && (
                <span className={`inline-block mt-2 px-2.5 py-0.5 rounded-full text-[11px] font-medium ${tierColor(script.tier)}`}>
                  {script.tier}
                </span>
              )}
              {script.status === 'completed' && (
                <div className="flex items-center gap-3 mt-3">
                  {script.evaluation && (
                    <Link
                      href={`/report/${script.id}`}
                      target="_blank"
                      className="text-[12px] text-purple-600 font-medium hover:text-purple-700 flex items-center gap-1"
                    >
                      View report
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
                      </svg>
                    </Link>
                  )}
                  <button
                    onClick={() => toggleDiscover(script.id)}
                    className="text-[12px] font-medium flex items-center gap-1.5 transition-colors"
                    style={{ color: script.discoverOn ? '#7c3aed' : '#9ca3af' }}
                  >
                    <span className={`inline-block w-3 h-3 rounded-full border-2 transition-colors ${script.discoverOn ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`} />
                    {script.discoverOn ? 'Published to Industry' : 'Publish to Industry'}
                  </button>
                </div>
              )}
            </div>
          </div>
          {script.status === 'processing' && (
            <div className="mt-4 h-1 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400 transition-all duration-500 ease-out"
                style={{ width: `${script.progress}%` }}
              />
            </div>
          )}
        </div>

        {/* Opportunities dropdown */}
        {script.status === 'completed' && scriptOpps.length > 0 && (
          <div style={{ borderTop: '1px solid #f3f4f6' }}>
            <button
              onClick={() => setExpandedOpps(prev => {
                const next = new Set(prev)
                if (next.has(script.id)) next.delete(script.id)
                else next.add(script.id)
                return next
              })}
              className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-50 transition-colors"
            >
              <span className="text-[13px] font-semibold text-purple-600">
                Qualifies for {scriptOpps.length} opportunit{scriptOpps.length === 1 ? 'y' : 'ies'}
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
              </svg>
            </button>
            {isExpanded && (
              <div className="px-5 pb-4 space-y-2">
                {scriptOpps.map(opp => {
                  const isApplied = script.selectedOpps.includes(opp.id)
                  return (
                    <div
                      key={opp.id}
                      className="flex items-center justify-between py-2.5 px-3 rounded-lg transition-colors"
                      style={{ background: isApplied ? '#f5f3ff' : '#f9fafb' }}
                    >
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-[13px] font-medium text-gray-900 m-0">{opp.title}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          {opp.deadline && (
                            <span className="text-[11px] text-gray-400">
                              {new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          )}
                          {opp.min_score != null && (
                            <span className="text-[11px] text-gray-400">
                              {opp.min_score}+ score
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          // Gate behind account creation
                          if (!isApplied) {
                            setShowAccountForm(true)
                            return
                          }
                          toggleOpp(script.id, opp.id)
                        }}
                        className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex-shrink-0 ${
                          isApplied
                            ? 'bg-purple-600 text-white'
                            : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600'
                        }`}
                      >
                        {isApplied ? 'Applied' : 'Apply'}
                      </button>
                    </div>
                  )
                })}
                {!showAccountForm && (
                  <p className="text-[11px] text-gray-400 mt-1 m-0">Create an account to apply for opportunities</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    )
  }

  function renderOppCard(opp: { id: string; title: string; subtitle: string | null; deadline: string | null; min_score: number | null }) {
    const deadlineStr = opp.deadline
      ? (() => {
          const days = Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
          if (days <= 0) return 'Closed'
          if (days === 1) return 'Closes tomorrow'
          if (days <= 7) return `${days} days left`
          return new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        })()
      : null
    return (
      <a
        key={opp.id}
        href={`/opportunities/${opp.id}`}
        target="_blank"
        rel="noopener noreferrer"
        className="block rounded-xl bg-white p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 group"
        style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.15)', textDecoration: 'none' }}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <h4
            className="text-[15px] font-bold text-gray-900 m-0 group-hover:text-purple-700 transition-colors leading-snug"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            {opp.title}
          </h4>
          <svg className="w-4 h-4 text-gray-300 group-hover:text-purple-400 flex-shrink-0 mt-0.5 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
          </svg>
        </div>
        {opp.subtitle && (
          <p className="text-[13px] text-gray-500 m-0 mb-3 leading-relaxed">{opp.subtitle}</p>
        )}
        <div className="flex items-center gap-3 mt-auto pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
          {opp.min_score != null && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280' }}>
              {Math.round(opp.min_score)}+ score
            </span>
          )}
          {deadlineStr && (
            <span className="text-[11px] font-medium text-gray-400">
              {deadlineStr}
            </span>
          )}
        </div>
      </a>
    )
  }

  // ─── NAME STEP (rendered inside parent card wrapper) ───────────────

  if (step === 'name') {
    return (
      <>
        <style>{`
          @keyframes onboard-fade-in {
            from { opacity: 0; transform: translateY(12px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
        <div className="py-12 px-4" style={fadeSlide}>
          <div className="mx-auto max-w-lg">
            <h1
              className="text-[32px] font-bold text-gray-900 text-center mb-2"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              What should we call you?
            </h1>
            <p className="text-[15px] text-gray-500 text-center mb-8">
              Just your first name is fine.
            </p>

            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="First name"
              autoFocus
              className="w-full text-[17px] text-center px-5 py-3.5 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none focus:ring-2 focus:ring-purple-600/20 transition-all"
              onKeyDown={e => {
                if (e.key === 'Enter' && firstName.trim() && intent) {
                  onNameSubmit?.(firstName.trim(), intent)
                  setStep('upload')
                  onEnterApp?.()
                }
              }}
            />

            {/* Intent pills */}
            <div className="mt-8">
              <p className="text-[15px] font-medium text-gray-900 text-center mb-3">
                What brings you here?
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {[
                  { value: 'discover', label: 'Get my script discovered' },
                  { value: 'evaluate', label: 'Evaluate my work' },
                  { value: 'explore', label: 'Just exploring' },
                ].map(option => (
                  <button
                    key={option.value}
                    onClick={() => setIntent(option.value)}
                    className={`px-4 py-2.5 rounded-xl text-[14px] font-medium transition-all ${
                      intent === option.value
                        ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => {
                if (firstName.trim() && intent) {
                  onNameSubmit?.(firstName.trim(), intent)
                  setStep('upload')
                  onEnterApp?.()
                }
              }}
              disabled={!firstName.trim() || !intent}
              className="w-full mt-8 py-3.5 rounded-xl text-white font-semibold text-[15px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-600/20"
            >
              Continue
            </button>

            <div className="mt-6 rounded-xl border px-4 py-3 flex items-start gap-3" style={{ backgroundColor: '#f9fafb', borderColor: '#e5e7eb' }}>
              <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z" />
              </svg>
              <p className="text-[13px] text-gray-500 leading-relaxed">
                Your scripts stay private. You control what&apos;s visible.
              </p>
            </div>
          </div>
        </div>
      </>
    )
  }

  // ─── APP MODE: sidebar + center layout ─────────────────────────────

  return (
    <>
      <style>{`
        @keyframes onboard-fade-in {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="flex h-screen" style={fadeSlide}>
        {/* ── LEFT SIDEBAR ── */}
        <aside
          className="hidden lg:flex flex-col w-[260px] shrink-0 border-r"
          style={{ background: '#ffffff', borderColor: '#e5e7eb' }}
        >
          {/* GEM logo */}
          <div className="px-5 h-14 flex items-center border-b" style={{ borderColor: '#f0f0f0' }}>
            <button
              onClick={onExitApp}
              className="flex items-center gap-2 group"
            >
              <span
                aria-hidden="true"
                className="inline-block w-3 h-3 rotate-45"
                style={{
                  background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
                  boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
                }}
              />
              <span className="text-lg font-bold tracking-tight text-gray-900">GEM</span>
            </button>
          </div>

          {/* Profile card */}
          <div className="px-5 py-5 border-b" style={{ borderColor: '#f0f0f0' }}>
            <div className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-full flex items-center justify-center text-[16px] font-bold text-white flex-shrink-0"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
              >
                {initial}
              </div>
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-gray-900 truncate">
                  Hi, {firstName}
                </p>
                <p className="text-[12px] text-gray-400">Guest</p>
              </div>
            </div>
            {!showAccountForm && (
              <button
                onClick={() => setShowAccountForm(true)}
                className="mt-3 w-full text-[12px] font-semibold py-2 rounded-lg text-purple-600 border border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors"
              >
                Create account to save
              </button>
            )}
          </div>

          {/* Nav links */}
          <nav className="flex-1 px-3 pt-3">
            <ul className="list-none p-0 m-0 space-y-0.5">
              {[
                {
                  id: 'new-script' as const,
                  label: 'New Script',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 4.5v15m7.5-7.5h-15" />
                    </svg>
                  ),
                },
                {
                  id: 'my-scripts' as const,
                  label: 'My Scripts',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  ),
                },
                {
                  id: 'opportunities' as const,
                  label: 'Opportunities',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
                    </svg>
                  ),
                },
                {
                  id: 'discover' as const,
                  label: 'Discover',
                  icon: (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
                    </svg>
                  ),
                },
              ].map(link => {
                const active = activePage === link.id
                return (
                  <li key={link.id}>
                    <button
                      onClick={() => {
                        if (link.id === 'opportunities') {
                          setActivePage('opportunities')
                          setExpandedOppId(null)
                          fetch('/api/opportunities-preview?all=true')
                            .then(r => r.ok ? r.json() : { opportunities: [] })
                            .then(data => setAllOppsExpanded(data.opportunities || []))
                            .catch(() => {})
                        } else if (link.id === 'my-scripts') {
                          setActivePage('my-scripts')
                        } else if (link.id === 'discover') {
                          setActivePage('discover')
                        } else {
                          setActivePage(link.id as any)
                          if (scripts.length === 0) setStep('upload')
                        }
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors text-left ${
                        active
                          ? 'bg-purple-50 text-purple-700'
                          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                      }`}
                    >
                      <span className={active ? 'text-purple-600' : 'text-gray-400'}>{link.icon}</span>
                      {link.label}
                      {scripts.length > 0 && link.id === 'my-scripts' && (
                        <span className="ml-auto text-[11px] font-semibold text-gray-400">{scripts.length}</span>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </nav>

          {/* ── Writer Stats ── */}
          <div className="px-5 py-4 border-t" style={{ borderColor: '#f0f0f0' }}>
            <h3 className="text-[11px] font-bold text-gray-400 uppercase tracking-wider m-0 mb-3">Your Stats</h3>
            {(() => {
              const completed = scripts.filter(s => s.status === 'completed')
              const pending = scripts.filter(s => s.status === 'processing')
              const avgScore = completed.length > 0
                ? Math.round(completed.reduce((sum, s) => sum + (s.score || 0), 0) / completed.length)
                : null
              return (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Scripts submitted</span>
                    <span className="text-[13px] font-semibold text-gray-900">{scripts.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Pending</span>
                    <span className="text-[13px] font-semibold" style={{ color: pending.length > 0 ? '#7c3aed' : '#111827' }}>{pending.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Industry matches</span>
                    <span className="text-[13px] font-semibold text-gray-900">{opportunities.length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Avg GEM score</span>
                    <span className="text-[13px] font-semibold" style={{ color: avgScore != null ? '#059669' : '#111827' }}>{avgScore != null ? avgScore : '—'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-500">Insider heat</span>
                    <span className="text-[13px] font-semibold" style={{ color: '#f59e0b' }}>0</span>
                  </div>
                </div>
              )
            })()}
          </div>

          {/* Ephemeral warning */}
          <div className="px-4 pb-4 mt-auto">
            <div className="rounded-xl bg-amber-50 border border-amber-200 px-3 py-3">
              <p className="text-[12px] text-amber-700 leading-relaxed">
                Your work isn&apos;t saved yet. Create an account or it&apos;ll be lost if you leave.
              </p>
            </div>
          </div>
        </aside>

        {/* ── CENTER CONTENT — dark canvas ── */}
        <main
          className="flex-1 min-w-0 overflow-y-auto"
          style={{ background: 'linear-gradient(180deg, #1a1025 0%, #0f0a18 60%, #0a0a0f 100%)' }}
        >
          {/* Mobile top bar (visible on < lg) */}
          <div
            className="lg:hidden flex items-center justify-between px-4 h-14"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            <button onClick={onExitApp} className="flex items-center gap-2">
              <span
                aria-hidden
                className="inline-block w-2.5 h-2.5 rotate-45"
                style={{ background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)' }}
              />
              <span className="text-[15px] font-bold" style={{ color: '#ffffff' }}>GEM</span>
            </button>
            <div className="flex items-center gap-2">
              {!showAccountForm && (
                <button
                  onClick={() => setShowAccountForm(true)}
                  className="text-[12px] font-semibold px-3 py-1.5 rounded-lg text-white"
                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                >
                  Save
                </button>
              )}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
              >
                {initial}
              </div>
            </div>
          </div>

          {/* ── Account creation OVERLAY (fixed, centered) ── */}
          {showAccountForm && (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
              onClick={e => { if (e.target === e.currentTarget) setShowAccountForm(false) }}
            >
              <div
                className="rounded-2xl p-6 w-full max-w-sm mx-4"
                style={{ background: '#ffffff', boxShadow: '0 20px 60px rgba(0,0,0,0.4)', ...fadeSlide }}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-[16px] font-bold text-gray-900" style={{ fontFamily: 'Georgia, serif' }}>
                    Create your account
                  </h3>
                  <button
                    onClick={() => setShowAccountForm(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <p className="text-[13px] text-gray-500 mb-4">
                  Save your scripts, scores, and opportunity applications.
                </p>

                {/* Google OAuth */}
                <button
                  onClick={handleGoogleSignup}
                  className="w-full flex items-center justify-center gap-3 py-2.5 rounded-xl border border-gray-300 text-[14px] font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A10.97 10.97 0 0 0 1 12c0 1.76.42 3.44 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                  </svg>
                  Continue with Google
                </button>

                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span className="text-[12px] text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <div className="space-y-2.5">
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="Email"
                    className="w-full text-[14px] px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 transition-colors"
                  />
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Password"
                    className="w-full text-[14px] px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 transition-colors"
                  />
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="Phone number"
                    className="w-full text-[14px] px-3.5 py-2.5 rounded-xl border border-gray-200 focus:border-purple-600 focus:outline-none focus:ring-1 focus:ring-purple-600 transition-colors"
                    onKeyDown={e => {
                      if (e.key === 'Enter' && email && password) handleEmailSignup()
                    }}
                  />
                </div>

                {accountError && (
                  <p className="mt-2 text-[12px] text-red-600">{accountError}</p>
                )}

                <button
                  onClick={handleEmailSignup}
                  disabled={!email || !password || accountLoading}
                  className="w-full mt-3 py-2.5 rounded-xl text-white font-semibold text-[14px] bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-700 hover:to-purple-600 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-lg shadow-purple-600/20"
                >
                  {accountLoading ? 'Creating...' : 'Create account'}
                </button>
              </div>
            </div>
          )}

          <div className="px-6 lg:px-10 py-6">
            {/* ── Page content based on activePage ── */}
            <div key={`${activePage}-${animKey}`} style={fadeSlide}>

              {/* ════════ NEW SCRIPT PAGE ════════ */}
              {activePage === 'new-script' && step === 'upload' && (
                <div>
                  {/* ── Submission section — top-left aligned ── */}
                  <div className="mb-8">
                    <h1
                      className="text-[22px] font-bold mb-1"
                      style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}
                    >
                      {scripts.length === 0
                        ? `What are you working on, ${firstName}?`
                        : 'Submit a script'}
                    </h1>
                    <p className="text-[14px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                      {scripts.length === 0
                        ? 'Pick a format and upload your screenplay. Your first evaluation is free.'
                        : 'Upload a PDF to get your evaluation in under a minute.'}
                    </p>

                    {/* ── Script cards — rich inline view ── */}
                    {scripts.length > 0 && (
                      <div className="space-y-4 mb-5">
                        {scripts.map(script => renderScriptCard(script))}
                      </div>
                    )}

                    {/* ── Save your work CTA — prominent banner ── */}
                    {scripts.some(s => s.status === 'completed') && !showAccountForm && (
                      <div
                        className="mb-5 rounded-xl p-4 flex items-center justify-between gap-4"
                        style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.1))', border: '1px solid rgba(167,139,250,0.3)' }}
                      >
                        <div>
                          <p className="text-[14px] font-semibold m-0" style={{ color: '#ffffff' }}>
                            Create your account to save your work
                          </p>
                          <p className="text-[12px] m-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                            Your scripts, scores, and applications will be lost if you leave
                          </p>
                        </div>
                        <button
                          onClick={() => setShowAccountForm(true)}
                          className="flex-shrink-0 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all"
                          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                          onMouseOver={e => (e.currentTarget.style.opacity = '0.9')}
                          onMouseOut={e => (e.currentTarget.style.opacity = '1')}
                        >
                          Create account
                        </button>
                      </div>
                    )}

                    {/* ── Format-first flow ── */}
                    {scripts.length < 2 ? (
                      <div className="max-w-lg">
                        {!pendingFormat && !showFormatPicker ? (
                          <>
                            <div className="flex gap-3 mb-3">
                              {(['Series', 'Feature film'] as DeclaredFormat[]).map(fmt => (
                                <button
                                  key={fmt}
                                  onClick={() => {
                                    setShowFormatPicker(true)
                                    setPendingFormat(fmt)
                                    setTimeout(() => fileInputRef.current?.click(), 50)
                                  }}
                                  className="flex-1 rounded-xl py-4 px-4 text-center transition-all group"
                                  style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.12)' }}
                                  onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)'; e.currentTarget.style.background = 'rgba(255,255,255,0.1)' }}
                                  onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)'; e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                                >
                                  <div className="flex flex-col items-center gap-1.5">
                                    {fmt === 'Series' ? (
                                      <svg className="w-6 h-6 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3v3m3-3v3m-10.125-3h17.25c.621 0 1.125-.504 1.125-1.125V4.875c0-.621-.504-1.125-1.125-1.125H2.625c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125Z" />
                                      </svg>
                                    ) : (
                                      <svg className="w-6 h-6 transition-colors" style={{ color: 'rgba(255,255,255,0.4)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m15.75 10.5 4.72-4.72a.75.75 0 0 1 1.28.53v11.38a.75.75 0 0 1-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 0 0 2.25-2.25v-9a2.25 2.25 0 0 0-2.25-2.25h-9A2.25 2.25 0 0 0 2.25 7.5v9a2.25 2.25 0 0 0 2.25 2.25Z" />
                                      </svg>
                                    )}
                                    <span className="text-[14px] font-semibold" style={{ color: '#ffffff' }}>{fmt}</span>
                                    <span className="text-[12px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                                      {fmt === 'Series' ? 'Pilot or episode' : 'Full screenplay'}
                                    </span>
                                  </div>
                                </button>
                              ))}
                            </div>
                            <p className="text-[12px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                              {scripts.length === 0 ? 'Your first evaluation is free' : '1 free evaluation left'}
                            </p>
                          </>
                        ) : (
                          <div>
                            <div className="flex items-center gap-2 mb-3">
                              <span className="inline-block px-2.5 py-1 rounded-full text-[12px] font-medium" style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa' }}>
                                {pendingFormat}
                              </span>
                              <button
                                onClick={() => { setPendingFormat(null); setShowFormatPicker(false) }}
                                className="text-[12px] transition-colors"
                                style={{ color: 'rgba(255,255,255,0.4)' }}
                                onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                                onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
                              >
                                Change
                              </button>
                            </div>
                            <button
                              onClick={() => fileInputRef.current?.click()}
                              className="w-full rounded-xl border-2 border-dashed py-6 px-4 transition-colors group"
                              style={{ borderColor: 'rgba(255,255,255,0.15)', background: 'rgba(255,255,255,0.04)' }}
                              onMouseOver={e => { e.currentTarget.style.borderColor = 'rgba(167,139,250,0.5)'; e.currentTarget.style.background = 'rgba(167,139,250,0.08)' }}
                              onMouseOut={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                            >
                              <div className="flex flex-col items-center gap-2">
                                <svg className="w-8 h-8 transition-colors" style={{ color: 'rgba(255,255,255,0.25)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                </svg>
                                <span className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Upload your screenplay (PDF)</span>
                              </div>
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="max-w-lg rounded-xl py-4 px-4 text-center" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <span className="text-[14px]" style={{ color: 'rgba(255,255,255,0.4)' }}>2 of 2 free evaluations used</span>
                      </div>
                    )}

                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                    />
                  </div>

                  {/* ── Opportunities preview — wide grid ── */}
                  {allOpps.length > 0 && (
                    <div>
                      <div className="mb-4">
                        <h2 className="text-[18px] font-bold m-0" style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}>
                          New Opportunities
                        </h2>
                        <p className="text-[13px] mt-1 m-0" style={{ color: 'rgba(255,255,255,0.4)' }}>
                          Real opportunities from our insider network your script may qualify for
                        </p>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {allOpps.slice(0, 3).map(opp => renderOppCard(opp))}
                      </div>
                      <div className="mt-4">
                        <button
                          onClick={() => {
                            setActivePage('opportunities')
                            fetch('/api/opportunities-preview?all=true')
                              .then(r => r.ok ? r.json() : { opportunities: [] })
                              .then(data => setAllOppsExpanded(data.opportunities || []))
                              .catch(() => {})
                          }}
                          className="inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors border-0 bg-transparent cursor-pointer"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                          onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                          onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                        >
                          View all opportunities
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M5 12h14M12 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ════════ MY SCRIPTS PAGE ════════ */}
              {activePage === 'my-scripts' && (
                <div>
                  <h1
                    className="text-[22px] font-bold mb-1"
                    style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}
                  >
                    My Scripts
                  </h1>
                  <p className="text-[14px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    {scripts.length === 0 ? 'No scripts yet. Submit your first one to get started.' : `${scripts.length} script${scripts.length === 1 ? '' : 's'} submitted`}
                  </p>

                  {scripts.length === 0 ? (
                    <div
                      className="rounded-xl py-12 px-6 text-center"
                      style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                    >
                      <svg className="w-10 h-10 mx-auto mb-3" style={{ color: 'rgba(255,255,255,0.2)' }} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                      </svg>
                      <p className="text-[14px] font-medium mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>No scripts yet</p>
                      <button
                        onClick={() => { setActivePage('new-script'); setStep('upload') }}
                        className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
                        style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                      >
                        Submit your first script
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {scripts.map(script => renderScriptCard(script))}

                      {/* Save your work CTA */}
                      {scripts.some(s => s.status === 'completed') && !showAccountForm && (
                        <div
                          className="rounded-xl p-4 flex items-center justify-between gap-4"
                          style={{ background: 'linear-gradient(135deg, rgba(124,58,237,0.15), rgba(168,85,247,0.1))', border: '1px solid rgba(167,139,250,0.3)' }}
                        >
                          <div>
                            <p className="text-[14px] font-semibold m-0" style={{ color: '#ffffff' }}>
                              Create your account to save your work
                            </p>
                            <p className="text-[12px] m-0 mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                              Your scripts and scores will be lost if you leave
                            </p>
                          </div>
                          <button
                            onClick={() => setShowAccountForm(true)}
                            className="flex-shrink-0 px-4 py-2 rounded-lg text-[13px] font-semibold text-white transition-all"
                            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                          >
                            Create account
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ════════ OPPORTUNITIES PAGE ════════ */}
              {activePage === 'opportunities' && (
                <div>
                  {expandedOppId ? (() => {
                    const opp = allOppsExpanded.find(o => o.id === expandedOppId)
                    if (!opp) return null
                    const deadlineStr = opp.deadline
                      ? (() => {
                          const days = Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
                          if (days <= 0) return 'Closed'
                          if (days === 1) return 'Closes tomorrow'
                          if (days <= 7) return `${days} days left`
                          return new Date(opp.deadline).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                        })()
                      : null
                    // Check which scripts qualify for this opp
                    const qualifyingScripts = scripts.filter(s => s.status === 'completed' && s.score != null && opp.min_score != null && s.score >= opp.min_score)
                    return (
                      <div>
                        {/* Back button */}
                        <button
                          onClick={() => setExpandedOppId(null)}
                          className="flex items-center gap-2 mb-5 text-[13px] font-medium transition-colors border-0 bg-transparent cursor-pointer"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                          onMouseOver={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.8)')}
                          onMouseOut={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.5)')}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M19 12H5M12 19l-7-7 7-7" />
                          </svg>
                          Back to opportunities
                        </button>

                        {/* Expanded opportunity detail card */}
                        <div className="rounded-xl bg-white overflow-hidden" style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}>
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex-1">
                                <h2
                                  className="text-[22px] font-bold text-gray-900 m-0 mb-2"
                                  style={{ fontFamily: 'Georgia, serif' }}
                                >
                                  {opp.title}
                                </h2>
                                {opp.subtitle && (
                                  <p className="text-[14px] text-gray-500 m-0 leading-relaxed">{opp.subtitle}</p>
                                )}
                              </div>
                              <button
                                onClick={() => setExpandedOppId(null)}
                                className="text-gray-400 hover:text-gray-600 transition-colors ml-4 flex-shrink-0"
                              >
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M18 6 6 18M6 6l12 12" />
                                </svg>
                              </button>
                            </div>

                            {/* Meta pills */}
                            <div className="flex items-center gap-3 mb-6 pb-4" style={{ borderBottom: '1px solid #f3f4f6' }}>
                              {opp.min_score != null && (
                                <span className="inline-flex items-center gap-1 text-[12px] font-semibold px-3 py-1 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                                  {Math.round(opp.min_score)}+ GEM score required
                                </span>
                              )}
                              {deadlineStr && (
                                <span className="text-[12px] font-medium text-gray-400">{deadlineStr}</span>
                              )}
                            </div>

                            {/* Qualifying scripts section */}
                            {scripts.length > 0 && (
                              <div className="mb-4">
                                <h3 className="text-[14px] font-semibold text-gray-900 m-0 mb-3">Your qualifying scripts</h3>
                                {qualifyingScripts.length > 0 ? (
                                  <div className="space-y-2">
                                    {qualifyingScripts.map(s => {
                                      const applied = s.selectedOpps.includes(opp.id)
                                      return (
                                        <div
                                          key={s.id}
                                          className="flex items-center justify-between py-2.5 px-3 rounded-lg"
                                          style={{ background: applied ? '#f5f3ff' : '#f9fafb' }}
                                        >
                                          <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-[12px] font-bold bg-gradient-to-br flex-shrink-0 ${scoreGradient(s.score)}`}>
                                              {s.score}
                                            </div>
                                            <div className="min-w-0">
                                              <p className="text-[13px] font-medium text-gray-900 m-0 truncate">{s.title}</p>
                                              <p className="text-[11px] text-gray-400 m-0">{s.format}</p>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => {
                                              if (!applied) {
                                                setShowAccountForm(true)
                                                return
                                              }
                                              toggleOpp(s.id, opp.id)
                                            }}
                                            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all flex-shrink-0 ${
                                              applied
                                                ? 'bg-purple-600 text-white'
                                                : 'bg-white border border-gray-200 text-gray-700 hover:border-purple-300 hover:text-purple-600'
                                            }`}
                                          >
                                            {applied ? 'Applied' : 'Apply'}
                                          </button>
                                        </div>
                                      )
                                    })}
                                  </div>
                                ) : (
                                  <div className="rounded-lg px-3 py-3" style={{ background: '#f9fafb' }}>
                                    <p className="text-[13px] text-gray-500 m-0">
                                      {opp.min_score != null
                                        ? `None of your scripts meet the ${Math.round(opp.min_score)}+ score requirement yet.`
                                        : 'Submit a script to apply for this opportunity.'}
                                    </p>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* CTA if no scripts */}
                            {scripts.length === 0 && (
                              <div className="rounded-lg px-4 py-4 text-center" style={{ background: '#f9fafb' }}>
                                <p className="text-[14px] text-gray-600 m-0 mb-3">Submit a script to see if you qualify</p>
                                <button
                                  onClick={() => { setActivePage('new-script'); setStep('upload') }}
                                  className="px-4 py-2 rounded-lg text-[13px] font-semibold text-white"
                                  style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
                                >
                                  Submit a script
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    )
                  })() : (
                    /* Grid view */
                    <div>
                      <h1
                        className="text-[22px] font-bold mb-1"
                        style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}
                      >
                        Opportunities
                      </h1>
                      <p className="text-[14px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                        Real opportunities from our insider network
                      </p>

                      {allOppsExpanded.length === 0 ? (
                        <div
                          className="rounded-xl py-12 px-6 text-center"
                          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
                        >
                          <svg className="w-10 h-10 mx-auto mb-3 animate-spin" style={{ color: 'rgba(255,255,255,0.2)' }} fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          <p className="text-[14px] font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>Loading opportunities...</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {allOppsExpanded.map(opp => {
                            const deadlineStr = opp.deadline
                              ? (() => {
                                  const days = Math.ceil((new Date(opp.deadline).getTime() - Date.now()) / 86400000)
                                  if (days <= 0) return 'Closed'
                                  if (days === 1) return 'Closes tomorrow'
                                  if (days <= 7) return `${days} days left`
                                  return new Date(opp.deadline).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                })()
                              : null
                            return (
                              <button
                                key={opp.id}
                                onClick={() => setExpandedOppId(opp.id)}
                                className="block rounded-xl bg-white p-5 transition-all hover:shadow-lg hover:-translate-y-0.5 group text-left w-full border-0 cursor-pointer"
                                style={{ boxShadow: '0 2px 12px rgba(0,0,0,0.15)' }}
                              >
                                <h4
                                  className="text-[15px] font-bold text-gray-900 m-0 mb-2 group-hover:text-purple-700 transition-colors leading-snug"
                                  style={{ fontFamily: 'Georgia, serif' }}
                                >
                                  {opp.title}
                                </h4>
                                {opp.subtitle && (
                                  <p className="text-[13px] text-gray-500 m-0 mb-3 leading-relaxed">{opp.subtitle}</p>
                                )}
                                <div className="flex items-center gap-3 mt-auto pt-2" style={{ borderTop: '1px solid #f3f4f6' }}>
                                  {opp.min_score != null && (
                                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ background: '#f3f4f6', color: '#6b7280' }}>
                                      {Math.round(opp.min_score)}+ score
                                    </span>
                                  )}
                                  {deadlineStr && (
                                    <span className="text-[11px] font-medium text-gray-400">{deadlineStr}</span>
                                  )}
                                </div>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* ════════ DISCOVER PAGE ════════ */}
              {activePage === 'discover' && (
                <div>
                  <h1
                    className="text-[22px] font-bold mb-1"
                    style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}
                  >
                    Discover
                  </h1>
                  <p className="text-[14px] mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Find scripts which match your needs.
                  </p>

                  {/* Sort toggles */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="flex items-center gap-1.5">
                      {['GEM Score', 'Recent', 'Heat'].map((label, i) => (
                        <button
                          key={label}
                          className={`text-[12px] font-medium px-3.5 py-1.5 rounded-full border transition-colors cursor-pointer ${
                            i === 0
                              ? 'text-white border-transparent'
                              : 'bg-transparent text-gray-400 hover:text-gray-300'
                          }`}
                          style={i === 0 ? { background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.2)' } : { borderColor: 'rgba(255,255,255,0.1)' }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <button
                      className="text-[12px] font-medium px-3 py-1.5 rounded-lg cursor-default"
                      style={{ color: 'rgba(255,255,255,0.3)', border: '1px solid rgba(255,255,255,0.1)' }}
                    >
                      Filters
                    </button>
                  </div>

                  {/* Placeholder cards with gated overlay */}
                  <div className="relative">
                    <div className="space-y-2">
                      {Array.from({ length: 9 }, (_, i) => (
                        <div key={i} className="rounded-xl px-4 py-3.5" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)' }}>
                          <div className="flex items-center gap-3">
                            <span className="text-[14px] font-semibold w-5 text-center shrink-0" style={{ color: 'rgba(255,255,255,0.15)' }}>
                              {i + 1}
                            </span>
                            <div
                              className="shrink-0 w-11 h-11 rounded-lg"
                              style={{ background: 'rgba(255,255,255,0.06)', border: '1.5px solid rgba(255,255,255,0.08)' }}
                            />
                            <div className="min-w-0 flex-1 space-y-2">
                              <div className="h-3.5 rounded" style={{ background: 'rgba(255,255,255,0.08)', width: `${50 + ((i * 17) % 30)}%` }} />
                              <div className="h-2.5 rounded" style={{ background: 'rgba(255,255,255,0.05)', width: `${30 + ((i * 13) % 20)}%` }} />
                            </div>
                            <div className="h-3 w-16 rounded shrink-0" style={{ background: 'rgba(255,255,255,0.06)' }} />
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Gated overlay */}
                    <div
                      className="absolute inset-0 flex flex-col items-center justify-center rounded-xl"
                      style={{
                        background: 'linear-gradient(to bottom, rgba(15,10,24,0.3) 0%, rgba(15,10,24,0.85) 30%, rgba(15,10,24,0.97) 60%)',
                      }}
                    >
                      <div className="text-center px-6 py-8 max-w-sm">
                        <p
                          className="text-[20px] font-bold m-0 mb-2"
                          style={{ fontFamily: 'Georgia, serif', color: '#ffffff' }}
                        >
                          For GEM Insiders only.
                        </p>
                        <p className="text-[14px] m-0 mb-5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          Get your script evaluated to access rankings, reports, and filters.
                        </p>
                        <div className="flex items-center justify-center gap-3">
                          <button
                            onClick={() => { setActivePage('new-script'); setStep('upload') }}
                            className="text-[13px] font-semibold px-5 py-2.5 rounded-lg text-white border-0 cursor-pointer transition-all hover:brightness-110"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                          >
                            Submit a script
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

            </div>
          </div>
        </main>
      </div>
    </>
  )
}
