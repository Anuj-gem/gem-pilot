// LandingCredibility — who GEM is and what the technology does.
// v13 — below-fold credibility section.

export function LandingCredibility() {
  return (
    <section className="px-5 sm:px-8 py-16 sm:py-20">
      <div className="max-w-3xl mx-auto">
        <p
          className="text-[11px] uppercase tracking-[0.32em] font-semibold mb-3"
          style={{ color: 'var(--gem-gold)' }}
        >
          Who we are
        </p>
        <h2
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-6"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          The most advanced screenplay
          <br className="hidden sm:block" />
          {' '}evaluation ever built.
        </h2>
        <div className="space-y-4 text-[15px] sm:text-[16px] text-[var(--gem-gray-300)] leading-relaxed max-w-[60ch]">
          <p className="m-0">
            GEM evaluates your screenplay the way a development executive
            would — analyzing story, character, market positioning, comparable
            projects, and production reality. You get a detailed report in
            under a minute.
          </p>
          <p className="m-0">
            Every member&apos;s work is accessible to our partner network of
            producers, reps, and financiers. When there&apos;s a fit, they
            reach out to you directly.
          </p>
          <p className="m-0 font-semibold text-[var(--gem-gray-100)]">
            Evaluations are free. Unlimited. Forever.
          </p>
        </div>
      </div>
    </section>
  )
}
