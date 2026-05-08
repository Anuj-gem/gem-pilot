// LandingPillars — five product pillars as paired text + mockup blocks.
// v10 — GEM Score, Human Review, Matching, Profile, Opportunities.

export function LandingPillars() {
  return (
    <section className="px-5 sm:px-8 pb-8 sm:pb-12">
      <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16">
        <Pillar
          eyebrow="Your GEM Score"
          title="Your GEM Score."
          body="Every script you upload gets scored and analyzed instantly. You get a detailed report — what's working, what's not, and how your script compares to produced work in the same genre."
          mockup={<GemScoreMockup />}
          align="left"
        />
        <Pillar
          eyebrow="Human review"
          title="Then a human takes a look."
          body="Our team reviews strong portfolios personally — your scripts, your voice, your range. If there's a fit with one of our partners, we make the connection."
          mockup={<HumanReviewMockup />}
          align="right"
        />
        <Pillar
          eyebrow="Matching"
          title="Matching."
          body="When there's a fit, a partner reaches out to you directly through GEM."
          mockup={<MatchingMockup />}
          align="left"
        />
        <Pillar
          eyebrow="Your portfolio"
          title="Your whole portfolio. One link."
          body="Scripts, bio, credits, scores — everything in one shareable profile. When someone asks what you've written, send them your GEM page."
          mockup={<ProfileMockup />}
          align="right"
        />
        <Pillar
          eyebrow="Open calls"
          title="Open opportunities."
          body="Browse open calls from companies actively looking for material. When your work fits, submit directly."
          mockup={<OpportunitiesMockup />}
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

// ── Mockup 1: GEM Score (The Sopranos sample) ─────────────────────
function GemScoreMockup() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-1">
            GEM evaluation
          </p>
          <p
            className="text-[15px] font-bold m-0 leading-tight text-[var(--gem-gray-50)] truncate"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            The Sopranos — Pilot
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

      {/* Report sections */}
      <div className="space-y-0">
        <ReportSection
          title="Why this is a hit"
          preview="Anti-hero premise with mass appeal. Tony Soprano is one of the most compelling leads in television history..."
        />
        <ReportSection
          title="Comparable projects"
          preview="Breaking Bad, Ozark, The Shield — morally complex leads in high-stakes worlds..."
        />
        <ReportSection
          title="Development notes"
          preview="Pilot sets up five seasons of story. The therapy frame is a structural advantage that most dramas lack..."
        />
        <ReportSection
          title="Production reality"
          preview="New Jersey locations, moderate cast size. Fits cable or premium streaming budget..."
        />
      </div>
    </div>
  )
}

function ReportSection({ title, preview }: { title: string; preview: string }) {
  return (
    <div className="py-2.5 border-b last:border-0 border-[var(--gem-gray-800)]">
      <p className="text-[13px] font-bold text-[var(--gem-gray-50)] m-0 leading-snug">
        {title}
      </p>
      <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-1 leading-snug">
        {preview}
      </p>
    </div>
  )
}

// ── Mockup 2: Human Review ─────────────────────────────────────────
function HumanReviewMockup() {
  return (
    <div className="p-5 sm:p-6">
      {/* Notification header */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: '#16a34a' }}
        />
        <p className="text-[12px] font-bold text-[var(--gem-gray-50)] m-0">
          Update from GEM
        </p>
      </div>

      {/* Review card */}
      <div
        className="relative rounded-lg px-4 py-3.5"
        style={{
          background: 'rgba(124,58,237,0.04)',
          border: '1px solid rgba(124,58,237,0.20)',
        }}
      >
        <div
          aria-hidden
          className="absolute left-0 top-3 bottom-3 rounded-r"
          style={{ width: 3, background: 'var(--gem-accent)' }}
        />
        <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-[var(--gem-accent)] m-0 mb-2 pl-2">
          GEM Review
        </p>
        <p className="text-[13px] text-[var(--gem-gray-100)] leading-[1.6] m-0 pl-2">
          This work is exceptional. We think you&apos;re a strong fit for
          several of our partners. We&apos;re doing some additional review — please stand by.
        </p>
      </div>
    </div>
  )
}

// ── Mockup 3: Matching (partner message) ───────────────────────────
function MatchingMockup() {
  return (
    <div className="p-5 sm:p-6">
      {/* Notification header */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ background: 'var(--gem-accent)' }}
        />
        <p className="text-[12px] font-bold text-[var(--gem-gray-50)] m-0">
          New message from a GEM partner
        </p>
      </div>

      {/* Message card */}
      <div
        className="rounded-lg px-4 py-3.5"
        style={{
          background: 'var(--gem-gray-900)',
          border: '1px solid var(--gem-gray-700)',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span
            className="shrink-0 w-10 h-10 rounded-full grid place-items-center text-white font-bold text-[13px]"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
          >
            SR
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight">
              Sarah R.
            </p>
            <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-0.5">
              Development Executive · Meridian Entertainment
            </p>
          </div>
        </div>
        <p className="text-[13px] text-[var(--gem-gray-200)] leading-[1.55] m-0 mb-3">
          GEM showed us your pilot and I think it&apos;s a great fit for
          something we&apos;re developing. Would love to set up a call — are you free Thursday?
        </p>
        <div className="flex items-center gap-2">
          <span
            className="rounded-lg px-3.5 py-2 text-[12px] font-semibold text-white"
            style={{ background: 'var(--gem-accent)' }}
          >
            Reply
          </span>
          <span
            className="rounded-lg px-3.5 py-2 text-[12px] font-semibold text-[var(--gem-gray-200)]"
            style={{ background: 'var(--gem-gray-900)', border: '1px solid var(--gem-gray-700)' }}
          >
            View profile
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Mockup 4: Profile card ─────────────────────────────────────────
function ProfileMockup() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start gap-3 mb-3">
        <span
          className="shrink-0 w-12 h-12 rounded-full grid place-items-center text-white font-bold text-[16px]"
          style={{ background: 'linear-gradient(135deg,#7c3aed,#a855f7)' }}
        >
          JM
        </span>
        <div className="flex-1 min-w-0">
          <p
            className="text-[16px] font-bold m-0 leading-tight text-[var(--gem-gray-50)]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Jordan Mitchell
          </p>
          <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-1">
            Drama · Thriller · Limited Series
          </p>
        </div>
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2 mb-4">
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-full"
          style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--gem-accent)' }}
        >
          Exceptional writer
        </span>
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-full"
          style={{ background: 'rgba(212,160,23,0.10)', color: 'var(--gem-gold)' }}
        >
          Top 5%
        </span>
      </div>

      {/* Scripts */}
      <div className="space-y-1.5">
        <ScriptStub title="The Glass Floor" score={86} />
        <ScriptStub title="Salt Creek" score={79} />
        <ScriptStub title="Nightfall Protocol" score={74} />
      </div>

      {/* Footer stats */}
      <div
        className="mt-3 pt-3 flex items-center gap-3 text-[12px] text-[var(--gem-gray-400)]"
        style={{ borderTop: '1px solid var(--gem-gray-700)' }}
      >
        <span>3 scripts</span>
        <span className="text-[var(--gem-gray-600)]">·</span>
        <span>Avg: <strong className="text-[var(--gem-gray-50)]">80</strong></span>
      </div>
    </div>
  )
}

function ScriptStub({ title, score }: { title: string; score: number }) {
  return (
    <div
      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <p
        className="text-[12px] font-bold text-[var(--gem-gray-50)] m-0 truncate leading-tight"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {title}
      </p>
      <span
        className="shrink-0 text-[12px] font-bold tabular-nums px-1.5 py-0.5 rounded"
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

// ── Mockup 5: Opportunities ────────────────────────────────────────
function OpportunitiesMockup() {
  return (
    <div className="p-5 sm:p-6">
      <p className="text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-3">
        Open opportunities
      </p>
      <div className="space-y-2.5">
        <OpportunityCard
          title="Seeking: hour-long drama pilots"
          sub="Production company developing a slate for premium cable."
          tags={['Drama', 'Open']}
        />
        <OpportunityCard
          title="Half-hour comedies for streaming"
          sub="Independent financier packaging for streamers."
          tags={['Comedy', 'Open']}
        />
      </div>
    </div>
  )
}

function OpportunityCard({
  title,
  sub,
  tags,
}: {
  title: string
  sub: string
  tags: string[]
}) {
  return (
    <div
      className="rounded-xl px-3.5 py-3"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <p
        className="text-[13px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {title}
      </p>
      <p className="text-[12px] text-[var(--gem-gray-400)] m-0 mt-1 leading-snug">
        {sub}
      </p>
      <div className="flex items-center gap-1.5 mt-2">
        {tags.map((t) => (
          <span
            key={t}
            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
            style={{
              background: t === 'Open' ? 'rgba(22,163,74,0.08)' : 'rgba(124,58,237,0.08)',
              color: t === 'Open' ? '#16a34a' : 'var(--gem-accent)',
            }}
          >
            {t}
          </span>
        ))}
      </div>
    </div>
  )
}
