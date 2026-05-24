'use client'

// PartnerTriageClient — master/detail triage interface for producers.
// Opportunity tabs across top, sorted list on left, detail + actions on right.

import { useState, useMemo } from 'react'
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
  const [customTag, setCustomTag] = useState('')
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
      return new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
    }

    return [...untriaged.sort(sorter), ...passed]
  }, [oppApps, sortMode, triageState])

  // Selected app details
  const selectedApp = useMemo(() => {
    if (selectedAppId) return applications.find(a => a.id === selectedAppId) || null
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
        setLikedTags([])
        setReasonTags([])
        setCustomTag('')

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
    if (reasonTags.length === 0 && !customTag.trim()) return // must select at least one reason
    const allTags = [
      ...likedTags.map(t => `+${t}`),
      ...reasonTags.map(t => `-${t}`),
      ...(customTag.trim() ? [`-${customTag.trim()}`] : []),
    ]
    handleTriage('pass', allTags)
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
            onClick={() => { setActiveOppId(opp.id); setSelectedAppId(null); setShowPassFeedback(null) }}
            className={`px-4 py-3 text-[13px] font-medium whitespace-nowrap border-b-2 transition-colors cursor-pointer bg-transparent ${
              activeOppId === opp.id
                ? 'border-purple-600 text-purple-700'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {opp.title}
            <span className="text-gray-400 ml-1.5 text-[12px]">{oppCounts[opp.id]}</span>
          </button>
        ))}
      </div>

      {/* Master/detail split */}
      <div className="flex border border-gray-200 rounded-b-xl overflow-hidden bg-white" style={{ height: 'calc(100vh - 180px)', minHeight: '500px' }}>
        {/* LEFT: App list */}
        <div className="w-[280px] border-r border-gray-200 flex flex-col shrink-0">
          {/* Sort controls */}
          <div className="px-3 py-2.5 border-b border-gray-100 flex items-center gap-1.5">
            <span className="text-[12px] text-gray-400 mr-1">Sort:</span>
            {(['score', 'heat', 'new'] as SortMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setSortMode(mode)}
                className={`text-[12px] px-2.5 py-1 rounded cursor-pointer border-0 transition-colors ${
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
              const isMet = triageState[app.id]?.status === 'meet'
              const isSelected = selectedApp?.id === app.id
              const topScript = app.scripts[0]
              const score = topScript?.score ? Math.round(topScript.score) : null
              const heat = topScript?.heat_score ?? 0

              return (
                <div
                  key={app.id}
                  onClick={() => { setSelectedAppId(app.id); setShowPassFeedback(null); setLikedTags([]); setReasonTags([]); setCustomTag('') }}
                  className={`px-3 py-2.5 cursor-pointer border-b border-gray-50 transition-colors ${
                    isSelected ? 'bg-purple-50 border-l-[3px] border-l-purple-600' : 'hover:bg-gray-50'
                  } ${isPassed ? 'opacity-40' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <span className={`text-[13px] font-medium ${isPassed ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                      {app.writer_name || 'Unknown'}
                    </span>
                    <div className="flex items-center gap-1.5">
                      {isMet && <span className="text-[10px] text-green-600">✓</span>}
                      {score && (
                        <span className="flex items-center gap-0.5">
                          <GemDiamond size={8} />
                          <span className={`text-[12px] font-semibold ${score >= 75 ? 'text-purple-600' : 'text-gray-400'}`}>
                            {score}
                          </span>
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="text-[12px] text-gray-500 mt-0.5 truncate">
                    {topScript?.title || 'No script'}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {heat > 0 && (
                      <span className="text-[12px] text-orange-500">🔥 {heat}</span>
                    )}
                    {!isPassed && (
                      <span className="text-[12px] text-gray-300">{fmtDate(app.submitted_at)}</span>
                    )}
                    {isPassed && <span className="text-[12px] text-gray-300">Passed</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* RIGHT: Detail panel */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {!selectedApp ? (
            <div className="flex-1 flex items-center justify-center text-[14px] text-gray-400">
              Select an application to review
            </div>
          ) : (
            <>
              {/* Writer header — name, headline, avatar */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-start gap-3">
                  {selectedApp.writer_avatar_url ? (
                    <img
                      src={selectedApp.writer_avatar_url}
                      alt=""
                      className="w-10 h-10 rounded-full object-cover shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full flex items-center justify-center font-semibold text-[14px] text-purple-700 shrink-0" style={{ background: '#EEEDFE' }}>
                      {(selectedApp.writer_name || '?')[0]?.toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[15px] text-gray-900 m-0">
                      {selectedApp.writer_name || 'Unknown writer'}
                    </p>
                    {selectedApp.writer_headline && (
                      <p className="text-[13px] text-gray-500 m-0 mt-0.5 truncate">{selectedApp.writer_headline}</p>
                    )}
                    <p className="text-[12px] text-gray-400 m-0 mt-0.5">{fmtDate(selectedApp.submitted_at)}</p>
                  </div>
                  {triageState[selectedApp.id] && (
                    <span className={`text-[12px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
                      triageState[selectedApp.id].status === 'meet' ? 'bg-green-50 text-green-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {triageState[selectedApp.id].status === 'meet' ? 'Meeting' : 'Passed'}
                    </span>
                  )}
                </div>
              </div>

              {/* Script info — with poster */}
              {selectedApp.scripts.map(script => (
                <div key={script.submission_id} className="px-6 py-5 border-b border-gray-100">
                  <div className="flex gap-4">
                    {/* Poster thumbnail */}
                    {script.poster_url ? (
                      <img
                        src={script.poster_url}
                        alt=""
                        className="w-16 h-20 rounded-lg object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-20 rounded-lg shrink-0 flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
                        <span className="inline-flex items-center justify-center rotate-45" style={{ width: 24, height: 24 }}>
                          <span className="absolute" style={{ width: 24, height: 24, background: 'rgba(255,255,255,0.08)', borderRadius: 2 }} />
                          <span className="absolute" style={{ width: 18, height: 18, background: 'rgba(255,255,255,0.15)', borderRadius: 1.5 }} />
                          <span className="absolute" style={{ width: 12, height: 12, background: 'rgba(255,255,255,0.22)', borderRadius: 1 }} />
                        </span>
                      </div>
                    )}

                    {/* Script details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[15px] font-semibold text-gray-900 truncate">{script.title}</span>
                        <div className="flex items-center gap-2 shrink-0">
                          {(script.heat_score ?? 0) > 0 && (
                            <span className="text-[13px] text-orange-500">🔥 {script.heat_score}</span>
                          )}
                          {script.score && (
                            <span className="flex items-center gap-1 text-[14px] font-bold" style={{ color: '#7c3aed' }}>
                              <GemDiamond size={10} /> {Math.round(script.score)}
                            </span>
                          )}
                        </div>
                      </div>
                      {script.logline && (
                        <p className="text-[13px] text-gray-600 m-0 leading-relaxed">{script.logline}</p>
                      )}
                      <Link
                        href={`/partner/applications/${selectedApp.id}`}
                        className="text-[12px] text-purple-600 mt-2 inline-block hover:underline"
                      >
                        View full details →
                      </Link>
                    </div>
                  </div>
                </div>
              ))}

              {/* Writer's pitch */}
              {selectedApp.writer_pitch && (
                <div className="px-6 py-5 border-b border-gray-100">
                  <span className="text-[12px] text-gray-400 uppercase tracking-wider font-medium">Writer&apos;s pitch</span>
                  <p className="text-[13px] text-gray-700 m-0 mt-2 leading-relaxed italic">
                    &ldquo;{selectedApp.writer_pitch}&rdquo;
                  </p>
                </div>
              )}

              {/* Action buttons */}
              <div className="px-6 py-5 mt-auto">
                {!triageState[selectedApp.id] && (
                  <>
                    {showPassFeedback !== selectedApp.id ? (
                      /* Main action buttons — Pass and Meet only */
                      <div className="flex gap-3">
                        <button
                          onClick={handlePassClick}
                          disabled={triaging}
                          className="flex-1 py-3 rounded-xl border border-gray-200 bg-white text-[14px] font-medium text-gray-500 hover:bg-gray-50 cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                          ✕ Pass
                        </button>
                        <button
                          onClick={() => handleTriage('meet')}
                          disabled={triaging}
                          className="flex-[2] py-3 rounded-xl border-0 text-[14px] font-semibold text-white cursor-pointer transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                          style={{ background: '#534AB7' }}
                        >
                          💬 Meet
                        </button>
                      </div>
                    ) : (
                      /* Pass feedback flow */
                      <div className="space-y-4">
                        {/* Liked section */}
                        <div>
                          <span className="text-[13px] font-medium text-gray-700">Anything you liked?</span>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {LIKED_TAGS.map(tag => (
                              <button
                                key={tag}
                                onClick={() => setLikedTags(prev =>
                                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                )}
                                className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                                  likedTags.includes(tag)
                                    ? 'bg-green-50 border-green-300 text-green-700'
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                {tag}
                              </button>
                            ))}
                            <button
                              onClick={() => setLikedTags([])}
                              className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                                likedTags.length === 0
                                  ? 'bg-gray-100 border-gray-300 text-gray-600'
                                  : 'bg-white border-gray-200 text-gray-400 hover:border-gray-300'
                              }`}
                            >
                              Nothing
                            </button>
                          </div>
                        </div>

                        {/* Pass reason section */}
                        <div>
                          <span className="text-[13px] font-medium text-gray-700">Why are you passing? <span className="text-gray-400 font-normal">(required)</span></span>
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {PASS_REASONS.map(tag => (
                              <button
                                key={tag}
                                onClick={() => setReasonTags(prev =>
                                  prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
                                )}
                                className={`text-[12px] px-3 py-1.5 rounded-full border cursor-pointer transition-colors ${
                                  reasonTags.includes(tag)
                                    ? 'bg-red-50 border-red-300 text-red-700'
                                    : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                                }`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                          {/* Custom tag input */}
                          <div className="mt-2">
                            <input
                              type="text"
                              value={customTag}
                              onChange={e => setCustomTag(e.target.value)}
                              placeholder="Add a custom reason..."
                              className="text-[12px] px-3 py-1.5 rounded-lg border border-gray-200 text-gray-700 w-full max-w-[240px] outline-none focus:border-purple-300"
                            />
                          </div>
                        </div>

                        {/* Confirm / Cancel */}
                        <div className="flex gap-2 pt-1">
                          <button
                            onClick={confirmPass}
                            disabled={triaging || (reasonTags.length === 0 && !customTag.trim())}
                            className="text-[13px] font-semibold px-4 py-2 rounded-lg bg-gray-800 text-white hover:bg-gray-700 cursor-pointer border-0 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          >
                            Confirm pass
                          </button>
                          <button
                            onClick={() => { setShowPassFeedback(null); setLikedTags([]); setReasonTags([]); setCustomTag('') }}
                            className="text-[13px] text-gray-400 hover:text-gray-600 cursor-pointer bg-transparent border-0 transition-colors"
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
                    <span className="text-[13px] text-gray-400">
                      {triageState[selectedApp.id].status === 'pass' && '✕ Passed'}
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
                      className="ml-3 text-[12px] text-purple-600 hover:underline cursor-pointer bg-transparent border-0"
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
