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
            Now in private beta
          </div>

          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            Know if a script{" "}
            <span className="text-gem-gold">breaks out</span>
            <br />
            before you read page two.
          </h1>

          <p className="text-lg md:text-xl text-gem-text-secondary leading-relaxed max-w-2xl mx-auto mb-12">
            GEM is an AI-powered first-read analysis tool built for producers.
            Upload a script and get a structured breakout evaluation in minutes,
            not weeks.
          </p>

          <div className="flex items-center justify-center gap-4">
            <Link href="/auth/signup" className="gem-btn-primary text-base">
              Start 7-Day Free Trial
            </Link>
            <Link href="#how-it-works" className="gem-btn-secondary text-base">
              See How It Works
            </Link>
          </div>

          <p className="text-sm text-gem-text-muted mt-4">
            $99/month &middot; Unlimited scripts &middot; Cancel anytime
          </p>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 border-t border-gem-border">
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
                  "Drop a PDF or text file. We extract and analyze the full text — dialogue, action lines, structure, everything.",
              },
              {
                step: "02",
                title: "AI evaluates breakout potential",
                description:
                  "Our model scores your script across five core dimensions calibrated against historically transcendent material.",
              },
              {
                step: "03",
                title: "Get your report",
                description:
                  "A structured analysis with an overall score, verdict, per-facet reasoning, top strengths, and key risks. No fluff.",
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
      <section className="py-24 border-t border-gem-border bg-gem-surface-raised">
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
      <section className="py-24 border-t border-gem-border">
        <div className="gem-container text-center">
          <h2 className="font-display text-3xl font-bold mb-4">Simple pricing</h2>
          <p className="text-gem-text-secondary mb-12">
            One plan. Unlimited scripts. Built for working producers.
          </p>

          <div className="gem-card max-w-md mx-auto p-8 border-gem-gold/20">
            <div className="flex items-baseline justify-center gap-1 mb-2">
              <span className="text-4xl font-display font-bold text-gem-text-primary">$99</span>
              <span className="text-gem-text-secondary">/month</span>
            </div>
            <p className="text-sm text-gem-text-muted mb-8">7-day free trial included</p>

            <ul className="space-y-3 text-sm text-gem-text-secondary text-left max-w-xs mx-auto mb-8">
              {[
                "Unlimited script analyses",
                "Full breakout reports with reasoning",
                "Dashboard with all past reports",
                "Priority processing",
              ].map((feature) => (
                <li key={feature} className="flex items-start gap-3">
                  <span className="text-gem-gold mt-0.5">&#10003;</span>
                  {feature}
                </li>
              ))}
            </ul>

            <Link href="/auth/signup" className="gem-btn-primary w-full">
              Start Free Trial
            </Link>

            <p className="text-xs text-gem-text-muted mt-4">
              Fair use policy applies. GEM is designed for professional evaluation workflows.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 border-t border-gem-border">
        <div className="gem-container text-center">
          <h2 className="font-display text-3xl font-bold mb-4">
            Stop reading 300 pages to find out it doesn&apos;t work.
          </h2>
          <p className="text-gem-text-secondary max-w-xl mx-auto mb-8">
            Get a structured signal on every script before you commit time and attention.
            The first week is on us.
          </p>
          <Link href="/auth/signup" className="gem-btn-primary text-base">
            Get Started
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
