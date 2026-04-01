import Link from 'next/link'
import { ArrowRight, FileText, BarChart3, Lightbulb, Clapperboard, CheckCircle } from 'lucide-react'

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
              Discover
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
          Script Evaluation Platform
        </p>
        <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold tracking-tight leading-[1.1] mb-6 max-w-3xl">
          Get the evaluation a producer would give your script.
        </h1>
        <p className="text-lg text-[var(--gem-gray-300)] max-w-2xl leading-relaxed mb-10">
          Upload your screenplay and get a scored, structured report in under a minute.
          Five dimensions. Development notes. Production analysis. Built on the same
          rubric used to evaluate produced film and television.
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
            Browse top scripts
          </Link>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* What You Get */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">What you get</p>
        <h2 className="text-3xl font-bold mb-16">A real evaluation, not a form letter.</h2>

        <div className="grid sm:grid-cols-2 gap-10">
          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center">
                <BarChart3 size={18} className="text-[var(--gem-accent)]" />
              </div>
              <h3 className="text-lg font-semibold">Weighted GEM Score</h3>
            </div>
            <p className="text-[var(--gem-gray-300)] text-sm leading-relaxed">
              Five scored dimensions — audience appeal, character strength, creative originality,
              conceptual hook, and narrative momentum — weighted by what actually matters
              for getting a script made. You get a single number and a tier placement.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center">
                <Lightbulb size={18} className="text-amber-400" />
              </div>
              <h3 className="text-lg font-semibold">Development Notes</h3>
            </div>
            <p className="text-[var(--gem-gray-300)] text-sm leading-relaxed">
              Specific feedback on what's working and what needs work, with evidence
              pulled directly from your script. Not vague encouragement — actionable
              notes that tell you exactly where to focus your next draft.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center">
                <Clapperboard size={18} className="text-emerald-400" />
              </div>
              <h3 className="text-lg font-semibold">Production Reality Check</h3>
            </div>
            <p className="text-[var(--gem-gray-300)] text-sm leading-relaxed">
              Cast requirements, location count, VFX needs, rights flags,
              and platform fit. The same feasibility questions a producer asks
              before taking a meeting — now available before you walk in the room.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-[var(--gem-gray-800)] border border-[var(--gem-gray-700)] flex items-center justify-center">
                <FileText size={18} className="text-blue-400" />
              </div>
              <h3 className="text-lg font-semibold">Overall Take</h3>
            </div>
            <p className="text-[var(--gem-gray-300)] text-sm leading-relaxed">
              One honest paragraph that synthesizes everything — scores, development
              gaps, production complexity — into the kind of candid assessment you'd
              get from a development exec who actually read the script.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* How it works */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">How it works</p>
        <h2 className="text-3xl font-bold mb-16">Upload. Score. Improve. Repeat.</h2>

        <div className="grid sm:grid-cols-3 gap-8">
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
            <h3 className="font-semibold mb-2">Get your report</h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
              In under a minute, you'll have a full evaluation — scored dimensions,
              development notes, and production analysis.
            </p>
          </div>
          <div>
            <div className="text-3xl font-bold text-[var(--gem-gray-700)] mb-3">03</div>
            <h3 className="font-semibold mb-2">Rewrite and resubmit</h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
              Use the notes to improve your draft, submit the new version, and
              watch your score climb. Make your best work public on the Discover page.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* Pricing */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">Pricing</p>
        <h2 className="text-3xl font-bold mb-16">Simple. One plan.</h2>

        <div className="max-w-sm mx-auto">
          <div className="rounded-2xl border border-[var(--gem-gray-700)] bg-[var(--gem-gray-900)] p-8">
            <div className="flex items-baseline gap-1 mb-1">
              <span className="text-4xl font-bold">$20</span>
              <span className="text-[var(--gem-gray-400)]">/ month</span>
            </div>
            <p className="text-sm text-[var(--gem-gray-400)] mb-6">Unlimited evaluations. Cancel anytime.</p>

            <ul className="space-y-3 mb-8">
              {[
                'Unlimited script evaluations',
                'Full scored report every time',
                'Development notes + production analysis',
                'Public Discover leaderboard profile',
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
        <h2 className="text-3xl font-bold mb-4">Your script deserves a real read.</h2>
        <p className="text-[var(--gem-gray-300)] max-w-lg mx-auto leading-relaxed mb-10">
          Stop guessing whether your screenplay is ready. Get a structured evaluation
          and know exactly where you stand.
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
