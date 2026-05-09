// LandingPillars — three product pillars.
// v11 — Evaluation, GEM Review, Matching. Dropped profile + opportunities pillars.

export function LandingPillars() {
  return (
    <section className="px-5 sm:px-8 pb-8 sm:pb-12">
      <div className="max-w-5xl mx-auto space-y-12 sm:space-y-16">
        <Pillar
          eyebrow="The evaluation"
          title="Instant. Detailed. Free."
          body="Upload your screenplay and get a full evaluation in under a minute — what's working, what's not, comparable projects, production reality, and where your script sits in the landscape. Powered by Selznick, the most advanced screenplay analysis technology ever built. Most companies charge hundreds of dollars for less."
          secondLine="Your first evaluation is completely free."
          mockup={<EvaluationMockup />}
          align="left"
        />
        <Pillar
          eyebrow="The GEM Review"
          title="A real person reviews your work."
          body="The GEM team reviews your entire portfolio in detail and does an in-depth assessment to determine whether you're a fit for any of the opportunities in our partner network."
          secondLine="Every portfolio review is done by a person on our team."
          mockup={<PortfolioReviewMockup />}
          align="right"
        />
        <Pillar
          eyebrow="The match"
          title="We connect you to the right people."
          body="When there's a fit, we make the introduction. Reps, producers, financiers, development executives — people actively looking for material like yours."
          mockup={<MatchingMockup />}
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
  secondLine,
  mockup,
  align,
}: {
  eyebrow: string
  title: string
  body: string
  secondLine?: string
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
        {secondLine && (
          <p className="text-[14px] font-semibold text-[var(--gem-accent)] m-0 mt-3">
            {secondLine}
          </p>
        )}
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

// ── Mockup 1: Evaluation (The Sopranos sample) ──────────────────────
function EvaluationMockup() {
  return (
    <div className="p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <p className="text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-1">
            Script evaluation
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
            Score
          </span>
          <span className="font-bold leading-none text-[var(--gem-gray-50)]" style={{ fontSize: 22 }}>
            84
          </span>
        </div>
      </div>

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

// ── Mockup 2: Portfolio Review ────────────────────────────────────────
function PortfolioReviewMockup() {
  return (
    <div className="p-5 sm:p-6">
      {/* Review header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-[12px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-1">
            Portfolio review
          </p>
          <p
            className="text-[15px] font-bold m-0 leading-tight text-[var(--gem-gray-50)]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Portfolio review #1
          </p>
        </div>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded-full"
          style={{ background: 'rgba(124,58,237,0.08)', color: 'var(--gem-accent)' }}
        >
          In review
        </span>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-0.5 mb-4">
        {['Submitted', 'Initial review', 'Advanced review', 'Partner match'].map((label, i) => (
          <div key={label} className="flex-1 flex flex-col items-center gap-1.5">
            <div
              className="w-full h-[3px] rounded-full"
              style={{ background: i <= 1 ? 'var(--gem-accent)' : 'var(--gem-gray-800)' }}
            />
            <span
              className="text-[9px] leading-none"
              style={{
                color: i <= 1 ? 'var(--gem-accent)' : 'var(--gem-gray-600)',
                fontWeight: i === 1 ? 700 : 500,
              }}
            >
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* Scripts in review */}
      <p className="text-[11px] uppercase tracking-[0.14em] font-bold text-[var(--gem-gray-500)] m-0 mb-2">
        Scripts in this review
      </p>
      <div className="space-y-1.5 mb-4">
        <ScriptStub title="The Glass Floor" score={86} />
        <ScriptStub title="Salt Creek" score={79} />
        <ScriptStub title="Nightfall Protocol" score={74} />
      </div>

      {/* Assessment preview */}
      <div
        className="relative rounded-lg px-4 py-3"
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
        <p className="text-[9px] uppercase tracking-[0.18em] font-bold text-[var(--gem-accent)] m-0 mb-1.5 pl-2">
          Assessment
        </p>
        <p className="text-[12.5px] text-[var(--gem-gray-100)] leading-[1.55] m-0 pl-2">
          Strong voice across all three scripts. Range from dark comedy to thriller shows real versatility. We see a clear fit with two of our active partners...
        </p>
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

// ── Mockup 3: Matching ───────────────────────────────────────────────
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
