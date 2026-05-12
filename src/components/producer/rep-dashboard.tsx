'use client'

// RepDashboard — the rep/partner talent review experience.
// Shows writer cards with bio, featured scripts, GEM note,
// and Interested / Pass actions.

import { useState } from 'react'
import Link from 'next/link'

type Script = {
  submissionId: string
  title: string
  format: string | null
  score: number | null
  evalId: string | null
  logline: string | null
  genres: string[] | null
}

export type RepAssignmentItem = {
  id: string
  writerId: string
  writerName: string
  writerBio: string | null
  writerEmail: string | null
  writerAvatarUrl: string | null
  gemNote: string | null
  status: 'pending' | 'more_info' | 'introduce' | 'passed'
  repNote: string | null
  passTags: string[] | null
  respondedAt: string | null
  featuredScripts: Script[]
  otherScripts: Script[]
  totalScripts: number
}

const PASS_TAG_OPTIONS = [
  'Not right for my slate',
  'Needs another draft',
  'Wrong genre for me',
  'Strong but not now',
  'Too early-stage',
]

function TagInput({ tags, onAdd, onRemove }: { tags: string[]; onAdd: (t: string) => void; onRemove: (t: string) => void }) {
  const [value, setValue] = useState('')
  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.key === 'Enter' || e.key === ',') && value.trim()) {
      e.preventDefault()
      const tag = value.trim()
      if (!tags.includes(tag)) onAdd(tag)
      setValue('')
    }
    if (e.key === 'Backspace' && !value && tags.length > 0) {
      onRemove(tags[tags.length - 1])
    }
  }
  return (
    <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-gray-200 bg-white min-h-[38px] focus-within:border-purple-300 transition-colors">
      {tags.map(tag => (
        <span
          key={tag}
          className="inline-flex items-center gap-1 text-[12px] px-2.5 py-1 rounded-full"
          style={{ background: '#EEEDFE', color: '#534AB7' }}
        >
          {tag}
          <button
            onClick={() => onRemove(tag)}
            className="text-[10px] opacity-60 hover:opacity-100 ml-0.5"
          >
            ×
          </button>
        </span>
      ))}
      <input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={tags.length === 0 ? 'Add your own tags…' : ''}
        className="flex-1 min-w-[100px] text-[12px] outline-none bg-transparent placeholder:text-gray-400"
      />
    </div>
  )
}

function WriterCard({ item }: { item: RepAssignmentItem }) {
  const [expanded, setExpanded] = useState(item.status === 'pending')
  const [showAllScripts, setShowAllScripts] = useState(false)
  const [status, setStatus] = useState(item.status)
  const [repNote, setRepNote] = useState(item.repNote ?? '')
  const [selectedTags, setSelectedTags] = useState<string[]>(item.passTags ?? [])
  const [saving, setSaving] = useState(false)
  const [showPassForm, setShowPassForm] = useState(false)
  const [showMoreInfoForm, setShowMoreInfoForm] = useState(false)
  const [showIntroduceConfirm, setShowIntroduceConfirm] = useState(false)
  const [customTags, setCustomTags] = useState<string[]>([])

  const initials = item.writerName
    .split(' ')
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  async function handleMoreInfo() {
    if (!repNote.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/rep/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: item.id,
          status: 'more_info',
          rep_note: repNote,
        }),
      })
      if (res.ok) {
        setStatus('more_info')
        setShowMoreInfoForm(false)
      }
    } catch {}
    setSaving(false)
  }

  async function handleIntroduce() {
    setSaving(true)
    try {
      const res = await fetch('/api/rep/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: item.id,
          status: 'introduce',
        }),
      })
      if (res.ok) {
        setStatus('introduce')
        setShowIntroduceConfirm(false)
      }
    } catch {}
    setSaving(false)
  }

  async function handlePass() {
    if (!repNote.trim()) return
    setSaving(true)
    try {
      const res = await fetch('/api/rep/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignment_id: item.id,
          status: 'passed',
          rep_note: repNote,
          pass_tags: [...selectedTags, ...customTags].length > 0 ? [...selectedTags, ...customTags] : null,
        }),
      })
      if (res.ok) {
        setStatus('passed')
        setShowPassForm(false)
      }
    } catch {}
    setSaving(false)
  }

  function toggleTag(tag: string) {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const statusBadge = status === 'more_info'
    ? { label: 'See more', bg: '#EEF4FF', color: '#1E40AF' }
    : status === 'introduce'
    ? { label: 'Introduce', bg: '#E1F5EE', color: '#085041' }
    : status === 'passed'
    ? { label: 'Passed', bg: '#F1EFE8', color: '#5F5E5A' }
    : { label: 'New', bg: '#EEEDFE', color: '#534AB7' }

  return (
    <div
      className="border rounded-xl overflow-hidden mb-4"
      style={{ borderColor: 'rgba(0,0,0,0.08)', background: '#fff' }}
    >
      {/* Header — always visible, clickable to toggle */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left px-5 py-4 flex items-center gap-3.5 hover:bg-gray-50 transition-colors"
      >
        {item.writerAvatarUrl ? (
          <img
            src={item.writerAvatarUrl}
            alt={item.writerName}
            className="w-10 h-10 rounded-full object-cover shrink-0"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-[14px] font-medium shrink-0"
            style={{ background: '#EEEDFE', color: '#534AB7' }}
          >
            {initials}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[15px] font-medium text-gray-900">{item.writerName}</div>
        </div>
        <span className="text-[12px] text-gray-400 shrink-0 mr-2">
          {item.totalScripts} script{item.totalScripts !== 1 ? 's' : ''}
        </span>
        <span
          className="text-[11px] font-medium px-2.5 py-1 rounded-full shrink-0"
          style={{ background: statusBadge.bg, color: statusBadge.color }}
        >
          {statusBadge.label}
        </span>
        <span
          className="text-gray-400 text-[13px] shrink-0 transition-transform duration-150"
          style={{ transform: expanded ? 'rotate(180deg)' : undefined }}
        >
          ▾
        </span>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div className="px-5 pb-5 border-t border-gray-100">
          {/* Bio — full, not truncated */}
          {item.writerBio && (
            <div className="mt-4 text-[13px] text-gray-600 leading-[1.6]">
              {item.writerBio}
            </div>
          )}

          {/* GEM note */}
          {item.gemNote && (
            <div
              className="mt-4 p-3.5 rounded-lg"
              style={{ background: '#EEEDFE', border: '1px solid rgba(124,58,237,0.12)' }}
            >
              <div
                className="text-[11px] uppercase tracking-[0.15em] font-medium mb-1.5"
                style={{ color: '#534AB7' }}
              >
                GEM note
              </div>
              <div className="text-[13px] leading-[1.55]" style={{ color: '#3C3489' }}>
                {item.gemNote}
              </div>
            </div>
          )}

          {/* Featured scripts */}
          <div className="mt-4">
            {item.featuredScripts.length > 0 && (
              <div className="text-[11px] uppercase tracking-[0.15em] font-medium text-gray-400 mb-2">
                Featured scripts
              </div>
            )}
            {item.featuredScripts.map(s => (
              <ScriptRow key={s.submissionId} script={s} />
            ))}
          </div>

          {/* Other scripts (collapsible) */}
          {item.otherScripts.length > 0 && (
            <div className="mt-2">
              <button
                onClick={(e) => { e.stopPropagation(); setShowAllScripts(!showAllScripts) }}
                className="text-[12px] font-medium text-purple-600 hover:text-purple-700 transition-colors"
              >
                {showAllScripts
                  ? 'Hide other scripts'
                  : `Show all scripts (${item.otherScripts.length} more)`}
              </button>
              {showAllScripts && (
                <div className="mt-2">
                  {item.otherScripts.map(s => (
                    <ScriptRow key={s.submissionId} script={s} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Already responded — See more */}
          {status === 'more_info' && (
            <div
              className="mt-4 p-3.5 rounded-lg"
              style={{ background: '#EEF4FF', border: '1px solid rgba(30,64,175,0.12)' }}
            >
              <div className="text-[12px] font-medium mb-1" style={{ color: '#1E40AF' }}>
                Wants to see more
              </div>
              {repNote && (
                <div className="text-[13px] leading-[1.5] mt-1" style={{ color: '#1E3A5F' }}>
                  {repNote}
                </div>
              )}
            </div>
          )}

          {/* Already responded — Introduce */}
          {status === 'introduce' && (
            <div
              className="mt-4 p-3.5 rounded-lg"
              style={{ background: '#E1F5EE', border: '1px solid rgba(5,150,105,0.15)' }}
            >
              <div className="text-[12px] font-medium mb-1" style={{ color: '#0F6E56' }}>
                Introduction requested
              </div>
              <div className="text-[13px] leading-[1.5] mt-1" style={{ color: '#085041' }}>
                We&apos;ll follow up with you to confirm and get an introduction set up.
              </div>
            </div>
          )}

          {/* Already responded — Passed */}
          {status === 'passed' && (
            <div
              className="mt-4 p-3.5 rounded-lg"
              style={{ background: '#F7F7F5', border: '1px solid rgba(0,0,0,0.06)' }}
            >
              <div className="text-[12px] font-medium text-gray-500 mb-1">Passed</div>
              {selectedTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {selectedTags.map(tag => (
                    <span
                      key={tag}
                      className="text-[11px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-600"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {repNote && (
                <div className="text-[13px] text-gray-600 leading-[1.5]">{repNote}</div>
              )}
            </div>
          )}

          {/* Action buttons — only for pending, no sub-form showing */}
          {status === 'pending' && !showMoreInfoForm && !showPassForm && !showIntroduceConfirm && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="flex gap-2.5">
                <button
                  onClick={() => setShowMoreInfoForm(true)}
                  disabled={saving}
                  className="text-[13px] font-medium px-5 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ background: '#1E40AF' }}
                >
                  See more
                </button>
                <button
                  onClick={() => setShowIntroduceConfirm(true)}
                  disabled={saving}
                  className="text-[13px] font-medium px-5 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ background: '#0F6E56' }}
                >
                  Introduce us
                </button>
                <button
                  onClick={() => setShowPassForm(true)}
                  disabled={saving}
                  className="text-[13px] font-medium px-5 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Pass
                </button>
              </div>
            </div>
          )}

          {/* See more form — required note */}
          {status === 'pending' && showMoreInfoForm && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-[12px] font-medium text-gray-500 mb-2">
                What would you like to see?
              </div>
              <textarea
                value={repNote}
                onChange={e => setRepNote(e.target.value)}
                placeholder="e.g. I'd love to see another draft, or I'm curious if they have anything in the thriller space…"
                className="w-full text-[13px] p-3 rounded-lg border border-gray-200 resize-none focus:outline-none focus:border-blue-300 transition-colors mb-1"
                rows={2}
              />
              <div className="text-[11px] text-gray-400 mb-3">Required</div>
              <div className="flex gap-2.5">
                <button
                  onClick={handleMoreInfo}
                  disabled={saving || !repNote.trim()}
                  className="text-[13px] font-medium px-5 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ background: '#1E40AF' }}
                >
                  {saving ? 'Saving...' : 'Send request'}
                </button>
                <button
                  onClick={() => setShowMoreInfoForm(false)}
                  className="text-[13px] text-gray-400 hover:text-gray-600 px-3 py-2"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Introduce us confirmation */}
          {status === 'pending' && showIntroduceConfirm && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div
                className="p-3.5 rounded-lg mb-3"
                style={{ background: '#E1F5EE', border: '1px solid rgba(5,150,105,0.15)' }}
              >
                <div className="text-[13px] leading-[1.55]" style={{ color: '#085041' }}>
                  We&apos;ll follow up with you to confirm and get an introduction set up with {item.writerName}.
                </div>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={handleIntroduce}
                  disabled={saving}
                  className="text-[13px] font-medium px-5 py-2 rounded-lg text-white transition-colors disabled:opacity-50"
                  style={{ background: '#0F6E56' }}
                >
                  {saving ? 'Saving...' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowIntroduceConfirm(false)}
                  className="text-[13px] text-gray-400 hover:text-gray-600 px-3 py-2"
                >
                  Back
                </button>
              </div>
            </div>
          )}

          {/* Pass form — tag selection + required note */}
          {status === 'pending' && showPassForm && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-[12px] font-medium text-gray-500 mb-2">
                Why are you passing? (select any that apply)
              </div>
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PASS_TAG_OPTIONS.map(tag => (
                  <button
                    key={tag}
                    onClick={() => toggleTag(tag)}
                    className="text-[12px] px-3 py-1.5 rounded-full border transition-colors"
                    style={{
                      background: selectedTags.includes(tag) ? '#EEEDFE' : '#fff',
                      borderColor: selectedTags.includes(tag) ? '#7c3aed' : 'rgba(0,0,0,0.1)',
                      color: selectedTags.includes(tag) ? '#534AB7' : '#666',
                    }}
                  >
                    {tag}
                  </button>
                ))}
              </div>
              <div className="mb-3">
                <TagInput
                  tags={customTags}
                  onAdd={t => setCustomTags(prev => [...prev, t])}
                  onRemove={t => setCustomTags(prev => prev.filter(x => x !== t))}
                />
              </div>
              <textarea
                value={repNote}
                onChange={e => setRepNote(e.target.value)}
                placeholder="Tell us a bit more — this helps the GEM team learn and sharpen recommendations over time."
                className="w-full text-[13px] p-3 rounded-lg border border-gray-200 resize-none focus:outline-none focus:border-purple-300 transition-colors mb-1"
                rows={2}
              />
              <div className="text-[11px] text-gray-400 mb-3">Required</div>
              <div className="flex gap-2.5">
                <button
                  onClick={handlePass}
                  disabled={saving || !repNote.trim()}
                  className="text-[13px] font-medium px-5 py-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Confirm pass'}
                </button>
                <button
                  onClick={() => setShowPassForm(false)}
                  className="text-[13px] text-gray-400 hover:text-gray-600 px-3 py-2"
                >
                  Back
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ScriptRow({ script }: { script: Script }) {
  return (
    <div className="py-3 border-b border-gray-100 last:border-b-0">
      <div className="flex items-center gap-3">
        {script.score != null && (
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[14px] font-medium shrink-0"
            style={{
              background: 'rgba(124,58,237,0.08)',
              color: '#534AB7',
              border: '1px solid rgba(124,58,237,0.2)',
            }}
          >
            {Math.round(script.score)}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="text-[14px] font-medium text-gray-900 truncate">{script.title}</div>
          {script.genres && script.genres.length > 0 && (
            <div className="text-[12px] text-gray-400 mt-0.5">
              {script.genres.join(' · ')}
              {script.format ? ` · ${script.format}` : ''}
            </div>
          )}
          {!script.genres?.length && script.format && (
            <div className="text-[12px] text-gray-400 mt-0.5">{script.format}</div>
          )}
        </div>
        {script.evalId && (
          <Link
            href={`/report/${script.evalId}`}
            className="text-[12px] font-medium text-purple-600 hover:text-purple-700 shrink-0"
          >
            View report →
          </Link>
        )}
      </div>
      {script.logline && (
        <div className="text-[12px] text-gray-500 leading-[1.5] mt-1.5 ml-12">
          {script.logline}
        </div>
      )}
    </div>
  )
}

export function RepDashboard({
  items,
  repName,
}: {
  items: RepAssignmentItem[]
  repName: string
}) {
  const pending = items.filter(i => i.status === 'pending')
  const responded = items.filter(i => i.status !== 'pending')

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 sm:py-10">
      <header className="mb-6">
        <h1
          className="text-[22px] font-bold text-gray-900 m-0"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Writers for your review
        </h1>
        <p className="text-[14px] text-gray-500 mt-2 m-0 leading-[1.55] max-w-[520px]">
          These writers were selected from GEM based on the quality of their work.
          Take a look and let us know who you&apos;d like to connect with.
        </p>
        <p className="text-[12px] text-gray-400 mt-2 m-0">
          {pending.length} new · {responded.length} reviewed
        </p>
      </header>

      {pending.length > 0 && (
        <div className="mb-6">
          {pending.map(item => (
            <WriterCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {responded.length > 0 && (
        <div>
          <div className="text-[11px] uppercase tracking-[0.15em] font-medium text-gray-400 mb-3">
            Reviewed
          </div>
          {responded.map(item => (
            <WriterCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {items.length === 0 && (
        <div className="text-center py-16">
          <p className="text-[15px] text-gray-400">No writers to review yet. Check back soon.</p>
        </div>
      )}
    </div>
  )
}
