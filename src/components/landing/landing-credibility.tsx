// LandingCredibility — "The GEM Evaluation" + "How partners work with us."
// v13c — producer-level read, free forever, partner workflow.

import { BookOpen, TrendingUp, Target, Search, MessageSquare, Link2 } from 'lucide-react'

export function LandingCredibility() {
  return (
    <>
      {/* ── Section 1: The GEM Evaluation ── */}
      <section className="px-5 sm:px-8 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <p
            className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
            style={{ color: 'var(--gem-gold)' }}
          >
            The GEM evaluation
          </p>
          <h2
            className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-4"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            A real producer-level read.
            <br className="hidden sm:block" />
            {' '}Not just script coverage.
          </h2>
          <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-relaxed m-0 mb-8 max-w-[58ch]">
            We built Selznick using everything we know about what our industry
            partners are actually looking for — combined with deep research on
            what gets greenlit, what finds an audience, and why. You get a
            producer-level evaluation, not a grading rubric.
          </p>

          {/* Visual: what the evaluation covers */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
            <EvalFeature icon={BookOpen} label="Story & character" />
            <EvalFeature icon={TrendingUp} label="Market positioning" />
            <EvalFeature icon={Target} label="Comparable projects" />
            <EvalFeature icon={Search} label="Production reality" />
            <EvalFeature icon={MessageSquare} label="Development notes" />
            <EvalFeature icon={Link2} label="Partner matching" />
          </div>

          <p className="text-[14px] font-semibold m-0" style={{ color: 'var(--gem-accent)' }}>
            Your first evaluation is free. Try Pro for 7 days to unlock everything.
          </p>
        </div>
      </section>

      <div className="h-px bg-[var(--gem-gray-700)] mx-auto max-w-5xl" />

      {/* ── Section 2: How partners work with us ── */}
      <section className="px-5 sm:px-8 py-16 sm:py-20">
        <div className="max-w-3xl mx-auto">
          <p
            className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
            style={{ color: 'var(--gem-gold)' }}
          >
            Our network
          </p>
          <h2
            className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-8"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            How partners work with GEM.
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <PartnerCard
              number="01"
              title="Discover promising writers"
              description="Partners browse evaluated work on GEM and find writers whose scripts match what they're looking for."
            />
            <PartnerCard
              number="02"
              title="Post opportunities"
              description="When partners are looking for something specific, they post it on GEM — with genre, format, and budget criteria."
            />
            <PartnerCard
              number="03"
              title="Provide feedback"
              description="Writers who apply get real feedback on their work through the platform."
            />
            <PartnerCard
              number="04"
              title="Connect directly"
              description="When there&apos;s a fit, partners and writers connect directly to advance discussions."
            />
          </div>
        </div>
      </section>
    </>
  )
}

function EvalFeature({ icon: Icon, label }: { icon: typeof BookOpen; label: string }) {
  return (
    <div
      className="flex items-center gap-2.5 rounded-lg px-3.5 py-3"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <Icon size={16} style={{ color: 'var(--gem-accent)' }} className="shrink-0" />
      <span className="text-[13px] font-semibold text-[var(--gem-gray-200)]">
        {label}
      </span>
    </div>
  )
}

function PartnerCard({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="rounded-xl p-5 card-glass">
      <span
        className="text-[11px] font-bold tracking-wider mb-2 block"
        style={{ color: 'var(--gem-gold)' }}
      >
        {number}
      </span>
      <h3
        className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 mb-2 leading-snug"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        {title}
      </h3>
      <p className="text-[13px] text-[var(--gem-gray-300)] m-0 leading-snug">
        {description}
      </p>
    </div>
  )
}
