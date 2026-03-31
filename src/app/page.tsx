import Link from 'next/link'
import { ArrowRight, Users, Compass, MessageCircle, TrendingUp } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--gem-gray-700)] text-xs text-[var(--gem-gray-300)] mb-8">
          Where creators build careers
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          Find collaborators.<br />
          Attract backers.<br />
          <span className="text-[var(--gem-accent)]">Build your career.</span>
        </h1>
        <p className="text-lg text-[var(--gem-gray-300)] max-w-2xl mx-auto mb-10 leading-relaxed">
          GEM is the network where creators find the right people to work with,
          get discovered for what they&apos;re building, and connect with the
          backers who can take their career to the next level.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
          >
            Join GEM
            <ArrowRight size={16} />
          </Link>
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-[var(--gem-gray-600)] text-[var(--gem-gray-300)] hover:text-white hover:border-[var(--gem-gray-400)] transition-colors"
          >
            Browse creators
          </Link>
        </div>
      </section>

      {/* Value props */}
      <section className="max-w-4xl mx-auto px-4 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          <div className="border border-[var(--gem-gray-700)] rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--gem-gray-800)] flex items-center justify-center mb-4">
              <Users size={20} className="text-[var(--gem-accent)]" />
            </div>
            <h3 className="font-semibold mb-2">Find collaborators</h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
              Post your project, define the roles you need, and connect with
              creators whose skills and sensibility match yours.
            </p>
          </div>
          <div className="border border-[var(--gem-gray-700)] rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--gem-gray-800)] flex items-center justify-center mb-4">
              <Compass size={20} className="text-[var(--gem-accent)]" />
            </div>
            <h3 className="font-semibold mb-2">Get discovered</h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
              Build your creator profile, showcase your work, and let GEM
              surface you to the right people — collaborators and backers alike.
            </p>
          </div>
          <div className="border border-[var(--gem-gray-700)] rounded-xl p-6">
            <div className="w-10 h-10 rounded-lg bg-[var(--gem-gray-800)] flex items-center justify-center mb-4">
              <TrendingUp size={20} className="text-[var(--gem-accent)]" />
            </div>
            <h3 className="font-semibold mb-2">Build your career</h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
              Every collaboration adds to your reputation. Backers, distributors,
              and brands find you through the work you&apos;ve done — not cold outreach.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-[var(--gem-gray-800)] py-20">
        <div className="max-w-3xl mx-auto px-4">
          <h2 className="text-2xl font-bold text-center mb-12">How GEM works</h2>
          <div className="space-y-10">
            <div className="flex gap-5">
              <div className="w-8 h-8 rounded-full bg-[var(--gem-accent)]/10 border border-[var(--gem-accent)]/30 flex items-center justify-center text-sm font-bold text-[var(--gem-accent)] shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold mb-1">Create your profile</h3>
                <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                  Tell the world what you&apos;re building and what you bring to the table.
                  Your skills, your genre, your vision — this is your creative resume.
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="w-8 h-8 rounded-full bg-[var(--gem-accent)]/10 border border-[var(--gem-accent)]/30 flex items-center justify-center text-sm font-bold text-[var(--gem-accent)] shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold mb-1">Post your projects</h3>
                <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                  Share what you&apos;re working on — a film, a series, a channel — and
                  define exactly which collaborators you need to bring it to life.
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="w-8 h-8 rounded-full bg-[var(--gem-accent)]/10 border border-[var(--gem-accent)]/30 flex items-center justify-center text-sm font-bold text-[var(--gem-accent)] shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold mb-1">Connect and collaborate</h3>
                <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                  GEM matches you with creators who fit your project. Message them directly,
                  invite them to collaborate, and build something together. Every shipped project
                  adds to both of your reputations.
                </p>
              </div>
            </div>
            <div className="flex gap-5">
              <div className="w-8 h-8 rounded-full bg-[var(--gem-accent)]/10 border border-[var(--gem-accent)]/30 flex items-center justify-center text-sm font-bold text-[var(--gem-accent)] shrink-0">
                4
              </div>
              <div>
                <h3 className="font-semibold mb-1">Get backed</h3>
                <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
                  As your work and reputation grow, backers — distributors, brands, investors —
                  find you on GEM. The platform becomes your launchpad, not just your workspace.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-[var(--gem-gray-800)] py-20">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-2xl font-bold mb-4">Your next collaborator is already here</h2>
          <p className="text-[var(--gem-gray-400)] mb-8">
            Join GEM and start building with people who share your ambition.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
          >
            Create your profile
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--gem-gray-800)] py-8">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between text-xs text-[var(--gem-gray-500)]">
          <span>GEM</span>
          <span>Where creators build careers</span>
        </div>
      </footer>
    </div>
  )
}
