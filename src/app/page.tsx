import Link from 'next/link'
import { ArrowRight, Users, Compass, MessageCircle, Sparkles } from 'lucide-react'

export default function Home() {
  return (
    <div className="min-h-[calc(100vh-56px)]">
      {/* Hero */}
      <section className="max-w-4xl mx-auto px-4 pt-24 pb-16 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--gem-gray-700)] text-xs text-[var(--gem-gray-300)] mb-8">
          <Sparkles size={12} className="text-[var(--gem-accent)]" />
          The AI-native creator network
        </div>
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight leading-tight mb-6">
          Find your collaborators.<br />
          <span className="text-[var(--gem-accent)]">Build what&apos;s next.</span>
        </h1>
        <p className="text-lg text-[var(--gem-gray-300)] max-w-2xl mx-auto mb-10 leading-relaxed">
          GEM is where AI-native creators find the right people to collaborate with,
          get discovered for their work, and build the reputation that opens doors.
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
      <section className="max-w-4xl mx-auto px-4 pb-24">
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
              <MessageCircle size={20} className="text-[var(--gem-accent)]" />
            </div>
            <h3 className="font-semibold mb-2">Connect directly</h3>
            <p className="text-sm text-[var(--gem-gray-400)] leading-relaxed">
              Message any creator or interested party directly. No gatekeepers,
              no formal applications — just real conversations.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--gem-gray-800)] py-8">
        <div className="max-w-4xl mx-auto px-4 flex items-center justify-between text-xs text-[var(--gem-gray-500)]">
          <span>GEM Studio</span>
          <span>The AI-native creator network</span>
        </div>
      </footer>
    </div>
  )
}
