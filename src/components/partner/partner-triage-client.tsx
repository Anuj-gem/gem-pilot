'use client'

// PartnerTriageClient — full-width dark triage interface for producers.
// Opportunity dropdown at top, script-focused list, detail panel with Pass/Meet.

import { useState, useMemo, useRef } from 'react'
import Link from 'next/link'
import type { PartnerApp, PartnerOpp, ScriptSentiment } from '@/app/partner/page'
import { OpportunitySettings } from './opportunity-settings'

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
  scriptSentiment = {},
}: {
  opportunities: PartnerOpp[]
  applications: PartnerApp[]
  scriptSentiment?: Record<string, ScriptSentiment>
}) {
  const [activeOppId, setActiveOppId] = useState(opportunities[0]?.id || '')
  const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<SortMode>('score')
  const [triageState, setTriageState] = useState<Record<string, { status: string; tags?: string[] }>>(() => {
    const initial: Record<string, { status: string; tags?: string[] }> = {}
    for (const app of applications) {
      if (app.triage_status === 'pass' || app.triage_status === 'meet') {
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
  const [heatOverride, setHeatOverride] = useState(0)
  const [triaging, setTriaging] = useState(false)
  const [showOppDropdown, setShowOppDropdown] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [noteExpanded, setNoteExpanded] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [listTab, setListTab] = useState<'pending' | 'reviewed'>('pending')
  const customLikedRef = useRef<HTMLInputElement>(null)
  const customReasonRef = useRef<HTMLInputElement>(null)

  // Filter apps for active opportunity
  const oppApps = useMemo(() => {
    return applications.filter(a => a.opportunity_id === activeOppId)
  }, [applications, activeOppId])

  // "Reviewed" = triaged as pass/meet (locally or from DB) or review_stage complete
  const isReviewed = (app: PartnerApp) => {
    const localTriage = triageState[app.id]
    if (localTriage && (localTriage.status === 'pass' || localTriage.status === 'meet')) return true
    if (app.triage_status === 'pass' || app.triage_status === 'meet') return true
    return app.review_stage === 'complete'
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

  async function handleTriage(action: 'pass' | 'meet', tags?: string[], heat?: number) {
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
          ...(heat !== undefined ? { heat_override: heat } : {}),
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
    setHeatOverride(0)
    setCustomLiked('')
    setCustomReason('')
    setAddingCustomLiked(false)
    setAddingCustomReason(false)
  }

  function toggleLikedTag(tag: string) {
    setLikedTags(prev => {
      const removing = prev.includes(tag)
      const next = removing ? prev.filter(t => t !== tag) : [...prev, tag]
      // Auto-bump heat to 1 when first positive tag added, drop to 0 when all removed
      if (!removing && prev.length === 0) setHeatOverride(h => Math.max(h, 1))
      if (removing && next.length === 0) setHeatOverride(0)
      return next
    })
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
    handleTriage('pass', allTags, heatOverride)
  }

  function addCustomLikedTag() {
    const val = customLiked.trim()
    if (val && !likedTags.includes(val)) {
      setLikedTags(prev => {
        if (prev.length === 0) setHeatOverride(h => Math.max(h, 1))
        return [...prev, val]
      })
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
    <div className="h-screen flex overflow-hidden" style={{ background: '#0f0a1a' }}>
        {/* LEFT: Applicant list */}
        <div className="w-[380px] shrink-0 flex flex-col" style={{ borderRight: '1px solid rgba(255,255,255,0.06)', boxShadow: '4px 0 20px rgba(0,0,0,0.3)' }}>
          {/* Opportunity dropdown + settings */}
          <div className="px-4 py-3 relative" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowOppDropdown(!showOppDropdown)}
                className="flex-1 min-w-0 flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-[14px] font-semibold text-white cursor-pointer border-0 transition-all hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <span className="truncate min-w-0">{activeOpp?.title || 'Select opportunity'}</span>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className={`transition-transform shrink-0 ${showOppDropdown ? 'rotate-180' : ''}`}>
                  <path d="M3 4.5L6 7.5L9 4.5" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
              <button
                onClick={() => setShowSettings(true)}
                title="Opportunity settings"
                className="shrink-0 w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer border-0 transition-colors hover:bg-white/10"
                style={{ background: 'rgba(255,255,255,0.06)' }}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
              </button>
            </div>
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
          <div className="flex items-center gap-1.5 px-4 py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
            <span className="text-[11px] text-white/40 mr-1">Sort:</span>
            {(['score', 'heat', 'new'] as SortMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`text-[11px] px-2.5 py-1 rounded-md cursor-pointer border-0 transition-colors ${
                  sortMode === mode
                    ? 'bg-purple-600 text-white'
                    : 'text-white/50 hover:text-white/70'
                }`}
                style={sortMode !== mode ? { background: 'rgba(255,255,255,0.06)' } : undefined}
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
            const isMet = triageState[app.id]?.status === 'meet' || (!triageState[app.id] && app.triage_status === 'meet')
            const isSelected = selectedApp?.id === app.id
            const topScript = app.scripts[0]
            const score = topScript?.score ? Math.round(topScript.score) : null
            const heat = topScript?.heat_score ?? 0

            return (
              <div
                key={app.id}
                onClick={() => { setSelectedAppId(app.id); setShowPassFeedback(null); resetFeedback(); setShowHistory(false); setNoteExpanded(false) }}
                className={`px-4 py-3 cursor-pointer transition-all ${
                  isSelected ? 'bg-purple-500/10' : 'hover:bg-white/[0.03]'
                } ${isPassed ? 'opacity-35' : ''}`}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.04)', borderLeft: isSelected ? '3px solid #7c3aed' : '3px solid transparent' }}
              >
                {/* Script title + date */}
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-[14px] font-medium truncate flex-1 ${isPassed ? 'line-through text-white/30' : 'text-white'}`}>
                    {topScript?.title || 'No script'}
                  </span>
                  <span className="text-[11px] text-white/30 shrink-0 ml-2">{fmtDate(app.submitted_at)}</span>
                </div>

                {/* Score + heat + status */}
                <div className="flex items-center gap-2 mb-1">
                  {score && !isPassed && (
                    <span className="flex items-center gap-0.5">
                      <GemDiamond size={7} />
                      <span className={`text-[13px] font-bold ${score >= 75 ? 'text-purple-400' : 'text-white/40'}`}>
                        {score}
                      </span>
                    </span>
                  )}
                  <span className={`text-[11px] ${heat > 0 ? 'text-orange-400' : 'text-white/25'}`}>🔥{heat}</span>
                  {isMet && <span className="text-[10px] text-green-400">✓ Meet</span>}
                  {isPassed && <span className="text-[10px] text-white/30">Passed</span>}
                </div>

                {/* Format · Genre · Budget */}
                <div className="flex items-center gap-1.5 text-[12px] text-white/60 mb-1">
                  {topScript?.format && <span>{topScript.format}</span>}
                  {topScript?.format && topScript?.genre && <span>·</span>}
                  {topScript?.genre && <span>{topScript.genre}</span>}
                  {topScript?.budget_tier && <><span>·</span><span>{topScript.budget_tier}</span></>}
                </div>

                {/* Writer name + app count */}
                <div className="flex items-center gap-1.5">
                  <span className="text-[12px] text-white/50">{app.writer_name || 'Unknown'}</span>
                  {app.writer_app_count > 1 && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full font-medium" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                      {app.writer_app_count === 2 ? '2nd' : app.writer_app_count === 3 ? '3rd' : `${app.writer_app_count}th`} App
                    </span>
                  )}
                </div>
              </div>
            )
          })}
          </div>
        </div>

        {/* RIGHT: Detail panel */}
        <div className="flex-1 flex flex-col overflow-y-auto" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {!selectedApp ? (
            <div className="flex-1 flex items-center justify-center text-[15px] text-white/30">
              Select an application to review
            </div>
          ) : (
            <>
              {/* Writer info bar */}
              <div className="px-6 py-4 flex items-center gap-3" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                {selectedApp.writer_avatar_url ? (
                  <img src={selectedApp.writer_avatar_url} alt="" className="w-10 h-10 rounded-full object-cover shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[14px] text-purple-300 shrink-0" style={{ background: 'rgba(124,58,237,0.15)' }}>
                    {(selectedApp.writer_name || '?')[0]?.toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[15px] text-white">{selectedApp.writer_name || 'Unknown'}</span>
                    {selectedApp.writer_app_count > 1 && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}>
                        {selectedApp.writer_app_count === 2 ? '2nd' : selectedApp.writer_app_count === 3 ? '3rd' : `${selectedApp.writer_app_count}th`} Application
                      </span>
                    )}
                    {(() => {
                      const st = triageState[selectedApp.id]?.status || selectedApp.triage_status || (selectedApp.review_stage === 'complete' ? 'pass' : null)
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
                    <p className="text-[13px] text-white/80 m-0 mt-0.5 truncate">{selectedApp.writer_headline}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[12px] text-white/50">📄 {selectedApp.writer_script_count} script{selectedApp.writer_script_count !== 1 ? 's' : ''}</span>
                    {selectedApp.writer_top_score != null && (
                      <span className="flex items-center gap-1 text-[12px] text-white/50"><GemDiamond size={7} /> Top GEM Score {selectedApp.writer_top_score}</span>
                    )}
                    <span className="text-[12px] text-white/50">🔥 {selectedApp.writer_total_heat} heat</span>
                  </div>
                </div>
                <span className="text-[13px] text-white/60">{fmtDate(selectedApp.submitted_at)}</span>
              </div>

              {/* Script details */}
              {selectedApp.scripts.map(script => {
                const scriptHeat = script.heat_score ?? 0
                return (
                <div key={script.submission_id} className="px-6 py-6" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {/* Poster + title row */}
                  <div className="flex gap-5">
                    {script.poster_url && (
                      <img src={script.poster_url} alt="" className="w-[120px] h-[170px] rounded-lg object-cover shrink-0" />
                    )}
                    <div className="flex-1 min-w-0 flex flex-col">
                      {/* Title */}
                      <h3 className="text-[20px] font-semibold text-white m-0 mb-1.5 truncate">{script.title}</h3>
                      {/* Metadata pills */}
                      <div className="flex items-center gap-1.5 mb-2.5">
                        {script.format && (
                          <span className="text-[12px] px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>{script.format}</span>
                        )}
                        {script.genre && (
                          <span className="text-[12px] px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>{script.genre}</span>
                        )}
                        {script.budget_tier && (
                          <span className="text-[12px] px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)' }}>{script.budget_tier}</span>
                        )}
                      </div>
                      {/* Logline */}
                      {script.logline && (
                        <p className="text-[15px] text-white/90 m-0 leading-relaxed mb-3">{script.logline}</p>
                      )}
                      {/* Score + Heat + Report button row */}
                      <div className="flex items-center gap-4 mt-auto">
                        {script.score && (
                          <span className="flex items-center gap-1.5 text-[15px] font-bold text-purple-400">
                            <GemDiamond size={10} /> GEM Score {Math.round(script.score)}
                          </span>
                        )}
                        <span className={`flex items-center gap-1 text-[14px] font-medium ${scriptHeat > 0 ? 'text-orange-400' : 'text-white/30'}`}>
                          🔥 Industry Heat {scriptHeat}
                        </span>
                        {script.eval_id && (
                          <Link
                            href={`/report/${script.eval_id}`}
                            className="ml-auto text-[12px] font-medium px-3 py-1.5 rounded-lg no-underline transition-all hover:brightness-110"
                            style={{ background: 'rgba(124,58,237,0.15)', color: '#a78bfa', border: '1px solid rgba(124,58,237,0.3)' }}
                          >
                            View full report
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                )
              })}

              {/* Writer's note */}
              {(() => {
                const note = selectedApp.application_responses?.fit_originality || selectedApp.writer_pitch
                if (!note) return null
                // noteExpanded state is declared at component level
                const isLong = note.length > 200
                const displayNote = isLong && !noteExpanded ? note.slice(0, 200) + '...' : note
                return (
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-[13px] text-white/60 uppercase tracking-wider font-medium">Writer&apos;s note</span>
                    <p className="text-[15px] text-white/90 m-0 mt-2 leading-relaxed">
                      {displayNote}
                    </p>
                    {isLong && !noteExpanded && (
                      <button
                        onClick={() => setNoteExpanded(true)}
                        className="text-[13px] text-purple-400 hover:text-purple-300 mt-1 cursor-pointer bg-transparent border-0 p-0 transition-colors"
                      >
                        See more
                      </button>
                    )}
                  </div>
                )
              })()}

              {/* Previous applications by this writer for this opportunity */}
              {writerHistory.length > 0 && (
                <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <span className="text-[12px] text-white/60 uppercase tracking-wider font-medium">
                    {writerHistory.length} previous application{writerHistory.length !== 1 ? 's' : ''}
                  </span>
                  <div className="mt-3 space-y-2.5">
                    {writerHistory.map(prev => {
                      const prevStatus = triageState[prev.id]?.status || prev.triage_status
                      const prevScript = prev.scripts[0]
                      const prevHeat = prev.heat_earned ?? 0
                      const prevTags = triageState[prev.id]?.tags || [...(prev.triage_feedback_tags || []), ...(prev.feedback_tags || []), ...(prev.next_steps_tags || [])]
                      return (
                        <div key={prev.id} className="px-3 py-2.5 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)' }}>
                          <div className="flex items-center justify-between gap-2">
                            {prevScript?.eval_id ? (
                              <Link href={`/report/${prevScript.eval_id}`} className="text-[13px] text-purple-400 hover:text-purple-300 truncate no-underline">
                                {prevScript.title || 'Untitled'}
                              </Link>
                            ) : (
                              <span className="text-[13px] text-white/80 truncate">{prevScript?.title || 'No script'}</span>
                            )}
                            <span className="text-[12px] text-white/40 shrink-0">{fmtDate(prev.submitted_at)}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-1.5">
                            {prevStatus && (
                              <span className="text-[12px] text-white/60">
                                {prevStatus === 'meet' ? 'Shortlisted' : 'Passed'}
                              </span>
                            )}
                            {prevHeat > 0 && (
                              <span className="text-[12px] text-orange-400">+{prevHeat} heat</span>
                            )}
                          </div>
                          {prevTags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {prevTags.map(tag => (
                                <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: 'rgba(167,139,250,0.8)' }}>
                                  {tag.replace(/^[+-]/, '')}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {/* Industry sentiment — completed reviews for THIS app's scripts only */}
              {(() => {
                const appScriptIds = selectedApp.scripts.map(s => s.submission_id)
                const aggregated = { total_heat: 0, liked_tags: new Set<string>(), pass_tags: new Set<string>(), review_count: 0 }
                for (const sid of appScriptIds) {
                  const s = scriptSentiment[sid]
                  if (!s) continue
                  aggregated.total_heat += s.total_heat
                  aggregated.review_count += s.review_count
                  for (const tag of Object.keys(s.liked_tags)) aggregated.liked_tags.add(tag)
                  for (const tag of Object.keys(s.pass_tags)) aggregated.pass_tags.add(tag)
                }
                const likedArr = [...aggregated.liked_tags]
                const passArr = [...aggregated.pass_tags]
                const scriptTitle = selectedApp.scripts[0]?.title || 'this script'
                return (
                  <div className="px-6 py-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <span className="text-[13px] text-white/60 uppercase tracking-wider font-medium">
                      Industry sentiment about {scriptTitle}
                    </span>
                    {aggregated.review_count === 0 ? (
                      <p className="text-[13px] text-white/50 mt-2 mb-0">
                        No completed reviews yet. You would be the first.
                      </p>
                    ) : (
                      <>
                        <p className="text-[13px] text-white/50 mt-1 mb-0">
                          From {aggregated.review_count} completed review{aggregated.review_count !== 1 ? 's' : ''} across all opportunities
                        </p>

                        {aggregated.total_heat > 0 && (
                          <div className="mt-3 flex items-center gap-2">
                            <span className="text-[14px] text-orange-400 font-medium">🔥 {aggregated.total_heat} total heat earned</span>
                          </div>
                        )}

                        {likedArr.length > 0 && (
                          <div className="mt-3">
                            <span className="text-[12px] text-white/50 uppercase tracking-wider">What people liked</span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {likedArr.map(tag => (
                                <span key={tag} className="text-[12px] px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: 'rgba(167,139,250,0.9)' }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {passArr.length > 0 && (
                          <div className="mt-3">
                            <span className="text-[12px] text-white/50 uppercase tracking-wider">Why people passed</span>
                            <div className="flex flex-wrap gap-1.5 mt-1.5">
                              {passArr.map(tag => (
                                <span key={tag} className="text-[12px] px-2.5 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: 'rgba(167,139,250,0.9)' }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )
              })()}

              {/* Action buttons */}
              <div className="px-6 py-5" style={{ borderTop: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.03)' }}>
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
                          disabled
                          className="flex-1 py-3 rounded-xl border-0 text-[14px] font-semibold text-white cursor-not-allowed transition-all flex items-center justify-center gap-2 opacity-40"
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
                                onClick={() => toggleLikedTag(tag)}
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
                                onClick={() => toggleLikedTag(tag)}
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

                        {/* Heat stepper */}
                        <div className="flex items-center gap-3">
                          <span className="text-[12px] text-white/40">🔥 Heat</span>
                          <div className="flex items-center gap-0 rounded-lg overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <button
                              onClick={() => setHeatOverride(h => Math.max(0, h - 1))}
                              className="text-[14px] px-2.5 py-1 text-white/40 hover:text-white/70 cursor-pointer bg-transparent border-0 transition-colors"
                            >
                              −
                            </button>
                            <span className={`text-[14px] font-bold min-w-[28px] text-center ${heatOverride > 0 ? 'text-orange-400' : 'text-white/20'}`}>
                              {heatOverride}
                            </span>
                            <button
                              onClick={() => setHeatOverride(h => h + 1)}
                              className="text-[14px] px-2.5 py-1 text-white/40 hover:text-white/70 cursor-pointer bg-transparent border-0 transition-colors"
                            >
                              +
                            </button>
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
                  const st = triageState[selectedApp.id]?.status || selectedApp.triage_status || (selectedApp.review_stage === 'complete' ? 'pass' : null)
                  if (!st || (st !== 'pass' && st !== 'meet')) return null
                  const tags = triageState[selectedApp.id]?.tags || selectedApp.triage_feedback_tags || []
                  return (
                    <div className="py-3 space-y-2">
                      <div className="flex items-center gap-3">
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
                      {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {tags.map(tag => (
                            <span key={tag} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(124,58,237,0.1)', color: 'rgba(167,139,250,0.8)' }}>
                              {tag.replace(/^[+-]/, '')}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })()}
              </div>
            </>
          )}
        </div>

      {/* Opportunity Settings Modal */}
      {showSettings && activeOpp && (
        <OpportunitySettings
          opportunity={{
            id: activeOpp.id,
            title: activeOpp.title,
            subtitle: activeOpp.subtitle,
            description: activeOpp.description,
            status: activeOpp.status,
            formats: activeOpp.formats || [],
            genres: activeOpp.genres || [],
            budget_tiers: activeOpp.budget_tiers || [],
            tags: activeOpp.tags || [],
            investment_range: (activeOpp as any).investment_range || null,
            investment_thesis: (activeOpp as any).investment_thesis || null,
            investment_requirements: (activeOpp as any).investment_requirements || [],
          }}
          onClose={() => setShowSettings(false)}
          onSaved={() => { setShowSettings(false); window.location.reload() }}
        />
      )}
    </div>
  )
}
