import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

const CALENDLY_URL = 'https://calendly.com/anuj-gem/15-minute-intro-call'

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b border-[var(--gem-gray-800)] bg-[var(--gem-black)]/90 backdrop-blur-sm">
        <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
          <span className="text-xl font-bold tracking-tight">GEM</span>
          <div className="flex items-center gap-6">
            <a href="#about" className="text-sm text-[var(--gem-gray-300)] hover:text-white transition-colors hidden sm:inline">About</a>
            <a href="#services" className="text-sm text-[var(--gem-gray-300)] hover:text-white transition-colors hidden sm:inline">Services</a>
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm px-4 py-2 rounded-lg bg-[var(--gem-accent)] text-white hover:bg-[var(--gem-accent-hover)] transition-colors"
            >
              Book a Meeting
            </a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 pt-28 pb-20">
        <h1 className="text-4xl sm:text-5xl md:text-[3.5rem] font-bold tracking-tight leading-[1.1] mb-6 max-w-3xl">
          AI-native media for the next era of storytelling.
        </h1>
        <p className="text-lg text-[var(--gem-gray-300)] max-w-2xl leading-relaxed mb-10">
          GEM is a media company built on AI from the ground up. We produce original content,
          build proprietary tools for creative development, and partner with production companies
          and brands who want to work smarter without compromising what makes their stories great.
        </p>
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
        >
          Book a Meeting
          <ArrowRight size={16} />
        </a>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* What We Do */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">What we do</p>
        <h2 className="text-3xl font-bold mb-16">Two sides of the same mission.</h2>

        <div className="grid md:grid-cols-2 gap-12">
          <div>
            <h3 className="text-xl font-semibold mb-4">Production Lab</h3>
            <p className="text-[var(--gem-gray-300)] leading-relaxed">
              We produce original content powered by AI at every level of the process —
              development, production, and distribution. Our in-house channels have reached
              over a billion views across social platforms, and we use that work as a testing
              ground for new formats, new tools, and new ways of making things that would have
              been impossible a few years ago.
            </p>
          </div>
          <div>
            <h3 className="text-xl font-semibold mb-4">Partnerships &amp; Advisory</h3>
            <p className="text-[var(--gem-gray-300)] leading-relaxed">
              We work with production companies, media businesses, and brands to bring the
              same systems and thinking into their operations. Whether that means deploying
              AI agents across a development slate, building a content pipeline from scratch,
              or helping a team figure out where AI actually fits — we come in, build real
              infrastructure, and hand it off.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* Services */}
      <section id="services" className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">Services</p>
        <h2 className="text-3xl font-bold mb-16">What we build for partners.</h2>

        <div className="space-y-16">
          <div>
            <h3 className="text-xl font-semibold mb-4">AI Agent Deployment for Production Companies</h3>
            <p className="text-[var(--gem-gray-300)] leading-relaxed">
              Your creative judgment and relationships are yours. We deploy AI agents that handle
              the rest — coverage, research, pitch materials, development tracking. Your team gets
              back the hours that shouldn&apos;t have required their expertise in the first place.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">Content System Design &amp; Buildout</h3>
            <p className="text-[var(--gem-gray-300)] leading-relaxed">
              End-to-end AI-powered production systems, custom-built for your operation. The same
              approach behind our billion-view content network, tailored to your team&apos;s workflow.
              From ideation and scripting through asset creation and distribution — a complete system
              your team can own and run on day one.
            </p>
          </div>

          <div>
            <h3 className="text-xl font-semibold mb-4">AI Strategy and Implementation</h3>
            <p className="text-[var(--gem-gray-300)] leading-relaxed">
              For organizations that know AI matters but haven&apos;t figured out where it fits.
              We assess your operation, identify the real opportunities, and implement working
              systems. No decks that sit in a drawer. Actual infrastructure.
            </p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* About */}
      <section id="about" className="max-w-4xl mx-auto px-6 py-24">
        <p className="text-sm uppercase tracking-widest text-[var(--gem-gray-500)] mb-4">About</p>

        <div className="max-w-2xl space-y-6 text-[var(--gem-gray-300)] leading-relaxed">
          <p>
            Entertainment has been in my blood since before I knew it was going to be my career.
            My father spent 25 years at Disney, and I grew up watching how stories get made from
            the inside. I interned at Walt Disney Studios, studied economics at UCSD, and spent
            the next decade building a skill set I didn&apos;t fully understand the purpose of yet.
          </p>
          <p>
            I ran financial strategy for Uber&apos;s Western US portfolio. I served as Chief of
            Staff at Handoff through its Series A, overseeing everything from company strategy
            to investor relations. Along the way, I advised over 100 independent creators and
            companies including Nextdoor on growth, AI adoption, and content strategy.
          </p>
          <p>
            Then I started GEM, because I had a conviction that AI was about to change how media
            gets made at a fundamental level — and I wanted to build a company that proved it.
            A billion views later, we did. And now we&apos;re helping others do it too.
          </p>
          <p className="text-white font-medium pt-2">
            — Anuj Kommareddy, Founder
          </p>
        </div>
      </section>

      {/* Divider */}
      <div className="max-w-5xl mx-auto px-6"><div className="border-t border-[var(--gem-gray-800)]" /></div>

      {/* Book a Meeting */}
      <section className="max-w-4xl mx-auto px-6 py-24">
        <h2 className="text-3xl font-bold mb-4">Let&apos;s build something.</h2>
        <p className="text-[var(--gem-gray-300)] max-w-xl leading-relaxed mb-10">
          If you&apos;re a production company thinking about AI, a brand looking to move faster,
          or an investor with a thesis you want to explore — I&apos;d love to hear what you&apos;re working on.
        </p>
        <a
          href={CALENDLY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[var(--gem-accent)] text-white font-medium hover:bg-[var(--gem-accent-hover)] transition-colors"
        >
          Book a Meeting
          <ArrowRight size={16} />
        </a>
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
