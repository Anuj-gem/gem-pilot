import Link from 'next/link'
import { ArrowRight, CheckCircle, Calendar } from 'lucide-react'
import { HeroUpload } from '@/components/hero-upload'
import { ReportShowcase } from '@/components/report-showcase'
import { LandingTracking } from '@/components/landing-tracking'

export default function Home() {
  return (
    <div className="min-h-screen">
      <LandingTracking />

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
      <section className="max-w-4xl mx-auto px-6 pt-16 pb-16 sm:pt-28 sm:pb-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-accent)] mb-4">
          Score. Rank. Get Discovered.
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold tracking-tight leading-[1.1] mb-6 max-w-3xl">
          Get scored like a pro. Get seen by the industry.
        </h1>
        <p className="text-lg text-[var(--gem-gray-300)] max-w-2xl leading-relaxed mb-10">
          Upload your screenplay and get a professional evaluation in under 60 seconds — five scored
          dimensions, development notes, and production analysis. Then publish your best work to
          the GEM leaderboard where top scripts rank publicly by score.
        </p>
        <HeroUpload />

        <div className="flex flex-wrap items-center gap-4 mt-6">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--gem-gray-700)] text-sm text-[var(--gem-gray-300)] hover:text-white hover:border-[var(--gem-gray-500)] transition-colors"
          >
            Browse the leaderboard
            <ArrowRight size={14} />
          </Link>
          <a
            href="https://calendly.com/anuj-gem/15-minute-intro-call"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-[var(--gem-gray-700)] text-sm text-[var(--gem-gray-300)] hover:text-white hover:border-[var(--gem-gray-500)] transition-colors"
          >
            <Calendar size={14} />
            Talk to the founder
          </a>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* See a Real Report — showcase section */}
      <section className="max-w-5xl mx-auto px-6 py-16 sm:py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">See for yourself</p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">This is what your evaluation looks like.</h2>
        <p className="text-sm text-[var(--gem-gray-400)] max-w-2xl leading-relaxed mb-10 sm:mb-14">
          We ran the Game of Thrones pilot through GEM. Scores, development notes, production
          analysis — the same report every writer gets. Your first evaluation is free.
        </p>

        <div className="grid md:grid-cols-5 gap-8 md:gap-10 items-start">
          {/* Showcase card — takes 3 of 5 cols */}
          <div className="md:col-span-3">
            <ReportShowcase />
          </div>

          {/* What's inside breakdown — takes 2 of 5 cols */}
          <div className="md:col-span-2 space-y-6">
            <div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Weighted GEM Score + Tier</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Five dimensions — audience appeal, character strength, originality, hook, and
                momentum — weighted by what matters for getting made. One score, one tier.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Development Notes</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                What's working, what's hurting, with evidence pulled from your script. Actionable
                feedback for your next draft — not a form letter.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Production Reality Check</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Cast requirements, locations, VFX, rights flags, platform fit. The feasibility
                questions a producer asks before taking a meeting.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-white mb-1.5">Comparables</h3>
              <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
                Automatic comp titles with reasoning — know where your script sits in the market
                before anyone asks.
              </p>
            </div>

            <div className="pt-2">
              <Link
                href="/signup"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[var(--gem-accent)] text-white text-sm font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
              >
                Try it free with your script
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* The Leaderboard */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">Beyond feedback</p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Your score is a ranking.</h2>
        <p className="text-sm text-[var(--gem-gray-400)] max-w-2xl leading-relaxed mb-10 sm:mb-14">
          Publish your script to the GEM leaderboard and compete publicly against every other
          screenplay on the platform. The best work rises to the top.
        </p>

        <div className="grid sm:grid-cols-3 gap-6 sm:gap-8">
          <div className="p-5 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
            <h3 className="text-sm font-semibold text-white mb-2">Public Rankings</h3>
            <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
              Scripts ranked by GEM score with tier badges. Search by genre, format, or title.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
            <h3 className="text-sm font-semibold text-white mb-2">Community Likes</h3>
            <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
              Writers and industry readers can like your script. Sort the leaderboard by what's resonating.
            </p>
          </div>
          <div className="p-5 rounded-xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)]">
            <h3 className="text-sm font-semibold text-white mb-2">Unlimited Scripts</h3>
            <p className="text-xs text-[var(--gem-gray-400)] leading-relaxed">
              Features, pilots, shorts, limited series — every idea gets scored and can go public.
            </p>
          </div>
        </div>

        <div className="mt-8">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 text-sm text-[var(--gem-accent)] hover:underline"
          >
            Browse the leaderboard now
            <ArrowRight size={14} />
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">How it works</p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-10 sm:mb-16">Upload. Score. Publish. Climb.</h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
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
              In under 60 seconds you'll have a full evaluation — scored dimensions,
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

      {/* Pricing — with anchoring */}
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">Pricing</p>
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Everything. $20 a month.</h2>
        <p className="text-sm text-[var(--gem-gray-400)] mb-10 sm:mb-14 max-w-lg">
          Traditional coverage services charge $50–150 per script read. GEM gives you unlimited
          evaluations, a public leaderboard, and results in under a minute.
        </p>

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
      <section className="max-w-4xl mx-auto px-6 py-16 sm:py-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-bold mb-4">Your script deserves more than a drawer.</h2>
        <p className="text-[var(--gem-gray-300)] max-w-lg mx-auto leading-relaxed mb-10">
          Get a real evaluation. Publish to the leaderboard. Let the work speak for itself.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
          >
            Get Started Free
            <ArrowRight size={16} />
          </Link>
          <a
            href="https://calendly.com/anuj-gem/15-minute-intro-call"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--gem-gray-700)] text-[var(--gem-gray-300)] hover:text-white hover:border-[var(--gem-gray-500)] transition-colors"
          >
            <Calendar size={16} />
            Talk to the founder
          </a>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--gem-gray-800)] py-8">
        <div className="max-w-5xl mx-auto px-6 flex items-center justify-between text-xs text-[var(--gem-gray-500)]">
          <span>GEM</span>
          <div className="flex items-center gap-4">
            <a
              href="https://calendly.com/anuj-gem/15-minute-intro-call"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-white transition-colors"
            >
              Talk to us
            </a>
            <span>&copy; {new Date().getFullYear()}</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
