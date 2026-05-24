'use client'

// PartnerTriageClient — full-width dark triage interface for producers.
// Opportunity dropdown at top, script-focused list, detail panel with Pass/Meet.

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import type { PartnerApp, PartnerOpp } from '@/app/partner/page'

const LIKED_TAGS = ['Interesting idea', 'Strong voice', 'Producible']
const PASS_REASONS = ['Unoriginal idea', 'Hard to produce', 'Hard to develop', 'Budget concerns', 'Hard to market', 'Bad story']

type SortMode = 'score' | 'heat' | 'new'

// GEM diamond icon
function GemDiamond({ size = 12 }: { size?: number }) {
  return (
    <span
      aria-hidden="true"
      className="inline-flex items-center justify-center shrink-0 rotate-45"
      style={{ width: size * 1.6, height: size * 1.6 }}
    >
      <span className="absolute" style={{ width: size * 1.6, height: size * 1.6, background: 'rgba(124,58,237,0.12)', borderRadius: size * 0.06 }} />
      <span className="absolute" style={{ width: size * 1.2, height: size * 1.2, background: 'rgba(124,58,237,0.22)', borderRadius: size * 0.05 }} />
      <span className="absolute" style={{ width: size, height: size, background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)', borderRadius: size * 0.06 }} />
    </span>
  )
}

export function PartnerTriageClient({
  opportunities,
  applications,
}: {
  opportunities: PartnerOpp[]
  applications: PartnerApp[]
}) {
  const [activeOppId, setActiveOppId] = useState(opportunities[0]?.id || '')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('score')
  const [triageState, setTriageState] = useState<Record<string, { status: string; tags?: string[] }>>(() => {
    const initial: Record<string, { status: string; tags?: string[] }> = {}
    for (const app of applications) {
      if (app.triage_status) {
        initial[app.id] = { status: app.triage_status, tags: app.triage_feedback_tags || undefined }
      }
    }
    return initial
  })
  const [showPassFeedback, setShowPassFeedback] = useState<string | null>(null)
  const [likedTags, setLikedTags] = useState<string[]>([])
  const [reasonTags, setReasonTags] = useState<string[]>([])
  const [customLiked, setCustomLiked] = useState('')
  const [customReason, setCustomReason] = useState('')
  const [addingCustomLiked, setAddingCustomLiked] = useState(false)
  const [addingCustomReason, setAddingCustomReason] = useState(false)
  const [triaging, setTriaging] = useState(false)
  const [showOppDropdown, setShowOppDropdown] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [listTab, setListTab] = useState<'pending' | 'reviewed'>('pending')
  const customLikedRef = useRef<HTMLInputElement>(null)
  const customReasonRef = useRef<HTMLInputElement>(null)

  // Filter apps for active opportunity
  const oppApps = useMemo(() => {
    return applications.filter(a => a.opportunity_id === activeOppId)
  }, [applications, activeOppId])

  // "Reviewed" = triaged as pass/meet (locally or from DB) or review_stage complete/shortlisted
  const isReviewed = (app: PartnerApp) => {
    const localTriage = triageState[app.id]
    if (localTriage && (localTriage.status === 'pass' || localTriage.status === 'meet')) return true
    if (app.triage_status === 'pass' || app.triage_status === 'meet') return true
    return app.review_stage === 'complete' || app.review_stage === 'shortlisted'
  }

  // Stats
  const pendingCount = useMemo(() => oppApps.filter(a => !isReviewed(a)).length, [oppApps, triageState])
  const reviewedCount = useMemo(() => oppApps.filter(a => isReviewed(a)).length, [oppApps, triageState])

  // Sort helper
  const sorter = (a: PartnerApp, b: PartnerApp) => {
    if (sortMode === 'score') {
      const aScore = a.scripts[0]?.score ?? 0
      const bScore = b.scripts[0]?.score ?? 0
      return bScore - aScore
    }
    if (sortMode === 'heat') {
      const aHeat = a.scripts[0]?.heat_score ?? 0
      const bHeat = b.scripts[0]?.heat_score ?? 0
      return bHeat - aHeat
    }
    return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
  }

  // Split into pending (needs attention) vs reviewed (triaged or complete)
  const pendingApps = useMemo(() => {
    return oppApps.filter(a => !isReviewed(a)).sort(sorter)
  }, [oppApps, triageState, sortMode])

  const reviewedApps = useMemo(() => {
    return oppApps.filter(a => isReviewed(a)).sort(sorter)
  }, [oppApps, triageState, sortMode])

  const displayedApps = listTab === 'pending' ? pendingApps : reviewedApps

  // Selected app details
  const selectedApp = useMemo(() => {
    if (selectedAppId) return applications.find(a => a.id === selectedAppId) || null
    return displayedApps[0] || null
  }, [selectedAppId, displayedApps, applications])

  // Previous applications by the same writer for the SAME opportunity
  const writerHistory = useMemo(() => {
    if (!selectedApp) return []
    return applications
      .filter(a => a.writer_id === selectedApp.writer_id && a.opportunity_id === activeOppId && a.id !== selectedApp.id)
      .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime())
  }, [selectedApp, applications, activeOppId])

  const activeOpp = opportunities.find(o => o.id === activeOppId)

  async function handleTriage(action: 'pass' | 'meet', tags?: string[]) {
    if (!selectedApp || triaging) return
    setTriaging(true)

    try {
      const res = await fetch('/api/partner/triage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          consideration_id: selectedApp.id,
          action,
          feedback_tags: tags?.length ? tags : undefined,
        }),
      })

      if (res.ok) {
        setTriageState(prev => ({
          ...prev,
          [selectedApp.id]: { status: action, tags },
        }))
        setShowPassFeedback(null)
        resetFeedback()

        // Auto-advance to next pending app
        const nextApp = pendingApps.find(a => a.id !== selectedApp.id && !isReviewed(a))
        if (nextApp) setSelectedAppId(nextApp.id)
      }
    } finally {
      setTriaging(false)
    }
  }

  function resetFeedback() {
    setLikedTags([])
    setReasonTags([])
    setCustomLiked('')
    setCustomReason('')
    setAddingCustomLiked(false)
    setAddingCustomReason(false)
  }

  function handlePassClick() {
    if (!selectedApp) return
    setShowPassFeedback(selectedApp.id)
  }

  function confirmPass() {
    if (reasonTags.length === 0) return
    const allTags = [
      ...likedTags.map(t => `+${t}`),
      ...reasonTags.map(t => `-${t}`),
    ]
    handleTriage('pass', allTags)
  }

  function addCustomLikedTag() {
    const val = customLiked.trim()
    if (val && !likedTags.includes(val)) {
      setLikedTags(prev => [...prev, val])
    }
    setCustomLiked('')
    setAddingCustomLiked(false)
  }

  function addCustomReasonTag() {
    const val = customReason.trim()
    if (val && !reasonTags.includes(val)) {
      setReasonTags(prev => [...prev, val])
    }
    setCustomReason('')
    setAddingCustomReason(false)
  }

  const fmtDate = (d: string) => {
    const diff = Date.now() - new Date(d).getTime()
    const days = Math.floor(diff / 86400000)
    if (days === 0) return 'today'
    if (days === 1) return '1d ago'
    if (days < 7) return `${days}d ago`
    if (days < 30) return `${Math.floor(days / 7)}w ago`
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="h-screen flex" style={{ background: '#0f0a1a' }}>
        {/* LEFT: Applicant list */}
        <div className="w-[340px] shrink-0 flex flex-col" style={{ borderRight: '1px solid rgba(255,255,255,0.06)' }}>
          {/* Opportunity dropdown */}
          <div className="px-4 py-3 relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => setShowOppDropdown(!showOppDropdown)}
              className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[14px] font-semibold text-white cursor-pointer border-0 transition-all hover:bg-white/10"
              style={{ background: 'rgba(255,255,255,0.06)' }}
            >
              <span className="truncate">{activeOpp?.title || 'Select opportunity'}</span>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform shrink-0 ${showOppDropdown ? 'rotate-180' : ''}`}>
                <path d="M3 4.5L6 7.5L9 4.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            {showOppDropdown && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setShowOppDropdown(false)} />
                <div className="absolute top-full left-4 right-4 mt-1 py-1 rounded-lg z-20 shadow-xl" style={{ background: '#1a1425', border: '1px solid rgba(255,255,255,0.1)' }}>
                  {opportunities.map(opp => {
                    const oppPending = applications.filter(a => {
                      if (a.opportunity_id !== opp.id) return false
                      const lt = triageState[a.id]
                      if (lt && (lt.status === 'pass' || lt.status === 'meet')) return false
                      return a.review_stage !== 'complete'
                    }).length
                    return (
                      <button
                        key={opp.id}
                        onClick={() => { setActiveOppId(opp.id); setSelectedAppId(null); setShowPassFeedback(null); resetFeedback(); setShowOppDropdown(false); setListTab('pending') }}
                        className={`w-full text-left px-4 py-2.5 text-[13px] cursor-pointer border-0 transition-colors flex items-center justify-between ${
                          activeOppId === opp.id ? 'text-purple-300 bg-purple-500/10' : 'text-white/70 hover:text-white hover:bg-white/5'
                        }`}
                        style={{ background: activeOppId === opp.id ? 'rgba(124,58,237,0.1)' : 'transparent' }}
                      >
                        <span className="truncate">{opp.title}</span>
                        <span className="text-[12px] text-white/60 ml-2 shrink-0">{oppPending} pending</span>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </div>
          {/* Pending / Reviewed tabs */}
          <div className="flex items-center" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <button
              onClick={() => { setListTab('pending'); setSelectedAppId(null) }}
              className={`flex-1 text-[12px] py-2.5 cursor-pointer border-0 transition-colors font-medium ${
                listTab === 'pending' ? 'text-white' : 'text-white/30 hover:text-white/50'
              }`}
              style={{ background: 'transparent', borderBottom: listTab === 'pending' ? '2px solid #7c3aed' : '2px solid transparent' }}
            >
              Pending ({pendingCount})
            </button>
            <button
              onClick={() => { setListTab('reviewed'); setSelectedAppId(null) }}
              className={`flex-1 text-[12px] py-2.5 cursor-pointer border-0 transition-colors font-medium ${
                listTab === 'reviewed' ? 'text-white' : 'text-white/30 hover:text-white/50'
              }`}
              style={{ background: 'transparent', borderBottom: listTab === 'reviewed' ? '2px solid #7c3aed' : '2px solid transparent' }}
            >
              Reviewed ({reviewedCount})
            </button>
          </div>
          {/* Sort controls */}
          <div className="flex items-center gap-1 px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            {(['score', 'heat', 'new'] as SortMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`text-[11px] px-2 py-1 rounded-md cursor-pointer border-0 transition-colors ${
                  sortMode === mode
                    ? 'bg-purple-600 text-white'
                    : 'text-white/30 hover:text-white/50 hover:bg-white/5'
                }`}
                style={sortMode !== mode ? { background: 'transparent' } : undefined}
              >
                {mode === 'score' ? 'Score' : mode === 'heat' ? 'Heat' : 'Newest'}
              </button>
            ))}
          </div>
          {/* Scrollable list */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.1) transparent' }}>
          {displayedApps.length === 0 && (
            <div className="px-4 py-12 text-center text-[13px] text-white/30">
              {listTab === 'pending' ? 'No pending applications' : 'No reviewed applications'}
            </div>
          )}
          {displayedApps.map(app => {
            const isPassed = triageState[app.id]?.status === 'pass' || (!triageState[app.id] && (app.triage_status === 'pass' || app.review_stage === 'complete'))
            const isMet = triageState[app.id]?.status === 'meet' || (!triageState[app.id] && (app.triage_status === 'meet' || app.review_stage === 'shortlisted'))
            const isSelected = selectedApp?.id === app.id
            const topScript = app.scripts[0]
            const score = topScript?.score ? Math.round(topScript.score) : null
            const heat = topScript?.heat_score ?? 0

            return (
              <div
                key={app.id}
                onClick={() => { setSelectedAppId(app.id); setShowPassFeedback(null); resetFeedback(); setShowHistory(false) }}
                className={`px-4 py-3 cursor-pointer transition-all ${
                  isSelected ? 'bg-purple-500/10' : 'hover:bg-white/[0.03]'
                } ${isPassed ? 'opacity-35' : ''}`}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: isSelected ? '3px solid #7c3aed' : '3px solid transparent' }}
              >
                {/* Script title + score */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[14px] font-medium truncate flex-1 ${isPassed ? 'line-through text-white/30' : 'text-white'}`}>
                    {topScript?.title || 'No script'}
                  </span>
                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    {isMet && <span className="text-[10px] text-green-400">✓ Meet</span>}
                    {isPassed && <span className="text-[10px] text-white/30">Passed</span>}
                    {score && !isPassed && (
                      <span className="flex items-center gap-0.5">
                        <GemDiamond size={7} />
                        <span className={`text-[13px] font-bold ${score >= 75 ? 'text-purple-400' : 'text-white/40'}`}>
                          {score}
                        </span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Format · Genre · Budget */}
                <div className="flex items-center gap-1.5 text-[12px] text-white/60 mb-1">
                  {topScript?.format && <span>{topScript.format}</span>}
                  {topScript?.format && topScript?.genre && <span>·</span>}
                  {topScript?.genre && <span>{topScript.genre}</span>}
                  {topScript?.budget_tier && <><span>·</span><span>{topScript.budget_tier}</span></>}
                </div>

                {/* Writer name + heat + app count + date */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[12px] text-white/50">{app.writer_name || 'Unknown'}</span>
                    {app.writer_app_count > 1 && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                        ×{app.writer_app_count}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    {heat > 0 && <span className="text-[11px] text-orange-400">🔥{heat}</span>}
                    <span className="text-[11px] text-white/20">{fmtDate(app.submitted_at)}</span>
                  </div>
                </div>
              </div>
            )
          })}
          </div>
        </div>

        {/* RIGHT: Detail panel */}
        <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {!selectedApp ? (
            <div className="flex-1 flex items-center justify-center text-[14px] text-white/25">
              Select an application to review
            </div>
          ) : (
            <>
              {/* Writer info bar */}
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {selectedApp.writer_avatar_url ? (
                  <img src={selectedApp.writer_avatar_url} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[13px] text-purple-300 shrink-0" style={{ background: 'rgba(124,58,237,0.15)' }}>
                    {(selectedApp.writer_name || '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[14px] text-white">{selectedApp.writer_name || 'Unknown'}</span>
                    {selectedApp.writer_app_count > 1 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                        {selectedApp.writer_app_count} applications
                      </span>
                    )}
                    {(() => {
                      const st = triageState[selectedApp.id]?.status || selectedApp.triage_status || (selectedApp.review_stage === 'complete' ? 'pass' : selectedApp.review_stage === 'shortlisted' ? 'meet' : null)
                      if (!st || (st !== 'pass' && st !== 'meet')) return null
                      const isMeet = st === 'meet'
                      return (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isMeet ? 'text-green-400' : 'text-white/30'}`}
                          style={{ background: isMeet ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.05)' }}>
                          {isMeet ? 'Meeting' : 'Passed'}
                        </span>
                      )
                    })()}
                  </div>
                  {selectedApp.writer_headline && (
                    <p className="text-[13px] text-white/70 m-0 mt-0.5 truncate">{selectedApp.writer_headline}</p>
                  )}
                </div>
                <span className="text-[13px] text-white/60">{fmtDate(selectedApp.submitted_at)}</span>
              </div>

              {/* Script details */}
              {selectedApp.scripts.map(script => (
                <div key={script.submission_id} className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Poster + title row */}
                  <div className="flex gap-4 mb-3">
                    {script.poster_url && (
                      <img src={script.poster_url} alt="" className="w-[100px] h-[140px] rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[17px] font-semibold text-white truncate">{script.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {(script.heat_score ?? 0) > 0 && <span className="text-[14px] text-orange-400">🔥 {script.heat_score}</span>}
                          {script.score && (
                            <span className="flex items-center gap-1 text-[16px] font-bold text-purple-400">
                              <GemDiamond size={9} /> {Math.round(script.score)}
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Metadata pills */}
                      <div className="flex items-center gap-1.5 mb-2">
                        {script.format && (
                          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>{script.format}</span>
                        )}
                        {script.genre && (
                          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>{script.genre}</span>
                        )}
                        {script.budget_tier && (
                          <span className="text-[12px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)' }}>{script.budget_tier}</span>
                        )}
                      </div>
                      {script.logline && (
                        <p className="text-[14px] text-white/80 m-0 leading-relaxed">{script.logline}</p>
                      )}
                      {script.eval_id && (
                        <Link
                          href={`/report/${script.eval_id}`}
                          className="text-[13px] text-purple-400 mt-2 inline-block hover:text-purple-300 transition-colors no-underline"
                        >
                          View full report →
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {/* Writer's note */}
              {(() => {
                const note = selectedApp.application_responses?.fit_originality || selectedApp.writer_pitch
                if (!note) return null
                return (
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-[12px] text-white/60 uppercase tracking-wider font-medium">Writer&apos;s note</span>
                    <p className="text-[14px] text-white/80 m-0 mt-2 leading-relaxed italic">
                      &ldquo;{note}&rdquo;
                    </p>
                  </div>
                )
              })()}

              {/* Previous applications by this writer */}
              {writerHistory.length > 0 && (
                <div className="px-6 py-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <button
                    onClick={() => setShowHistory(!showHistory)}
                    className="flex items-center gap-2 text-[13px] text-white/70 hover:text-white/90 cursor-pointer bg-transparent border-0 transition-colors"
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className={`transition-transform ${showHistory ? 'rotate-90' : ''}`}>
                      <path d="M3 1.5L6.5 5L3 8.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    {writerHistory.length} previous application{writerHistory.length !== 1 ? 's' : ''}
                  </button>
                  {showHistory && (
                    <div className="mt-2 space-y-1.5">
                      {writerHistory.map(prev => {
                        const prevStatus = triageState[prev.id]?.status || prev.triage_status
                        const prevTags = triageState[prev.id]?.tags || prev.triage_feedback_tags
                        const prevHeat = prev.scripts[0]?.heat_score ?? 0
                        return (
                          <div
                            key={prev.id}
                            onClick={() => { setSelectedAppId(prev.id); setShowPassFeedback(null); resetFeedback() }}
                            className="px-3 py-2.5 rounded-lg cursor-pointer transition-colors hover:bg-white/[0.04]"
                            style={{ background: 'rgba(255,255,255,0.02)' }}
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-[13px] text-white/80 truncate">{prev.scripts[0]?.title || 'No script'}</span>
                              <div className="flex items-center gap-2 shrink-0">
                                {prevHeat > 0 && (
                                  <span className="text-[11px] text-orange-400">🔥 +{prevHeat}</span>
                                )}
                                {prevStatus && (
                                  <span className={`text-[11px] px-1.5 py-0.5 rounded-full ${prevStatus === 'meet' ? 'text-green-400' : 'text-white/50'}`} style={{
                                    background: prevStatus === 'meet' ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.04)',
                                  }}>
                                    {prevStatus === 'meet' ? '✓ Shortlisted' : 'Passed'}
                                  </span>
                                )}
                                <span className="text-[12px] text-white/60">{fmtDate(prev.submitted_at)}</span>
                              </div>
                            </div>
                            {prevTags && prevTags.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-1.5">
                                {prevTags.map(tag => (
                                  <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                                    background: tag.startsWith('+') ? 'rgba(74,222,128,0.08)' : 'rgba(248,113,113,0.08)',
                                    color: tag.startsWith('+') ? 'rgba(74,222,128,0.6)' : 'rgba(248,113,113,0.6)',
                                  }}>
                                    {tag.replace(/^[+-]/, '')}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Action buttons */}
              <div className="px-6 py-5 mt-auto" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
                {!triageState[selectedApp.id] && (
                  <>
                    {showPassFeedback !== selectedApp.id ? (
                      <div className="flex gap-3">
                        <button
                          onClick={handlePassClick}
                          disabled={triaging}
                          className="flex-1 py-3 rounded-xl text-[14px] font-medium cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
                        >
                          Pass
                        </button>
                        <button
                          onClick={() => handleTriage('meet')}
                          disabled={triaging}
                          className="flex-[2] py-3 rounded-xl border-0 text-[14px] font-semibold text-white cursor-pointer transition-all flex items-center justify-center gap-2 disabled:opacity-50 hover:brightness-110"
                          style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                        >
                          Meet
                        </button>
                      </div>
                    ) : (
                      /* Pass feedback — sleek inline pills */
                      <div className="space-y-4">
                        {/* Liked section */}
                        <div>
                          <span className="text-[12px] text-white/40 mb-2 block">Anything you liked?</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {LIKED_TAGS.map(tag => (
                              <button
                                key={tag}
                                onClick={() => setLikedTags(prev =>
                                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                )}
                                className={`text-[12px] px-3 py-1.5 rounded-full cursor-pointer transition-all border-0 ${
                                  likedTags.includes(tag)
                                    ? 'text-green-300'
                                    : 'text-white/40 hover:text-white/60'
                                }`}
                                style={{
                                  background: likedTags.includes(tag) ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
                                }}
                              >
                                {tag}
                              </button>
                            ))}
                            {/* Custom liked tags that have been added */}
                            {likedTags.filter(t => !LIKED_TAGS.includes(t)).map(tag => (
                              <button
                                key={tag}
                                onClick={() => setLikedTags(prev => prev.filter(t => t !== tag))}
                                className="text-[12px] px-3 py-1.5 rounded-full cursor-pointer transition-all border-0 text-green-300"
                                style={{ background: 'rgba(74,222,128,0.12)' }}
                              >
                                {tag} ×
                              </button>
                            ))}
                            {/* Add custom — inline input */}
                            {addingCustomLiked ? (
                              <input
                                ref={customLikedRef}
                                autoFocus
                                type="text"
                                value={customLiked}
                                onChange={e => setCustomLiked(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addCustomLikedTag(); if (e.key === 'Escape') { setAddingCustomLiked(false); setCustomLiked('') } }}
                                onBlur={addCustomLikedTag}
                                placeholder="Type and press Enter"
                                className="text-[12px] px-3 py-1.5 rounded-full outline-none text-white/70 w-[160px]"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(124,58,237,0.3)' }}
                              />
                            ) : (
                              <button
                                onClick={() => { setAddingCustomLiked(true); setTimeout(() => customLikedRef.current?.focus(), 50) }}
                                className="text-[12px] px-3 py-1.5 rounded-full cursor-pointer transition-all border-0 text-white/25 hover:text-white/40"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}
                              >
                                + Other
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Pass reason section */}
                        <div>
                          <span className="text-[12px] text-white/40 mb-2 block">Why are you passing?</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {PASS_REASONS.map(tag => (
                              <button
                                key={tag}
                                onClick={() => setReasonTags(prev =>
                                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                )}
                                className={`text-[12px] px-3 py-1.5 rounded-full cursor-pointer transition-all border-0 ${
                                  reasonTags.includes(tag)
                                    ? 'text-red-300'
                                    : 'text-white/40 hover:text-white/60'
                                }`}
                                style={{
                                  background: reasonTags.includes(tag) ? 'rgba(248,113,113,0.12)' : 'rgba(255,255,255,0.06)',
                                }}
                              >
                                {tag}
                              </button>
                            ))}
                            {/* Custom reason tags */}
                            {reasonTags.filter(t => !PASS_REASONS.includes(t)).map(tag => (
                              <button
                                key={tag}
                                onClick={() => setReasonTags(prev => prev.filter(t => t !== tag))}
                                className="text-[12px] px-3 py-1.5 rounded-full cursor-pointer transition-all border-0 text-red-300"
                                style={{ background: 'rgba(248,113,113,0.12)' }}
                              >
                                {tag} ×
                              </button>
                            ))}
                            {/* Add custom reason */}
                            {addingCustomReason ? (
                              <input
                                ref={customReasonRef}
                                autoFocus
                                type="text"
                                value={customReason}
                                onChange={e => setCustomReason(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') addCustomReasonTag(); if (e.key === 'Escape') { setAddingCustomReason(false); setCustomReason('') } }}
                                onBlur={addCustomReasonTag}
                                placeholder="Type and press Enter"
                                className="text-[12px] px-3 py-1.5 rounded-full outline-none text-white/70 w-[160px]"
                                style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(124,58,237,0.3)' }}
                              />
                            ) : (
                              <button
                                onClick={() => { setAddingCustomReason(true); setTimeout(() => customReasonRef.current?.focus(), 50) }}
                                className="text-[12px] px-3 py-1.5 rounded-full cursor-pointer transition-all border-0 text-white/25 hover:text-white/40"
                                style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.1)' }}
                              >
                                + Other
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Confirm / Cancel */}
                        <div className="flex items-center gap-3 pt-1">
                          <button
                            onClick={confirmPass}
                            disabled={triaging || reasonTags.length === 0}
                            className="text-[13px] font-semibold px-5 py-2 rounded-lg text-white cursor-pointer border-0 disabled:opacity-20 disabled:cursor-not-allowed transition-all hover:brightness-110"
                            style={{ background: 'linear-gradient(135deg, #7c3aed, #a855f7)' }}
                          >
                            Confirm pass
                          </button>
                          <button
                            onClick={() => { setShowPassFeedback(null); resetFeedback() }}
                            className="text-[13px] text-white/30 hover:text-white/50 cursor-pointer bg-transparent border-0 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {(() => {
                  const st = triageState[selectedApp.id]?.status || selectedApp.triage_status || (selectedApp.review_stage === 'complete' ? 'pass' : selectedApp.review_stage === 'shortlisted' ? 'meet' : null)
                  if (!st || (st !== 'pass' && st !== 'meet')) return null
                  return (
                    <div className="flex items-center justify-center gap-3 py-2">
                      <span className="text-[13px] text-white/30">
                        {st === 'pass' && 'Passed'}
                        {st === 'meet' && 'Meeting requested'}
                      </span>
                      {triageState[selectedApp.id] && (
                        <button
                          onClick={() => {
                            setTriageState(prev => {
                              const next = { ...prev }
                              delete next[selectedApp.id]
                              return next
                            })
                          }}
                          className="text-[12px] text-purple-400 hover:text-purple-300 cursor-pointer bg-transparent border-0 transition-colors"
                        >
                          Undo
                        </button>
                      )}
                    </div>
                  )
                })()}
              </div>
            </>
          )}
        </div>
    </div>
  )
}
