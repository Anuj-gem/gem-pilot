import Link from 'next/link'
import { ArrowRight, FileText, BarChart3, Lightbulb, Clapperboard, CheckCircle, Trophy, TrendingUp, Heart } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[var(--gem-gray-800)] bg-[var(--gem-black)]/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">GEM</span>
          <div className="flex items-center gap-4">
            <Link
              href="/discover"
              className="text-sm text-[var(--gem-gray-300)] hover:text-white transition-colors hidden sm:inline"
            >
              Leaderboard
            </Link>
            <Link
              href="/login"
              className="text-sm text-[var(--gem-gray-300)] hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/signup"
              className="text-sm px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-accent)] mb-4">
          Score. Rank. Get Discovered.
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold tracking-tight leading-[1.1] mb-6 max-w-3xl">
          Get scored like a pro. Get seen by the industry.
        </h1>
        <p className="text-lg text-[var(--gem-gray-300)] max-w-2xl leading-relaxed mb-10">
          Upload your screenplay and get a professional evaluation in under a minute — five scored
          dimensions, development notes, and production analysis. Then publish your best work to
          the GEM leaderboard where top scripts rank publicly by score.
        </p>
        <div className="flex flex-wrap items-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
          >
            Evaluate your first script free
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-white hover:border-[var(--gem-gray-500)] transition-colors"
          >
            Browse the leaderboard
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* Two-pillar value prop */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">Two things other platforms can't do</p>
        <h2 className="text-3xl font-bold mb-16">A real evaluation and a real audience.</h2>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Evaluation pillar */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BarChart3 size={20} className="text-[var(--gem-accent)]" />
                <h3 className="text-xl font-bold">The Evaluation</h3>
              </div>
              <p className="text-sm text-[var(--gem-gray-400)] mb-6">
                Not a form letter. A scored, structured report built on the same rubric used
                to evaluate produced film and television.
              </p>
            </div>

            <div className="space-y-5 pl-1">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center shrink-0">
                  <Trophy size={14} className="text-[var(--gem-accent)]" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-0.5">Weighted GEM Score + Tier</h4>
                  <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                    Five dimensions — audience appeal, character strength, originality, hook, and
                    momentum — weighted by what matters for getting made. One score, one tier.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center shrink-0">
                  <Lightbulb size={14} className="text-amber-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-0.5">Development Notes</h4>
                  <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                    What's working, what's hurting, with evidence from your script. Actionable
                    notes for your next draft.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center shrink-0">
                  <Clapperboard size={14} className="text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-0.5">Production Reality Check</h4>
                  <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                    Cast requirements, locations, VFX, rights flags, platform fit. The feasibility
                    questions a producer asks before taking a meeting.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Leaderboard pillar */}
          <div className="space-y-8">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={20} className="text-emerald-400" />
                <h3 className="text-xl font-bold">The Leaderboard</h3>
              </div>
              <p className="text-sm text-[var(--gem-gray-400)] mb-6">
                Your score isn't just feedback — it's a ranking. Publish your script and
                compete publicly against every other screenplay on the platform.
              </p>
            </div>

            <div className="space-y-5 pl-1">
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center shrink-0">
                  <TrendingUp size={14} className="text-emerald-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-0.5">Public Rankings by Score</h4>
                  <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                    Scripts ranked by GEM score with tier badges. Search by genre, format,
                    or title. The best work rises to the top.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center shrink-0">
                  <Heart size={14} className="text-red-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-0.5">Community Likes</h4>
                  <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                    Other writers and industry readers can like your script. Sort the leaderboard
                    by most liked to see what's resonating.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center shrink-0">
                  <FileText size={14} className="text-blue-400" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-0.5">Unlimited Scripts & Ideas</h4>
                  <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                    Post as many scripts as you want. Features, pilots, shorts, limited
                    series — every idea gets scored and can go public.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">How it works</p>
        <h2 className="text-3xl font-bold mb-16">Upload. Score. Publish. Climb.</h2>

        <div className="grid sm:grid-cols-4 gap-8">
          <div>
            <div className="text-3xl font-bold text-[var(--gem-gray-700)] mb-3">01</div>
            <h3 className="font-semibold mb-2">Upload your script</h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
              Any format — pilot, feature, short, limited series. Drop a PDF
              and we handle the rest.
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--gem-gray-700)] mb-3">02</div>
            <h3 className="font-semibold mb-2">Get your score</h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
              In under a minute you'll have a full evaluation — scored dimensions,
              development notes, and production analysis.
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--gem-gray-700)] mb-3">03</div>
            <h3 className="font-semibold mb-2">Go public</h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
              Toggle your script to public and it hits the leaderboard instantly.
              Ranked by score alongside every other screenplay on the platform.
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--gem-gray-700)] mb-3">04</div>
            <h3 className="font-semibold mb-2">Rewrite and climb</h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
              Use the notes to improve your draft. Resubmit, get a new score,
              and watch your ranking rise.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">Pricing</p>
        <h2 className="text-3xl font-bold mb-16">Everything. $20 a month.</h2>

        <div className="max-w-sm mx-auto">
          <div className="rounded-2xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] p-8">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">$20</span>
              <span className="text-[var(--gem-gray-400)]">/ month</span>
            </div>
            <p className="text-sm text-[var(--gem-gray-400)] mb-6">Unlimited everything. Cancel anytime.</p>

            <ul className="space-y-3 mb-8">
              {[
                'Unlimited script evaluations',
                'Unlimited scripts on the leaderboard',
                'Full scored report every time',
                'Development notes + production analysis',
                'All formats — features, pilots, shorts',
              ].map(item => (
                <li key={item} className="flex items-start gap-2 text-sm text-[var(--gem-gray-300)]">
                  <CheckCircle size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>

            <Link
              href="/signup"
              className="block w-full text-center py-3 rounded-lg bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Start with a free evaluation
            </Link>
            <p className="text-xs text-[var(--gem-gray-500)] text-center mt-3">
              Your first script is on us. No credit card required.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <h2 className="text-3xl font-bold mb-4">Your script deserves more than a drawer.</h2>
        <p className="text-[var(--gem-gray-300)] max-w-lg mx-auto leading-relaxed mb-10">
          Get a real evaluation. Publish to the leaderboard. Let the work speak for itself.
        </p>
        <Link
          href="/signup"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
        >
          Get Started Free
          <ArrowRight size={16} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--gem-gray-800)] py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-[var(--gem-gray-500)]">
          <span>GEM</span>
          <span>&copy; {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  )
}
