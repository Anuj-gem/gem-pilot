'use client'

// PartnerTriageClient — master/detail triage interface for producers.
// Opportunity tabs across top, sorted list on left, detail + actions on right.

import { useState, useMemo } from 'react'
import Link from 'next/link'
import type { PartnerApp, PartnerOpp } from '@/app/partner/page'

const PASS_TAGS = [
  'Liked the voice',
  'Strong concept',
  'Not right for me',
  'Needs more work',
  'Wrong genre',
  'Promising writer',
]

type SortMode = 'score' | 'heat' | 'new'

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
    // Initialize from existing triage data
    const initial: Record<string, { status: string; tags?: string[] }> = {}
    for (const app of applications) {
      if (app.triage_status) {
        initial[app.id] = { status: app.triage_status, tags: app.triage_feedback_tags || undefined }
      }
    }
    return initial
  })
  const [showPassFeedback, setShowPassFeedback] = useState<string | null>(null)
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [triaging, setTriaging] = useState(false)

  // Filter apps for active opportunity
  const oppApps = useMemo(() => {
    return applications.filter(a => a.opportunity_id === activeOppId)
  }, [applications, activeOppId])

  // Sort apps
  const sortedApps = useMemo(() => {
    const untriaged = oppApps.filter(a => !triageState[a.id] || triageState[a.id].status !== 'pass')
    const passed = oppApps.filter(a => triageState[a.id]?.status === 'pass')

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
      // new
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    }

    return [...untriaged.sort(sorter), ...passed]
  }, [oppApps, sortMode, triageState])

  // Selected app details
  const selectedApp = useMemo(() => {
    if (selectedAppId) return applications.find(a => a.id === selectedAppId) || null
    // Auto-select first untriaged app
    const first = sortedApps.find(a => !triageState[a.id])
    return first || sortedApps[0] || null
  }, [selectedAppId, sortedApps, applications, triageState])

  // Count per opportunity
  const oppCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const opp of opportunities) {
      counts[opp.id] = applications.filter(a => a.opportunity_id === opp.id).length
    }
    return counts
  }, [opportunities, applications])

  async function handleTriage(action: 'pass' | 'watchlist' | 'meet', tags?: string[]) {
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
        setSelectedTags([])

        // Auto-advance to next untriaged app
        const nextApp = sortedApps.find(a => a.id !== selectedApp.id && !triageState[a.id])
        if (nextApp) setSelectedAppId(nextApp.id)
      }
    } finally {
      setTriaging(false)
    }
  }

  function handlePassClick() {
    if (!selectedApp) return
    setShowPassFeedback(selectedApp.id)
  }

  function confirmPass() {
    handleTriage('pass', selectedTags)
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
    <div className="max-w-5xl mx-auto">
      {/* Opportunity tabs */}
      <div className="flex items-center gap-1 border-b border-gray-200 mb-0 overflow-x-auto">
        {opportunities.map(opp => (
          <button
            key={opp.id}
            onClick={() => { setActiveOppId(opp.id); setSelectedAppId(null) }}
            className={`px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer bg-transparent ${
              activeOppId === opp.id
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {opp.title}
            <span className="text-gray-400 ml-1.5 text-[11px]">{oppCounts[opp.id]}</span>
          </button>
        ))}
      </div>

      {/* Master/detail split */}
      <div className="flex border border-gray-200 rounded-xl overflow-hidden bg-white" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
        {/* LEFT: App list */}
        <div className="w-[280px] border-r border-gray-200 flex flex-col shrink-0">
          {/* Sort controls */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-1.5">
            <span className="text-[11px] text-gray-400 mr-1">Sort:</span>
            {(['score', 'heat', 'new'] as SortMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`text-[11px] px-2 py-1 rounded cursor-pointer border-0 transition-colors ${
                  sortMode === mode
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}
              >
                {mode === 'score' ? 'Score' : mode === 'heat' ? 'Heat' : 'Newest'}
              </button>
            ))}
          </div>

          {/* App rows */}
          <div className="flex-1 overflow-y-auto">
            {sortedApps.length === 0 && (
              <div className="px-4 py-8 text-center text-[13px] text-gray-400">No applications yet</div>
            )}
            {sortedApps.map(app => {
              const isPassed = triageState[app.id]?.status === 'pass'
              const isWatchlisted = triageState[app.id]?.status === 'watchlist'
              const isMet = triageState[app.id]?.status === 'meet'
              const isSelected = selectedApp?.id === app.id
              const topScript = app.scripts[0]
              const score = topScript?.score ? Math.round(topScript.score) : null
              const heat = topScript?.heat_score ?? 0

              return (
                <div
                  key={app.id}
                  onClick={() => setSelectedAppId(app.id)}
                  className={`px-3 py-2.5 cursor-pointer border-b border-gray-50 transition-colors ${
                    isSelected ? 'bg-purple-50 border-l-[3px] border-l-purple-600' : 'hover:bg-gray-50'
                  } ${isPassed ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[12px] font-medium ${isPassed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {app.writer_name || 'Unknown'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isWatchlisted && <span className="text-[10px] text-purple-600">👁</span>}
                      {isMet && <span className="text-[10px] text-green-600">✓</span>}
                      {score && (
                        <span className={`text-[11px] font-semibold ${score >= 75 ? 'text-purple-600' : 'text-gray-400'}`}>
                          {score}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[11px] text-gray-500 mt-0.5 truncate">
                    {topScript?.title || 'No script'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {heat > 0 && (
                      <span className="text-[10px] text-orange-500">🔥 {heat}</span>
                    )}
                    {!isPassed && (
                      <span className="text-[10px] text-gray-300">{fmtDate(app.submitted_at)}</span>
                    )}
                    {isPassed && <span className="text-[10px] text-gray-300">Passed</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Detail panel */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {!selectedApp ? (
            <div className="flex-1 flex items-center justify-center text-[13px] text-gray-400">
              Select an application to review
            </div>
          ) : (
            <>
              {/* Writer header */}
              <div className="px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-semibold text-[13px] text-purple-700" style={{ background: '#EEEDFE' }}>
                    {(selectedApp.writer_name || '?')[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-medium text-[14px] text-gray-900 m-0">
                      {selectedApp.writer_name || 'Unknown writer'}
                    </p>
                    <p className="text-[11px] text-gray-400 m-0">Applied {fmtDate(selectedApp.submitted_at)}</p>
                  </div>
                  {triageState[selectedApp.id] && (
                    <span className={`ml-auto text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                      triageState[selectedApp.id].status === 'watchlist' ? 'bg-purple-50 text-purple-700' :
                      triageState[selectedApp.id].status === 'meet' ? 'bg-green-50 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {triageState[selectedApp.id].status === 'watchlist' ? 'Watchlisted' :
                       triageState[selectedApp.id].status === 'meet' ? 'Meeting' : 'Passed'}
                    </span>
                  )}
                </div>
              </div>

              {/* Script info */}
              {selectedApp.scripts.map(script => (
                <div key={script.submission_id} className="px-5 py-4 border-b border-gray-100">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-[14px] font-medium text-gray-900">{script.title}</span>
                    <div className="flex items-center gap-2">
                      {(script.heat_score ?? 0) > 0 && (
                        <span className="text-[11px] text-orange-500">🔥 {script.heat_score}</span>
                      )}
                      {script.score && (
                        <span className="text-[12px] font-semibold px-2 py-0.5 rounded" style={{ background: '#EEEDFE', color: '#534AB7' }}>
                          {Math.round(script.score)}
                        </span>
                      )}
                    </div>
                  </div>
                  {script.logline && (
                    <p className="text-[12px] text-gray-500 m-0 leading-relaxed">{script.logline}</p>
                  )}
                  <Link
                    href={`/partner/applications/${selectedApp.id}`}
                    className="text-[11px] text-purple-600 mt-2 inline-block hover:underline"
                  >
                    View full details →
                  </Link>
                </div>
              ))}

              {/* Writer's pitch */}
              {selectedApp.writer_pitch && (
                <div className="px-5 py-4 border-b border-gray-100">
                  <span className="text-[10px] text-gray-400 uppercase tracking-wider">Writer&apos;s pitch</span>
                  <p className="text-[12px] text-gray-700 m-0 mt-1.5 leading-relaxed italic">
                    &ldquo;{selectedApp.writer_pitch}&rdquo;
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="px-5 py-4 mt-auto">
                {!triageState[selectedApp.id] && (
                  <>
                    <div className="flex gap-2">
                      <button
                        onClick={handlePassClick}
                        disabled={triaging}
                        className="flex-1 py-2.5 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        ✕ Pass
                      </button>
                      <button
                        onClick={() => handleTriage('watchlist')}
                        disabled={triaging}
                        className="flex-1 py-2.5 rounded-lg border border-gray-200 bg-white text-[13px] font-medium text-gray-700 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                      >
                        👁 Watchlist
                      </button>
                      <button
                        onClick={() => handleTriage('meet')}
                        disabled={triaging}
                        className="flex-1 py-2.5 rounded-lg border-0 text-[13px] font-medium text-white cursor-pointer transition-colors flex items-center justify-center gap-1.5 disabled:opacity-50"
                        style={{ background: '#534AB7' }}
                      >
                        💬 Meet
                      </button>
                    </div>

                    {/* Pass feedback tags */}
                    {showPassFeedback === selectedApp.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <span className="text-[11px] text-gray-500">Quick feedback (optional):</span>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {PASS_TAGS.map(tag => (
                            <button
                              key={tag}
                              onClick={() => setSelectedTags(prev =>
                                prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                              )}
                              className={`text-[11px] px-2.5 py-1 rounded-full border cursor-pointer transition-colors ${
                                selectedTags.includes(tag)
                                  ? 'bg-purple-100 border-purple-300 text-purple-700'
                                  : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={confirmPass}
                            disabled={triaging}
                            className="text-[12px] font-medium px-3 py-1.5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 cursor-pointer border-0 disabled:opacity-50"
                          >
                            Confirm pass
                          </button>
                          <button
                            onClick={() => { setShowPassFeedback(null); setSelectedTags([]) }}
                            className="text-[12px] text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-0"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {triageState[selectedApp.id] && (
                  <div className="text-center py-2">
                    <span className="text-[12px] text-gray-400">
                      {triageState[selectedApp.id].status === 'pass' && '✕ Passed'}
                      {triageState[selectedApp.id].status === 'watchlist' && '👁 Added to watchlist'}
                      {triageState[selectedApp.id].status === 'meet' && '💬 Meeting requested'}
                    </span>
                    <button
                      onClick={() => {
                        setTriageState(prev => {
                          const next = { ...prev }
                          delete next[selectedApp.id]
                          return next
                        })
                      }}
                      className="ml-3 text-[11px] text-purple-600 hover:underline cursor-pointer bg-transparent border-0"
                    >
                      Undo
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
