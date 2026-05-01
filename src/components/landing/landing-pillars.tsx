// LandingPillars — three product pillars rendered as paired
// "headline + designed mockup" blocks. Each pillar gets one
// illustrative product mockup (NOT a real screenshot of /community
// or live data — we don't promise what we can't show yet) and one
// sentence of copy.
//
// Anuj 2026-04-30 v0.11.0 — community-first relaunch. The mockups
// are intentionally generic (placeholder writer names, illustrative
// review text) so they sell the IDEA of what the product does, not
// a specific user's success.

import { MessageSquare, User2, Briefcase, Star } from 'lucide-react'

export function LandingPillars() {
  return (
    <section className="px-5 sm:px-8 pb-8 sm:pb-12">
      <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16">
        <Pillar
          eyebrow="Peer reviews"
          title="Every writer here reviews and gets reviewed."
          body="That's how you grow. Get a real read from someone in the trenches with you — and give one back."
          mockup={<PeerReviewMockup />}
          align="left"
        />
        <Pillar
          eyebrow="Your public profile"
          title="A real home for your work."
          body="Your scripts, your voice, all in one place. The kind of page you'd actually drop in your bio."
          mockup={<ProfileMockup />}
          align="right"
        />
        <Pillar
          eyebrow="Direct industry contact"
          title="Reach the people who actually buy."
          body="Pro members message producers, agents, and managers directly. No gatekeepers, no inbox roulette."
          mockup={<IndustryMockup />}
          align="left"
        />
      </div>
    </section>
  )
}

function Pillar({
  eyebrow,
  title,
  body,
  mockup,
  align,
}: {
  eyebrow: string
  title: string
  body: string
  mockup: React.ReactNode
  align: 'left' | 'right'
}) {
  const textFirst = align === 'left'
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center">
      <div className={textFirst ? 'lg:order-1' : 'lg:order-2'}>
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          {eyebrow}
        </p>
        <h2
          className="text-[26px] sm:text-[32px] font-bold tracking-tight leading-[1.15] m-0 mb-3 text-[var(--gem-gray-50)]"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {title}
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-relaxed m-0 max-w-[52ch]">
          {body}
        </p>
      </div>
      <div className={textFirst ? 'lg:order-2' : 'lg:order-1'}>
        <div
          className="rounded-2xl"
          style={{
            background: '#fff',
            border: '1px solid var(--gem-gray-700)',
            boxShadow: '0 18px 40px rgba(0,0,0,0.10), 0 4px 12px rgba(0,0,0,0.05)',
          }}
        >
          {mockup}
        </div>
      </div>
    </div>
  )
}

// ── Mockup 1: Peer review thread ──────────────────────────────────
function PeerReviewMockup() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0">
          Peer reviews
        </p>
        <span
          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded"
          style={{
            color: 'var(--gem-accent)',
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.25)',
          }}
        >
          <Star size={9} fill="currentColor" />
          Score 78
        </span>
      </div>
      <div className="space-y-3">
        <ReviewRow
          name="Maya R."
          score={82}
          body="Tonal control is great in the cold open. Page 14 turn could land harder if Joel doesn’t telegraph it in the diner scene."
        />
        <ReviewRow
          name="Andre P."
          score={74}
          body="The mob-therapy premise hooks instantly. Second act sags — try collapsing the courthouse beats into one scene."
        />
      </div>
    </div>
  )
}

function ReviewRow({ name, score, body }: { name: string; score: number; body: string }) {
  const initials = name.split(' ').map((p) => p[0]).join('')
  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-1.5">
        <div className="flex items-center gap-2 min-w-0">
          <span
            className="shrink-0 w-6 h-6 rounded-full grid place-items-center text-white font-bold text-[10px]"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
          >
            {initials}
          </span>
          <span className="text-[12px] font-bold text-[var(--gem-gray-50)] truncate">
            {name}
          </span>
        </div>
        <span
          className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold tabular-nums px-1.5 py-0.5 rounded"
          style={{
            color: 'var(--gem-accent)',
            background: 'rgba(124,58,237,0.10)',
          }}
        >
          {score}
        </span>
      </div>
      <p className="text-[12.5px] leading-snug text-[var(--gem-gray-200)] m-0">
        {body}
      </p>
    </div>
  )
}

// ── Mockup 2: Public profile card ─────────────────────────────────
function ProfileMockup() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-4">
        <span
          className="shrink-0 w-12 h-12 rounded-full grid place-items-center text-white font-bold text-[16px]"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
        >
          JS
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[16px] font-bold m-0 leading-tight text-[var(--gem-gray-50)]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Jordan Sato
          </p>
          <p className="text-[12px] font-mono text-[var(--gem-accent)] m-0 mt-0.5">
            @jordansato
          </p>
          <p className="text-[12.5px] text-[var(--gem-gray-300)] m-0 mt-1.5 leading-snug">
            Half-hour comedy + features. Looking for staffing.
          </p>
        </div>
      </div>
      <div
        className="grid grid-cols-3 gap-2 text-center pt-3 border-t"
        style={{ borderColor: 'var(--gem-gray-700)' }}
      >
        <Stat label="Scripts" value="4" />
        <Stat label="Reviews" value="23" />
        <Stat label="Followers" value="89" />
      </div>
      <div className="mt-3 space-y-1.5">
        <ScriptStub title="The Quiet Part" format="Pilot" score={84} />
        <ScriptStub title="Lawn Order" format="Feature" score={71} />
      </div>
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[15px] font-bold text-[var(--gem-gray-50)] tabular-nums">{value}</div>
      <div className="text-[9.5px] uppercase tracking-wider font-bold text-[var(--gem-gray-500)] mt-0.5">
        {label}
      </div>
    </div>
  )
}

function ScriptStub({ title, format, score }: { title: string; format: string; score: number }) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="min-w-0 flex-1">
        <p
          className="text-[12px] font-bold text-[var(--gem-gray-50)] m-0 truncate leading-tight"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          {title}
        </p>
        <p className="text-[10px] text-[var(--gem-gray-500)] m-0 mt-0.5">{format}</p>
      </div>
      <span
        className="shrink-0 text-[10.5px] font-bold tabular-nums px-1.5 py-0.5 rounded"
        style={{
          color: 'var(--gem-accent)',
          background: 'rgba(124,58,237,0.08)',
        }}
      >
        {score}
      </span>
    </div>
  )
}

// ── Mockup 3: Industry inbox ──────────────────────────────────────
function IndustryMockup() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0">
          Industry inbox
        </p>
        <span
          className="inline-flex items-center gap-1 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded"
          style={{
            color: 'var(--gem-accent)',
            background: 'rgba(124,58,237,0.10)',
          }}
        >
          Pro
        </span>
      </div>
      <div className="space-y-2">
        <InboxRow
          icon={<Briefcase size={12} />}
          name="Lena Park"
          company="Westview Pictures"
          status="interested"
        />
        <InboxRow
          icon={<MessageSquare size={12} />}
          name="Marcus Hill"
          company="Lighthouse Studios"
          status="reached out"
        />
        <InboxRow
          icon={<User2 size={12} />}
          name="Devi Iyer"
          company="Anchor & Tide Mgmt."
          status="reached out"
        />
      </div>
    </div>
  )
}

function InboxRow({
  icon,
  name,
  company,
  status,
}: {
  icon: React.ReactNode
  name: string
  company: string
  status: 'interested' | 'reached out'
}) {
  const accent = status === 'reached out' ? 'var(--gem-accent)' : '#16a34a'
  const bg =
    status === 'reached out'
      ? 'rgba(124,58,237,0.10)'
      : 'rgba(22,163,74,0.10)'
  return (
    <div
      className="rounded-lg px-3 py-2 flex items-center justify-between gap-2"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span
          className="shrink-0 w-6 h-6 rounded-full grid place-items-center"
          style={{ background: 'rgba(124,58,237,0.10)', color: 'var(--gem-accent)' }}
        >
          {icon}
        </span>
        <div className="min-w-0">
          <p className="text-[12px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight truncate">
            {name}
          </p>
          <p className="text-[10.5px] text-[var(--gem-gray-500)] m-0 leading-tight truncate">
            {company}
          </p>
        </div>
      </div>
      <span
        className="shrink-0 text-[9.5px] font-bold uppercase tracking-wider px-1.5 py-[2px] rounded"
        style={{ color: accent, background: bg }}
      >
        {status === 'reached out' ? 'Reached out' : 'Interested'}
      </span>
    </div>
  )
}
