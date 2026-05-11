// LandingCredibility — trust-building section.
// v13b — "Every writer deserves a chance at real access."
// Establishes: free evals, partner network, how access works.

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
          className="text-[28px] sm:text-[36px] font-bold tracking-tight leading-[1.15] m-0 mb-8"
          style={{ fontFamily: 'Georgia, serif' }}
        >
          Every writer deserves a chance
          <br className="hidden sm:block" />
          {' '}at real access.
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
          {/* Left: what you get */}
          <div>
            <h3
              className="text-[18px] font-bold text-[var(--gem-gray-50)] m-0 mb-3"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              A full evaluation, free.
              <br />
              As many as you want.
            </h3>
            <p className="text-[15px] text-[var(--gem-gray-300)] leading-relaxed m-0">
              Upload your screenplay and get a detailed evaluation — story,
              character, market positioning, comparable projects, and
              development notes. Unlimited. Free forever.
            </p>
          </div>

          {/* Right: the network */}
          <div>
            <h3
              className="text-[18px] font-bold text-[var(--gem-gray-50)] m-0 mb-3"
              style={{ fontFamily: 'Georgia, serif' }}
            >
              Your work, visible to
              <br />
              our partner network.
            </h3>
            <p className="text-[15px] text-[var(--gem-gray-300)] leading-relaxed m-0">
              Every member&apos;s work is accessible to our network of
              producers, reps, and financiers. When there&apos;s a fit, they
              reach out to you directly.
            </p>
          </div>
        </div>

        {/* Partner types */}
        <div className="flex flex-wrap gap-2">
          {['Producers', 'Lit Reps', 'Financiers', 'Development Executives'].map(p => (
            <span
              key={p}
              className="text-[12px] font-semibold px-3 py-1.5 rounded-full"
              style={{
                background: 'var(--gem-gray-800)',
                color: 'var(--gem-gray-300)',
                border: '1px solid var(--gem-gray-700)',
              }}
            >
              {p}
            </span>
          ))}
        </div>
      </div>
    </section>
  )
}
