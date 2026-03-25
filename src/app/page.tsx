import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />

      {/* Hero */}
      <section className="relative flex-1 flex items-center justify-center py-32">
        {/* Subtle gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-gem-gold/[0.02] via-transparent to-transparent" />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gem-gold/[0.03] rounded-full blur-[120px]" />

        <div className="gem-container relative text-center max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-gem-border text-xs text-gem-text-secondary mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-gem-gold animate-pulse-slow" />
            2 free evaluations — no credit card required
          </div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            Know if a script{" "}
            <span className="text-gem-gold">breaks out</span>
            <br />
            before you read page two.
          </h1>

          <p className="text-lg md:text-xl text-gem-text-secondary leading-relaxed max-w-2xl mx-auto mb-12">
            GEM is the most sophisticated script evaluation tool ever built for producers.
            Upload a pilot and get a structured breakout report in minutes —
            calibrated against the most transcendent material in television history.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/signup" className="gem-btn-primary text-base">
              Try 2 Scripts Free
            </Link>
            <Link href="#how-it-works" className="gem-btn-secondary text-base">
              See How It Works
            </Link>
          </div>

          <p className="text-sm text-gem-text-muted mt-4">
            No credit card required &middot; 2 free evaluations &middot; Then $49/month
          </p>
        </div>
      </section>

      {/* Why GEM */}
      <section className="py-24 border-t border-gem-border">
        <div className="gem-container">
          <h2 className="font-display text-3xl font-bold text-center mb-4">
            Why producers choose GEM
          </h2>
          <p className="text-gem-text-secondary text-center max-w-xl mx-auto mb-16">
            Better analysis. Lower price. No compromises.
          </p>

          <div className="grid md:grid-cols-3 gap-10">
            {[
              {
                icon: "◆",
                title: "Deeper than a coverage reader",
                description:
                  "GEM doesn't summarize — it evaluates. Every report breaks down the five dimensions that separate transcendent material from the pile: concept, characters, market viability, originality, and narrative pull.",
              },
              {
                icon: "◆",
                title: "Half the price of anything comparable",
                description:
                  "Coverage services charge $200–$500 per script. Competing tools run $200+/month. GEM is $49/month for unlimited evaluations — built for working producers, not production company expense accounts.",
              },
              {
                icon: "◆",
                title: "Minutes, not weeks",
                description:
                  "A coverage reader takes 5–10 business days. GEM delivers a structured breakout report in under five minutes. Read the signal, then decide if it's worth your time.",
              },
            ].map((item) => (
              <div key={item.title} className="gem-card p-8 space-y-4 hover:border-gem-gold/20 transition-colors">
                <span className="text-gem-gold text-lg">{item.icon}</span>
                <h3 className="font-display text-lg font-semibold">{item.title}</h3>
                <p className="text-sm text-gem-text-secondary leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 border-t border-gem-border bg-gem-surface-raised">
        <div className="gem-container">
          <h2 className="font-display text-3xl font-bold text-center mb-16">
            Three steps to a structured first read
          </h2>

          <div className="grid md:grid-cols-3 gap-12">
            {[
              {
                step: "01",
                title: "Upload your script",
                description:
                  "Drop a PDF or text file. GEM reads the full text — dialogue, action lines, structure, everything — and gets to work.",
              },
              {
                step: "02",
                title: "GEM evaluates breakout potential",
                description:
                  "Our system scores the script across five core dimensions, calibrated against the most transcendent pilots ever made.",
              },
              {
                step: "03",
                title: "Get your report",
                description:
                  "A structured analysis with an overall score, verdict, per-facet reasoning, top strengths, and key risks. No fluff, no filler.",
              },
            ].map((item) => (
              <div key={item.step} className="space-y-4">
                <span className="text-gem-gold font-mono text-sm">{item.step}</span>
                <h3 className="font-display text-xl font-semibold">{item.title}</h3>
                <p className="text-gem-text-secondary leading-relaxed">
                  {item.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Five Facets */}
      <section className="py-24 border-t border-gem-border">
        <div className="gem-container">
          <h2 className="font-display text-3xl font-bold text-center mb-4">
            Five dimensions of breakout potential
          </h2>
          <p className="text-gem-text-secondary text-center max-w-xl mx-auto mb-16">
            Every script is evaluated on the dimensions that actually predict
            whether material connects with audiences and buyers.
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                label: "Market Appeal",
                desc: "Commercial viability, pitch-ability, and audience reach.",
              },
              {
                label: "Concept Hook",
                desc: "Is the premise clear, compelling, and instantly graspable?",
              },
              {
                label: "Character Appeal",
                desc: "Lead magnetism, durability, and long-term investment potential.",
              },
              {
                label: "Originality & Boldness",
                desc: "Creative risk-taking, distinctive voice, and freshness.",
              },
              {
                label: "Narrative Momentum",
                desc: "Pacing, urgency, stakes escalation, and episode-two pull.",
              },
            ].map((facet) => (
              <div
                key={facet.label}
                className="gem-card p-6 space-y-3 hover:border-gem-gold/20 transition-colors"
              >
                <h3 className="font-medium text-gem-text-primary">{facet.label}</h3>
                <p className="text-sm text-gem-text-secondary">{facet.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-24 border-t border-gem-border bg-gem-surface-raised">
        <div className="gem-container text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Simple pricing</h2>
          <p className="text-gem-text-secondary mb-12">
            One plan. Unlimited evaluations. A fraction of what coverage costs.
          </p>

          <div className="gem-card max-w-md mx-auto p-8 border-gem-gold/20">
            <div className="flex items-baseline justify-center gap-1 mb-1">
              <span className="text-4xl font-display font-bold text-gem-text-primary">$49</span>
              <span className="text-gem-text-secondary">/month</span>
            </div>
            <p className="text-sm text-gem-gold font-medium mb-1">Start with 2 free evaluations</p>
            <p className="text-xs text-gem-text-muted mb-8">No credit card required to try</p>

            <ul className="space-y-3 text-sm text-gem-text-secondary text-left max-w-xs mx-auto mb-8">
              {[
                "Unlimited script evaluations",
                "Full breakout reports with per-facet reasoning",
                "Dashboard with all past reports",
                "Results in under 5 minutes",
                "Cancel anytime",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="text-gem-gold mt-0.5">&#10003;</span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link href="/auth/signup" className="gem-btn-primary w-full">
              Try 2 Scripts Free
            </Link>

            <p className="text-xs text-gem-text-muted mt-4">
              No credit card until you subscribe. Cancel anytime.
            </p>
          </div>

          <p className="text-sm text-gem-text-muted mt-10">
            Coverage readers charge $200–500 <em>per script</em>. GEM is $49 for the whole month.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-gem-border">
        <div className="gem-container text-center">
          <h2 className="font-display text-3xl font-bold mb-4">
            Stop reading 300 pages to find out it doesn&apos;t work.
          </h2>
          <p className="text-gem-text-secondary max-w-xl mx-auto mb-8">
            Get a structured signal on every script before you commit your time.
            Your first two evaluations are free — no credit card, no catch.
          </p>
          <Link href="/auth/signup" className="gem-btn-primary text-base">
            Try 2 Scripts Free
          </Link>
          <p className="text-sm text-gem-text-muted mt-4">Takes 30 seconds to sign up.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
