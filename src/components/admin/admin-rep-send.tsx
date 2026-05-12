'use client'

// AdminRepSend — admin form to send writers to reps for review.
// Select a rep, pick writers, add GEM notes, pick featured scripts, send.

import { useState } from 'react'

type Rep = { id: string; name: string; email: string }
type WriterScript = { id: string; title: string; format: string | null; score: number | null; evalId: string | null }
type Writer = { id: string; name: string; email: string; bio: string | null; scripts: WriterScript[]; topScore: number | null }
type Assignment = { id: string; repId: string; writerId: string; status: string; gemNote: string | null; featuredScriptIds: string[] | null; createdAt: string }

// Pending writer to send — holds form state before sending
type PendingWriter = {
  writerId: string
  gemNote: string
  featuredScriptIds: string[]
}

export function AdminRepSend({
  reps,
  writers,
  existingAssignments,
}: {
  reps: Rep[]
  writers: Writer[]
  existingAssignments: Assignment[]
}) {
  const [selectedRepId, setSelectedRepId] = useState(reps[0]?.id ?? '')
  const [queue, setQueue] = useState<PendingWriter[]>([])
  const [writerSearch, setWriterSearch] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const selectedRep = reps.find(r => r.id === selectedRepId)

  // Filter out writers already assigned to this rep
  const assignedWriterIds = new Set(
    existingAssignments.filter(a => a.repId === selectedRepId).map(a => a.writerId)
  )
  const queuedWriterIds = new Set(queue.map(q => q.writerId))

  const availableWriters = writers.filter(w =>
    !assignedWriterIds.has(w.id) &&
    !queuedWriterIds.has(w.id) &&
    (writerSearch === '' ||
      w.name.toLowerCase().includes(writerSearch.toLowerCase()) ||
      w.email.toLowerCase().includes(writerSearch.toLowerCase()))
  )

  function addWriter(writerId: string) {
    setQueue(prev => [...prev, { writerId, gemNote: '', featuredScriptIds: [] }])
    setWriterSearch('')
  }

  function removeWriter(writerId: string) {
    setQueue(prev => prev.filter(q => q.writerId !== writerId))
  }

  function updateGemNote(writerId: string, note: string) {
    setQueue(prev => prev.map(q => q.writerId === writerId ? { ...q, gemNote: note } : q))
  }

  function toggleFeatured(writerId: string, scriptId: string) {
    setQueue(prev => prev.map(q => {
      if (q.writerId !== writerId) return q
      const ids = q.featuredScriptIds.includes(scriptId)
        ? q.featuredScriptIds.filter(id => id !== scriptId)
        : [...q.featuredScriptIds, scriptId]
      return { ...q, featuredScriptIds: ids }
    }))
  }

  async function handleSend() {
    if (!selectedRepId || queue.length === 0) return
    setSending(true)
    try {
      const res = await fetch('/api/admin/rep-send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rep_id: selectedRepId,
          writers: queue.map(q => ({
            writer_id: q.writerId,
            gem_note: q.gemNote || null,
            featured_script_ids: q.featuredScriptIds.length > 0 ? q.featuredScriptIds : null,
          })),
        }),
      })
      if (res.ok) {
        setSent(true)
        setQueue([])
      }
    } catch {}
    setSending(false)
  }

  // Existing assignments for the selected rep
  const repAssignments = existingAssignments.filter(a => a.repId === selectedRepId)

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Rep selector */}
      <div className="mb-6">
        <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
          Send to
        </label>
        <select
          value={selectedRepId}
          onChange={e => { setSelectedRepId(e.target.value); setQueue([]); setSent(false) }}
          className="text-[14px] px-3 py-2 rounded-lg border border-gray-200 bg-white w-full max-w-sm focus:outline-none focus:border-purple-300"
        >
          {reps.map(r => (
            <option key={r.id} value={r.id}>{r.name} ({r.email})</option>
          ))}
        </select>
      </div>

      {/* Already sent to this rep */}
      {repAssignments.length > 0 && (
        <div className="mb-6 p-4 bg-gray-50 rounded-xl border border-gray-200">
          <div className="text-[12px] font-medium text-gray-500 uppercase tracking-wide mb-2">
            Already sent to {selectedRep?.name} ({repAssignments.length})
          </div>
          <div className="space-y-1.5">
            {repAssignments.map(a => {
              const w = writers.find(wr => wr.id === a.writerId)
              return (
                <div key={a.id} className="flex items-center justify-between text-[13px]">
                  <span className="text-gray-700">{w?.name ?? 'Unknown'}</span>
                  <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                    a.status === 'interested' ? 'bg-green-50 text-green-700'
                    : a.status === 'passed' ? 'bg-gray-100 text-gray-500'
                    : 'bg-purple-50 text-purple-700'
                  }`}>
                    {a.status}
                  </span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Success message */}
      {sent && (
        <div className="mb-4 p-3 rounded-lg bg-green-50 border border-green-200 text-[13px] text-green-700">
          Writers sent successfully. They'll appear on {selectedRep?.name}'s dashboard.
        </div>
      )}

      {/* Writer search + add */}
      <div className="mb-4">
        <label className="text-[12px] font-medium text-gray-500 uppercase tracking-wide block mb-1.5">
          Add writers
        </label>
        <input
          type="text"
          value={writerSearch}
          onChange={e => setWriterSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="text-[14px] px-3 py-2 rounded-lg border border-gray-200 bg-white w-full focus:outline-none focus:border-purple-300"
        />
        {writerSearch.length > 0 && (
          <div className="mt-1 border border-gray-200 rounded-lg bg-white max-h-64 overflow-y-auto shadow-sm">
            {availableWriters.slice(0, 15).map(w => (
              <button
                key={w.id}
                onClick={() => addWriter(w.id)}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-[14px] font-medium text-gray-900">{w.name}</span>
                    <span className="text-[12px] text-gray-400 ml-2">{w.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[12px] text-gray-400">{w.scripts.length} scripts</span>
                    {w.topScore != null && (
                      <span
                        className="text-[11px] font-medium px-1.5 py-0.5 rounded"
                        style={{ background: 'rgba(124,58,237,0.08)', color: '#534AB7' }}
                      >
                        {Math.round(w.topScore)}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))}
            {availableWriters.length === 0 && (
              <div className="px-3 py-4 text-[13px] text-gray-400 text-center">No matching writers</div>
            )}
          </div>
        )}
      </div>

      {/* Queue — writers being prepared to send */}
      {queue.length > 0 && (
        <div className="space-y-4 mb-6">
          <div className="text-[12px] font-medium text-gray-500 uppercase tracking-wide">
            Ready to send ({queue.length})
          </div>
          {queue.map(q => {
            const w = writers.find(wr => wr.id === q.writerId)!
            return (
              <div key={q.writerId} className="border border-gray-200 rounded-xl bg-white p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="text-[15px] font-medium text-gray-900">{w.name}</div>
                    <div className="text-[12px] text-gray-400">{w.email}</div>
                    {w.bio && (
                      <div className="text-[12px] text-gray-500 mt-1 leading-[1.5] max-w-lg">{w.bio}</div>
                    )}
                  </div>
                  <button
                    onClick={() => removeWriter(q.writerId)}
                    className="text-[12px] text-red-400 hover:text-red-600 transition-colors"
                  >
                    Remove
                  </button>
                </div>

                {/* GEM note */}
                <textarea
                  value={q.gemNote}
                  onChange={e => updateGemNote(q.writerId, e.target.value)}
                  placeholder="GEM note for the rep — what makes this writer interesting, why you're sending them"
                  className="w-full text-[13px] p-3 rounded-lg border border-gray-200 resize-none focus:outline-none focus:border-purple-300 mb-3"
                  rows={2}
                />

                {/* Script list with featured toggle */}
                <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wide mb-1.5">
                  Scripts — click to feature
                </div>
                <div className="space-y-1">
                  {w.scripts.map(s => {
                    const isFeatured = q.featuredScriptIds.includes(s.id)
                    return (
                      <button
                        key={s.id}
                        onClick={() => toggleFeatured(q.writerId, s.id)}
                        className="w-full text-left flex items-center gap-2.5 px-3 py-2 rounded-lg border transition-colors"
                        style={{
                          background: isFeatured ? 'rgba(124,58,237,0.05)' : '#fff',
                          borderColor: isFeatured ? '#7c3aed' : 'rgba(0,0,0,0.08)',
                        }}
                      >
                        <div
                          className="w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors"
                          style={{
                            borderColor: isFeatured ? '#7c3aed' : '#d1d5db',
                            background: isFeatured ? '#7c3aed' : 'transparent',
                          }}
                        >
                          {isFeatured && (
                            <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                              <path d="M3.5 8.5L6.5 11.5L12.5 5.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        {s.score != null && (
                          <span
                            className="text-[12px] font-medium px-1.5 py-0.5 rounded shrink-0"
                            style={{ background: 'rgba(124,58,237,0.08)', color: '#534AB7' }}
                          >
                            {Math.round(s.score)}
                          </span>
                        )}
                        <span className="text-[13px] text-gray-900 truncate flex-1">{s.title}</span>
                        {s.format && (
                          <span className="text-[11px] text-gray-400 shrink-0">{s.format}</span>
                        )}
                      </button>
                    )
                  })}
                </div>
                {q.featuredScriptIds.length === 0 && w.scripts.length > 3 && (
                  <div className="text-[11px] text-gray-400 mt-1">
                    No featured selected — top 3 by score will be shown automatically
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Send button */}
      {queue.length > 0 && (
        <button
          onClick={handleSend}
          disabled={sending}
          className="text-[14px] font-medium px-6 py-2.5 rounded-lg text-white transition-colors disabled:opacity-50"
          style={{ background: '#7c3aed' }}
        >
          {sending ? 'Sending...' : `Send ${queue.length} writer${queue.length !== 1 ? 's' : ''} to ${selectedRep?.name}`}
        </button>
      )}

      {queue.length === 0 && !sent && (
        <div className="text-center py-12">
          <p className="text-[14px] text-gray-400">Search for writers above and add them to the queue.</p>
        </div>
      )}
    </div>
  )
}
