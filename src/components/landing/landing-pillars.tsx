// LandingPillars �� four product pillars as paired text + mockup blocks.
// v0.13.0 messaging-v3: evaluation, opportunities, profile, vision.
// Peer reviews mockup → opportunity cards. Industry inbox → vision flow.

import { ArrowRight } from 'lucide-react'

export function LandingPillars() {
  return (
    <section className="px-5 sm:px-8 pb-8 sm:pb-12">
      <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16">
        <Pillar
          eyebrow="The evaluation"
          title="A structured read on every dimension a producer weighs."
          body="Headline, character breakdowns, packaging angle, budget tier, production complexity, and the honest development notes a buyer would weigh before saying yes. Not a score and a paragraph. The full read."
          mockup={<SelznickReportMockup />}
          align="left"
        />
        <Pillar
          eyebrow="Opportunities"
          title="Real opportunities from working industry."
          body="Active listings from producers, lit reps, talent reps, and financiers — each with specific requirements. When your script qualifies, submit in one click. No query letters, no entry fees, no months of waiting."
          mockup={<OpportunityCardsMockup />}
          align="right"
        />
        <Pillar
          eyebrow="Your profile"
          title="One page for everything you've written."
          body="Your scripts, your scores, your track record — all in one place. When industry partners look at your submission, this is what they see."
          mockup={<ProfileMockup />}
          align="left"
        />
        <Pillar
          eyebrow="The bigger picture"
          title="Built to get great work made."
          body="Most platforms stop at the evaluation. GEM keeps going. The read is the beginning — opportunities, matching, and direct industry contact are what come next. Every feature we build moves toward the same thing: closing the gap between great scripts and the people who can make them."
          mockup={<VisionFlowMockup />}
          align="right"
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

// ── Mockup 1: Selznick evaluation report ─────────────────────────
function SelznickReportMockup() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-1">
            Selznick evaluation
          </p>
          <p
            className="text-[15px] font-bold m-0 leading-tight text-[var(--gem-gray-50)] truncate"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Untitled mob-therapy pilot
          </p>
        </div>
        <div
          className="shrink-0 flex flex-col items-center justify-center rounded-lg tabular-nums"
          style={{
            background: 'rgba(124,58,237,0.08)',
            border: '1px solid rgba(124,58,237,0.30)',
            minWidth: 56,
            padding: '6px 10px',
          }}
        >
          <span className="text-[8.5px] uppercase tracking-[0.16em] font-bold text-[var(--gem-accent)] leading-none mb-1">
            GEM Score
          </span>
          <span className="font-bold leading-none text-[var(--gem-gray-50)]" style={{ fontSize: 22 }}>
            84
          </span>
        </div>
      </div>

      <div
        className="rounded-lg p-3.5 mb-3"
        style={{
          background: 'var(--gem-gray-900)',
          border: '1px solid var(--gem-gray-700)',
        }}
      >
        <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-[var(--gem-accent)] m-0 mb-2">
          Why this is a hit
        </p>
        <div className="space-y-1.5">
          <WhyRow n="01" text="The premise is a built-in engine for tonal whiplash." />
          <WhyRow n="02" text="Tony is a star-making contradiction in lead-actor terms." />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <ReadTile label="Budget" value="Indie" hint="$2-5M" tone="indie" />
        <ReadTile label="Complexity" value="Manageable" hint="2 main locations" tone="manageable" />
      </div>
    </div>
  )
}

function WhyRow({ n, text }: { n: string; text: string }) {
  return (
    <div className="flex gap-2">
      <span className="text-[10px] font-bold tabular-nums shrink-0" style={{ color: 'var(--gem-gold)' }}>
        {n}
      </span>
      <p className="text-[12px] m-0 leading-snug text-[var(--gem-gray-100)]">
        {text}
      </p>
    </div>
  )
}

function ReadTile({
  label,
  value,
  hint,
  tone,
}: {
  label: string
  value: string
  hint: string
  tone: 'indie' | 'manageable'
}) {
  const toneColor = tone === 'manageable' ? '#16a34a' : 'var(--gem-accent)'
  const toneBg =
    tone === 'manageable'
      ? 'rgba(22,163,74,0.08)'
      : 'rgba(124,58,237,0.08)'
  const toneBorder =
    tone === 'manageable'
      ? 'rgba(22,163,74,0.30)'
      : 'rgba(124,58,237,0.30)'
  return (
    <div
      className="rounded-lg p-3"
      style={{
        background: toneBg,
        border: `1px solid ${toneBorder}`,
      }}
    >
      <p className="text-[9px] uppercase tracking-[0.18em] font-bold m-0 mb-1" style={{ color: toneColor }}>
        {label}
      </p>
      <p className="text-[14px] font-bold m-0 leading-tight text-[var(--gem-gray-50)]" style={{ fontFamily: 'Georgia, serif' }}>
        {value}
      </p>
      <p className="text-[10.5px] m-0 mt-0.5 text-[var(--gem-gray-400)] leading-snug">
        {hint}
      </p>
    </div>
  )
}

// ── Mockup 2: Opportunity cards stack ────────────────────────────
function OpportunityCardsMockup() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0">
          Active opportunities
        </p>
      </div>
      <div className="space-y-2.5">
        <OppCard
          title="Character-driven thriller — limited series"
          description="Looking for contained, high-tension pilots with a strong singular lead."
          dealType="Option"
          perspective="Producer"
          tags={['Thriller', 'Series', 'Indie']}
          qualifies
        />
        <OppCard
          title="Underrepresented voices — comedy features"
          description="Fresh comedic POVs from writers with a distinct voice."
          dealType="Representation"
          perspective="Lit Rep"
          tags={['Comedy', 'Feature']}
        />
        <OppCard
          title="Action/thriller IP acquisition"
          description="High-concept action scripts with franchise potential."
          dealType="Purchase"
          perspective="Producer"
          tags={['Action', 'Feature', 'Studio']}
        />
      </div>
    </div>
  )
}

function OppCard({
  title,
  description,
  dealType,
  perspective,
  tags,
  qualifies = false,
}: {
  title: string
  description: string
  dealType: string
  perspective: string
  tags: string[]
  qualifies?: boolean
}) {
  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        background: 'var(--gem-gray-900)',
        border: qualifies
          ? '1px solid rgba(16,185,129,0.35)'
          : '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          {dealType}
        </span>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
          {perspective}
        </span>
      </div>
      <p
        className="text-[13px] font-bold m-0 mb-1 leading-tight text-[var(--gem-gray-50)]"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {title}
      </p>
      <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mb-2 leading-snug line-clamp-1">
        {description}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        {tags.map(t => (
          <span key={t} className="text-[9.5px] font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700">
            {t}
          </span>
        ))}
        {qualifies && (
          <span className="inline-flex items-center gap-1 text-[9.5px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 ml-auto">
            <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.15"/><path d="M3.5 6.2L5.2 7.8L8.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Your script qualifies
          </span>
        )}
      </div>
    </div>
  )
}

// ── Mockup 3: Profile card ──────���─────────────────────────────���──
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
        <ProfileStat label="Scripts" value="4" />
        <ProfileStat label="Avg Score" value="78" />
        <ProfileStat label="Submissions" value="6" />
      </div>
      <div className="mt-3 space-y-1.5">
        <ScriptStub title="The Quiet Part" format="Pilot" score={84} />
        <ScriptStub title="Lawn Order" format="Feature" score={71} />
      </div>
    </div>
  )
}

function ProfileStat({ label, value }: { label: string; value: string }) {
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

// ── Mockup 4: Vision flow — Script → Evaluation → Opportunity ────
function VisionFlowMockup() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-0">
        <FlowNode
          label="Your screenplay"
          sub="Upload a PDF"
          color="var(--gem-gray-50)"
          bg="var(--gem-gray-900)"
          border="var(--gem-gray-700)"
        />
        <FlowArrow />
        <FlowNode
          label="Evaluation"
          sub="Structured producer-grade read"
          color="var(--gem-accent)"
          bg="rgba(124,58,237,0.06)"
          border="rgba(124,58,237,0.30)"
        />
        <FlowArrow />
        <FlowNode
          label="Opportunities"
          sub="Matched to real buyers"
          color="#16a34a"
          bg="rgba(22,163,74,0.06)"
          border="rgba(22,163,74,0.30)"
        />
      </div>
      <p className="text-[12px] text-[var(--gem-gray-400)] text-center m-0 mt-5 leading-snug max-w-[38ch] mx-auto">
        Most platforms stop at the evaluation. We keep going until your script reaches the right people.
      </p>
    </div>
  )
}

function FlowNode({
  label,
  sub,
  color,
  bg,
  border,
}: {
  label: string
  sub: string
  color: string
  bg: string
  border: string
}) {
  return (
    <div
      className="flex-1 w-full sm:w-auto rounded-xl px-4 py-3.5 text-center"
      style={{ background: bg, border: `1px solid ${border}` }}
    >
      <p className="text-[13px] font-bold m-0 leading-tight" style={{ color, fontFamily: 'Georgia, serif' }}>
        {label}
      </p>
      <p className="text-[10.5px] text-[var(--gem-gray-400)] m-0 mt-1 leading-snug">
        {sub}
      </p>
    </div>
  )
}

function FlowArrow() {
  return (
    <div className="flex items-center justify-center px-1.5 py-1 sm:py-0">
      {/* Horizontal arrow (desktop) */}
      <svg
        aria-hidden
        className="hidden sm:block text-[var(--gem-gray-500)]"
        width="28"
        height="14"
        viewBox="0 0 28 14"
        fill="none"
      >
        <path
          d="M2 7h22M18 2l5 5-5 5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
      {/* Vertical arrow (mobile) */}
      <svg
        aria-hidden
        className="sm:hidden text-[var(--gem-gray-500)]"
        width="14"
        height="22"
        viewBox="0 0 14 22"
        fill="none"
      >
        <path
          d="M7 2v18M2 14l5 5 5-5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}
