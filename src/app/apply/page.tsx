'use client'

// /apply — industry partner form. Producers and reps tell us who they
// are and what they're looking for. Emails Anuj directly + captures
// enough structured data to post an opportunity even without follow-up.
// Anuj 2026-05-04: reframed from "application" to "partner with GEM",
// phone required, added structured opportunity fields.

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/nav'
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react'

type Role = 'producer' | 'representative'

const GENRE_OPTIONS = [
  'Drama', 'Comedy', 'Thriller', 'Horror', 'Sci-Fi', 'Action',
  'Romance', 'RomCom', 'Fantasy', 'Adventure', 'Crime', 'Mystery',
  'Family', 'Documentary', 'Western', 'Musical',
]

const FORMAT_OPTIONS = ['Feature', 'Pilot', 'Series', 'Short']

const GOAL_OPTIONS_PRODUCER = [
  'Option or acquire scripts',
  'Find writers for open assignments',
  'Discover new talent for general meetings',
  'Attach writers to existing IP',
]
const GOAL_OPTIONS_REP = [
  'Sign new writers for representation',
  'Find material to package',
  'Discover emerging talent',
  'Build roster in specific genres',
]

export default function ApplyPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState<Role>('producer')
  const [imdb, setImdb] = useState('')
  const [goals, setGoals] = useState<string[]>([])
  const [genres, setGenres] = useState<string[]>([])
  const [formats, setFormats] = useState<string[]>([])
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  function toggleItem(arr: string[], setArr: (v: string[]) => void, item: string) {
    setArr(arr.includes(item) ? arr.filter(i => i !== item) : [...arr, item])
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          full_name: fullName,
          email,
          phone,
          company,
          role,
          imdb,
          goals,
          genres,
          formats,
          notes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to send.')
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

  const goalOptions = role === 'producer' ? GOAL_OPTIONS_PRODUCER : GOAL_OPTIONS_REP

  return (
    <>
      <Nav />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-10 sm:py-14 pb-24">
        {submitted ? (
          <SuccessPanel />
        ) : (
          <>
            <div className="mb-10">
              <p
                className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-3"
                style={{ color: 'var(--gem-accent)' }}
              >
                Industry partners
              </p>
              <h1 className="text-[34px] sm:text-[44px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-[1.05] m-0 mb-4 font-[family-name:var(--font-display)]">
                We find the writers. You pick the ones that fit.
              </h1>
              <p className="text-[15.5px] sm:text-[16px] text-[var(--gem-gray-300)] leading-[1.6] m-0 max-w-[60ch]">
                GEM has already read thousands of screenplays. Tell us what
                you&apos;re looking for and we&apos;ll surface the most promising
                writers that match — by genre, format, budget, and quality. No
                slush pile, no guesswork.
              </p>
            </div>

            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-5 sm:p-7 space-y-5"
              style={{
                background: '#fff',
                border: '1px solid var(--gem-gray-700)',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
              }}
            >
              {/* ── About you ── */}
              <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] m-0 pt-1">
                About you
              </p>

              <Field label="Full name" required>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="Your name"
                  autoComplete="name"
                />
              </Field>

              <Field label="Email" required>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  autoComplete="email"
                />
              </Field>

              <Field label="Phone" required hint="So we can connect quickly — we won't cold-call you.">
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                  autoComplete="tel"
                />
              </Field>

              <Field label="Company" required>
                <input
                  type="text"
                  required
                  value={company}
                  onChange={e => setCompany(e.target.value)}
                  placeholder="Production company, agency, or management firm"
                  autoComplete="organization"
                />
              </Field>

              <div>
                <label className="block text-[12.5px] font-semibold text-[var(--gem-gray-300)] mb-1.5">
                  I&apos;m a <span style={{ color: 'var(--gem-accent)' }}>*</span>
                </label>
                <div
                  role="radiogroup"
                  aria-label="Role"
                  className="grid grid-cols-2 gap-1 p-1 rounded-lg"
                  style={{
                    border: '1px solid var(--gem-gray-700)',
                    background: 'var(--gem-gray-900)',
                  }}
                >
                  {(['producer', 'representative'] as const).map(opt => {
                    const isSelected = role === opt
                    return (
                      <button
                        key={opt}
                        type="button"
                        role="radio"
                        aria-checked={isSelected}
                        onClick={() => { setRole(opt); setGoals([]) }}
                        className="px-3 py-2 rounded-md text-[13.5px] font-semibold transition-all"
                        style={{
                          background: isSelected ? 'var(--gem-accent)' : 'transparent',
                          color: isSelected ? '#fff' : 'var(--gem-gray-300)',
                        }}
                      >
                        {opt === 'producer' ? 'Producer' : 'Representative (agent / manager)'}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Field label="IMDb" hint="Profile or company link — optional but helps us learn about you faster.">
                <input
                  type="url"
                  value={imdb}
                  onChange={e => setImdb(e.target.value)}
                  placeholder="https://www.imdb.com/name/..."
                  inputMode="url"
                />
              </Field>

              {/* ── What you're looking for ── */}
              <div className="pt-3">
                <p className="text-[11px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-400)] m-0 mb-4">
                  What you&apos;re looking for
                </p>
                <p className="text-[13px] text-[var(--gem-gray-400)] m-0 mb-4 leading-snug">
                  This helps us match you to the right writers immediately. The more
                  specific you are, the better the matches.
                </p>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-[var(--gem-gray-300)] mb-2">
                  {role === 'producer' ? "I'm looking to" : "I want to"}{' '}
                  <span className="font-normal text-[var(--gem-gray-500)]">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {goalOptions.map(g => {
                    const selected = goals.includes(g)
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleItem(goals, setGoals, g)}
                        className="px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all"
                        style={{
                          background: selected ? 'var(--gem-accent)' : 'var(--gem-gray-900)',
                          color: selected ? '#fff' : 'var(--gem-gray-300)',
                          border: selected ? '1px solid var(--gem-accent)' : '1px solid var(--gem-gray-700)',
                        }}
                      >
                        {g}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-[var(--gem-gray-300)] mb-2">
                  Genres{' '}
                  <span className="font-normal text-[var(--gem-gray-500)]">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {GENRE_OPTIONS.map(g => {
                    const selected = genres.includes(g)
                    return (
                      <button
                        key={g}
                        type="button"
                        onClick={() => toggleItem(genres, setGenres, g)}
                        className="px-2.5 py-1 rounded-md text-[12px] font-medium transition-all"
                        style={{
                          background: selected ? 'var(--gem-accent)' : 'var(--gem-gray-900)',
                          color: selected ? '#fff' : 'var(--gem-gray-300)',
                          border: selected ? '1px solid var(--gem-accent)' : '1px solid var(--gem-gray-700)',
                        }}
                      >
                        {g}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[12.5px] font-semibold text-[var(--gem-gray-300)] mb-2">
                  Formats{' '}
                  <span className="font-normal text-[var(--gem-gray-500)]">(select all that apply)</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {FORMAT_OPTIONS.map(f => {
                    const selected = formats.includes(f)
                    return (
                      <button
                        key={f}
                        type="button"
                        onClick={() => toggleItem(formats, setFormats, f)}
                        className="px-3 py-1.5 rounded-full text-[12.5px] font-medium transition-all"
                        style={{
                          background: selected ? 'var(--gem-accent)' : 'var(--gem-gray-900)',
                          color: selected ? '#fff' : 'var(--gem-gray-300)',
                          border: selected ? '1px solid var(--gem-accent)' : '1px solid var(--gem-gray-700)',
                        }}
                      >
                        {f}
                      </button>
                    )
                  })}
                </div>
              </div>

              <Field
                label="Anything else"
                hint="Budget range, tone preferences, specific needs, current slate — whatever helps us find you the right writers."
              >
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder={role === 'producer'
                    ? "e.g. Looking for contained horror under $3M, or a character-driven drama pilot for a streamer pitch…"
                    : "e.g. Building my roster in genre space — horror, thriller, sci-fi. Especially interested in writers with a strong sample and a second project ready…"
                  }
                  style={{ resize: 'vertical' }}
                />
              </Field>

              {error && (
                <div
                  className="rounded-lg px-3.5 py-2.5 text-[13px]"
                  style={{
                    background: 'rgba(220,38,38,0.06)',
                    border: '1px solid rgba(220,38,38,0.25)',
                    color: '#b91c1c',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[15px] font-semibold text-white disabled:opacity-60 transition-opacity hover:brightness-110"
                style={{
                  background: 'var(--gem-accent)',
                  boxShadow: '0 6px 18px rgba(124,58,237,0.22)',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    Get started
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="text-[12.5px] text-[var(--gem-gray-500)] text-center mt-6">
              Writer?{' '}
              <Link href="/signup" className="text-[var(--gem-accent)] hover:underline font-medium">
                Create your free account →
              </Link>
            </p>
          </>
        )}
      </main>
    </>
  )
}

function Field({
  label,
  hint,
  required = false,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[12.5px] font-semibold text-[var(--gem-gray-300)] mb-1.5">
        {label}
        {required && <span style={{ color: 'var(--gem-accent)' }}> *</span>}
      </label>
      {children}
      {hint && (
        <p className="text-[11.5px] text-[var(--gem-gray-500)] m-0 mt-1 leading-snug">
          {hint}
        </p>
      )}
    </div>
  )
}

function SuccessPanel() {
  return (
    <div
      className="rounded-2xl p-8 text-center"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <span
        className="inline-flex items-center justify-center w-12 h-12 rounded-full mb-4"
        style={{ background: 'rgba(22,163,74,0.10)', color: '#16a34a' }}
      >
        <CheckCircle size={28} />
      </span>
      <h2
        className="text-[24px] font-bold tracking-tight m-0 mb-2 text-[var(--gem-gray-50)]"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Application sent.
      </h2>
      <p className="text-[14.5px] text-[var(--gem-gray-300)] leading-[1.55] m-0 mb-6 max-w-[42ch] mx-auto">
        Anuj will review and reach out personally if it&apos;s a fit. Usually
        within a couple of business days.
      </p>
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--gem-accent)] hover:text-[var(--gem-gray-50)] transition-colors"
      >
        Back to GEM
        <ArrowRight size={14} />
      </Link>
    </div>
  )
}
