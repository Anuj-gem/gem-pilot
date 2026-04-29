'use client'

// /apply — industry partner application form. Producers and reps
// submit this; it emails Anuj directly (no DB write, no template).
// Anuj manually vets and sends a personal invite link to approved
// applicants. Anuj 2026-04-28.

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/nav'
import { ArrowRight, Loader2, CheckCircle } from 'lucide-react'

type Role = 'producer' | 'representative'

export default function ApplyPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState<Role>('producer')
  const [imdb, setImdb] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

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
          company,
          role,
          imdb,
          phone,
          notes,
        }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error || 'Failed to send application.')
      setSubmitted(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setSubmitting(false)
    }
  }

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
                Industry application
              </p>
              <h1 className="text-[34px] sm:text-[44px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-[1.05] m-0 mb-4 font-[family-name:var(--font-display)]">
                Apply for industry access.
              </h1>
              <p className="text-[15.5px] sm:text-[16px] text-[var(--gem-gray-300)] leading-[1.6] m-0 max-w-[60ch]">
                Industry partner accounts are invite-only. Tell us who you are and
                what you&apos;re scouting — if it&apos;s a fit, we&apos;ll send a
                personal invite link.
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
                        onClick={() => setRole(opt)}
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

              <Field label="IMDb" hint="Profile or company link — optional but helpful for vetting.">
                <input
                  type="url"
                  value={imdb}
                  onChange={e => setImdb(e.target.value)}
                  placeholder="https://www.imdb.com/name/..."
                  inputMode="url"
                />
              </Field>

              <Field label="Phone">
                <input
                  type="tel"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                  autoComplete="tel"
                />
              </Field>

              <Field
                label="How you want to work with writers"
                hint="Genres, formats, budget tiers, what you're scouting for — anything else worth knowing."
              >
                <textarea
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  rows={4}
                  placeholder="Mandate, current slate, what you're chasing this year…"
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
                    Send application
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
