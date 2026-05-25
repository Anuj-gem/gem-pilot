'use client'

// /apply — industry partner intake. Simplified form (name, email,
// company, role) → emails Anuj → redirects to Calendly to book a call.
// Dark theme matching the rest of the app.

import { useState } from 'react'
import Link from 'next/link'
import Nav from '@/components/nav'
import { ArrowRight, Loader2, Calendar } from 'lucide-react'

type Role = 'producer' | 'representative'

// ── Replace with your real Calendly link ──
const CALENDLY_URL = 'https://calendly.com/anuj-gem/15-minute-intro-call'

export default function ApplyPage() {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [company, setCompany] = useState('')
  const [role, setRole] = useState<Role>('producer')
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
          phone,
          company,
          role,
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

  return (
    <div style={{ background: '#0f0b1a', minHeight: '100vh' }}>
      <Nav />
      <main className="max-w-lg mx-auto px-4 sm:px-6 py-12 sm:py-16 pb-24">
        {submitted ? (
          <SuccessPanel />
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-10">
              <p
                className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-3"
                style={{ color: '#7c3aed' }}
              >
                Industry partners
              </p>
              <h1
                className="text-[30px] sm:text-[38px] font-extrabold tracking-tight leading-[1.1] m-0 mb-4"
                style={{ color: '#ffffff' }}
              >
                Let&apos;s talk about what you&apos;re looking for.
              </h1>
              <p
                className="text-[15px] leading-[1.6] m-0 max-w-[48ch] mx-auto"
                style={{ color: 'rgba(255,255,255,0.6)' }}
              >
                Tell us who you are and we&apos;ll set up a quick call to
                understand your slate and start matching you with writers.
              </p>
            </div>

            {/* Form */}
            <form
              onSubmit={handleSubmit}
              className="rounded-2xl p-5 sm:p-7 space-y-5"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
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
                  className="w-full px-3.5 py-2.5 rounded-lg text-[14px] outline-none transition-colors"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#1a1a2e',
                  }}
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
                  className="w-full px-3.5 py-2.5 rounded-lg text-[14px] outline-none transition-colors"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#1a1a2e',
                  }}
                />
              </Field>

              <Field label="Phone" required>
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  placeholder="+1 555 123 4567"
                  autoComplete="tel"
                  className="w-full px-3.5 py-2.5 rounded-lg text-[14px] outline-none transition-colors"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#1a1a2e',
                  }}
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
                  className="w-full px-3.5 py-2.5 rounded-lg text-[14px] outline-none transition-colors"
                  style={{
                    background: '#ffffff',
                    border: '1px solid rgba(255,255,255,0.15)',
                    color: '#1a1a2e',
                  }}
                />
              </Field>

              <div>
                <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  I&apos;m a <span style={{ color: '#7c3aed' }}>*</span>
                </label>
                <div
                  role="radiogroup"
                  aria-label="Role"
                  className="grid grid-cols-2 gap-1 p-1 rounded-lg"
                  style={{
                    background: 'rgba(255,255,255,0.04)',
                    border: '1px solid rgba(255,255,255,0.08)',
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
                        className="px-3 py-2.5 rounded-md text-[13px] font-semibold transition-all cursor-pointer border-0"
                        style={{
                          background: isSelected ? '#7c3aed' : 'transparent',
                          color: isSelected ? '#fff' : 'rgba(255,255,255,0.5)',
                        }}
                      >
                        {opt === 'producer' ? 'Producer' : 'Rep (agent / manager)'}
                      </button>
                    )
                  })}
                </div>
              </div>

              {error && (
                <div
                  className="rounded-lg px-3.5 py-2.5 text-[13px]"
                  style={{
                    background: 'rgba(220,38,38,0.1)',
                    border: '1px solid rgba(220,38,38,0.3)',
                    color: '#fca5a5',
                  }}
                >
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl text-[15px] font-semibold text-white disabled:opacity-60 transition-all hover:brightness-110 cursor-pointer border-0"
                style={{
                  background: '#7c3aed',
                  boxShadow: '0 6px 18px rgba(124,58,237,0.3)',
                }}
              >
                {submitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Sending…
                  </>
                ) : (
                  <>
                    Continue to book a call
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </form>

            <p className="text-center text-[13px] mt-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Writer?{' '}
              <Link href="/get-started" className="font-semibold hover:underline" style={{ color: '#7c3aed' }}>
                Get started →
              </Link>
            </p>
          </>
        )}
      </main>
    </div>
  )
}

function Field({
  label,
  required = false,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-[13px] font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.7)' }}>
        {label}
        {required && <span style={{ color: '#7c3aed' }}> *</span>}
      </label>
      {children}
    </div>
  )
}

function SuccessPanel() {
  return (
    <div className="text-center py-8">
      <span
        className="inline-flex items-center justify-center w-14 h-14 rounded-full mb-5"
        style={{ background: 'rgba(124,58,237,0.15)' }}
      >
        <Calendar size={28} style={{ color: '#7c3aed' }} />
      </span>
      <h2
        className="text-[26px] font-bold tracking-tight m-0 mb-3"
        style={{ color: '#ffffff' }}
      >
        You&apos;re in. Let&apos;s set up a time to talk.
      </h2>
      <p
        className="text-[15px] leading-[1.6] m-0 mb-8 max-w-[42ch] mx-auto"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        Book a quick call and we&apos;ll walk through your slate, what
        you&apos;re looking for, and how GEM can help.
      </p>
      <a
        href={CALENDLY_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[15px] font-semibold text-white transition-all hover:brightness-110 no-underline"
        style={{
          background: '#7c3aed',
          boxShadow: '0 6px 18px rgba(124,58,237,0.3)',
        }}
      >
        Book a call
        <ArrowRight size={16} />
      </a>
      <p className="text-[13px] mt-4" style={{ color: 'rgba(255,255,255,0.35)' }}>
        We&apos;ll also follow up by email if you can&apos;t book right now.
      </p>
    </div>
  )
}
