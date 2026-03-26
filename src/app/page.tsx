import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900">
      <Navbar />

      {/* ── Hero ── */}
      <section className="relative overflow-hidden border-b border-zinc-200">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-50 via-white to-emerald-50" />
        <div className="relative gem-container py-20 lg:py-28">
          <div className="grid items-center gap-14 lg:grid-cols-2">

            {/* Left: headline + CTAs */}
            <div>
              <div className="mb-5 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                Built to find breakouts — not just analyze scripts
              </div>
              <h1 className="text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
                The AI that was trained
                <span className="block text-emerald-700">to spot the next hit.</span>
              </h1>
              <p className="mt-6 max-w-xl text-lg leading-8 text-zinc-600">
                GEM analyzed thousands of signals across the most successful TV pilots ever made — and built a model that can read your script the same way a top-tier development executive would. For{" "}
                <span className="font-semibold text-zinc-900">$49/month. Unlimited scripts.</span>
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/auth/signup"
                  className="rounded-2xl bg-zinc-950 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Try 2 Scripts Free
                </Link>
              </div>
              <p className="mt-3 text-sm text-zinc-500">No credit card required &middot; 2 free evaluations &middot; Then $49/month, unlimited</p>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-4">
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-2xl font-semibold text-zinc-950">1,000s</div>
                  <div className="mt-1 text-sm text-zinc-500">of signals per script</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-2xl font-semibold text-zinc-950">$49</div>
                  <div className="mt-1 text-sm text-zinc-500">unlimited/month</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-2xl font-semibold text-zinc-950">&lt;5 min</div>
                  <div className="mt-1 text-sm text-zinc-500">full report, every time</div>
                </div>
              </div>
            </div>

            {/* Right: abstract report mockup */}
            <div className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-emerald-100 to-zinc-100 blur-2xl opacity-60" />
              <div className="relative rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-2xl">

                {/* Report header */}
                <div className="flex items-center justify-between border-b border-zinc-100 pb-4">
                  <div>
                    <div className="text-xs font-medium uppercase tracking-widest text-zinc-400">GEM Analysis</div>
                    <div className="mt-1 text-lg font-semibold text-zinc-950">THE LAST BROADCAST</div>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                    STRONG SIGNAL
                  </div>
                </div>

                {/* Score + verdict */}
                <div className="mt-5 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                    <div className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Hit Confidence</div>
                    <div className="mt-2 text-5xl font-bold text-emerald-800 leading-none">83</div>
                    <div className="mt-2 text-xs text-emerald-700 leading-relaxed">Strong commercial potential across multiple dimensions</div>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 border border-zinc-100 p-4">
                    <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Producer Take</div>
                    <div className="mt-2 text-sm font-medium text-zinc-900 leading-snug">
                      Clear audience, strong pilot propulsion, and real series viability.
                    </div>
                    <div className="mt-2 text-xs text-zinc-500 leading-relaxed">Worth prioritizing.</div>
                  </div>
                </div>

                {/* Abstract signal bars */}
                <div className="mt-5">
                  <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-3">Signal Analysis</div>
                  <div className="space-y-2.5">
                    {[
                      { label: "Commercial Viability", pct: 91, color: "bg-emerald-500" },
                      { label: "Audience & Market Fit", pct: 86, color: "bg-emerald-400" },
                      { label: "Series Longevity", pct: 84, color: "bg-emerald-400" },
                      { label: "Execution Risk", pct: 72, color: "bg-amber-400" },
                    ].map(({ label, pct, color }) => (
                      <div key={label}>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-zinc-600">{label}</span>
                          <span className="text-xs font-semibold text-zinc-700">{pct}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-zinc-100">
                          <div
                            className={`h-1.5 rounded-full ${color}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Teaser insight */}
                <div className="mt-5 rounded-2xl border border-zinc-200 bg-white p-4">
                  <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider mb-2">Top Insight</div>
                  <p className="text-sm text-zinc-700 leading-relaxed">
                    <span className="font-semibold text-zinc-950">Hook anchors the whole pilot.</span> The premise opens a world audiences can&apos;t get elsewhere — and the character dynamics are engineered to sustain it beyond episode one.
                  </p>
                </div>

              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── How GEM is built ── */}
      <section className="py-20 lg:py-24 border-b border-zinc-100">
        <div className="gem-container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">The model behind the score</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              We studied what makes great TV.
              <span className="block text-emerald-700">Then we built a model around it.</span>
            </h2>
            <p className="mt-5 text-lg text-zinc-600 max-w-2xl mx-auto">
              GEM wasn&apos;t trained on generic text. It was built by studying the most successful, transcendent pilots in TV history — extracting the signals that separate a breakout from a pass, then turning that into a scoring engine that runs on every script.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                icon: "◈",
                title: "Trained on successful series",
                copy: "We analyzed hundreds of the most commercially and critically successful TV pilots ever made — studying what they got right and why. That body of knowledge is baked into every GEM report.",
              },
              {
                icon: "⟡",
                title: "Thousands of signals per script",
                copy: "GEM doesn't read a script like a reader — it processes thousands of structural, character, commercial, and craft signals simultaneously. The result is analysis that goes far deeper than any single pass can.",
              },
              {
                icon: "◎",
                title: "Built for decision-making",
                copy: "Every output is structured to answer the actual question: does this deserve my attention? You get a clear verdict, a confidence score, and the reasoning behind it — not a summary of what you already read.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div className="text-3xl text-emerald-600 mb-4">{item.icon}</div>
                <div className="text-xl font-semibold text-zinc-950">{item.title}</div>
                <p className="mt-4 text-base leading-7 text-zinc-600">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The real comparison ── */}
      <section className="border-b border-zinc-200 bg-zinc-50">
        <div className="gem-container py-20 lg:py-24">
          <div className="mx-auto max-w-3xl text-center mb-14">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Why GEM wins</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Every other option makes you
              <span className="block">choose a bad tradeoff.</span>
            </h2>
            <p className="mt-5 text-lg text-zinc-600">
              Traditional coverage is expensive and slow. Generic AI tools are fast but shallow and unreliable.
              GEM is the only option built specifically to find what makes TV pilots break through — at a price that doesn&apos;t make you ration your reads.
            </p>
          </div>

          <div className="max-w-2xl mx-auto rounded-[2rem] border border-zinc-200 bg-white overflow-hidden shadow-sm">
            {/* Header */}
            <div className="grid grid-cols-3 bg-zinc-100 px-6 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
              <div>Option</div>
              <div>Quality</div>
              <div>Cost</div>
            </div>

            {/* Competitors (merged) */}
            <div className="grid grid-cols-3 border-t border-zinc-200 px-6 py-5 text-sm text-zinc-600">
              <div className="font-medium text-zinc-800">Coverage readers</div>
              <div>Useful — but one person&apos;s subjective read</div>
              <div>$150–$500 <em>per script</em></div>
            </div>
            <div className="grid grid-cols-3 border-t border-zinc-200 px-6 py-5 text-sm text-zinc-600">
              <div className="font-medium text-zinc-800">Generic AI tools</div>
              <div>Shallow, inconsistent, not built for TV</div>
              <div>Low price, low trust</div>
            </div>

            {/* GEM row — highlighted */}
            <div className="grid grid-cols-3 border-t-2 border-emerald-200 bg-emerald-50 px-6 py-5 text-sm">
              <div className="font-bold text-zinc-950">GEM</div>
              <div className="text-zinc-700">Trained AI — thousands of signals, calibrated to what actually breaks through</div>
              <div className="font-bold text-emerald-700">$49/month<br /><span className="text-xs font-normal text-zinc-500">unlimited scripts</span></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── What you get + Pricing ── */}
      <section className="py-20 lg:py-24">
        <div className="gem-container">
          <div className="grid gap-8 lg:grid-cols-2">

            {/* What you get */}
            <div className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">What you get</div>
              <h3 className="mt-4 text-3xl font-semibold text-zinc-950">A report built for triage, not praise</h3>
              <p className="mt-3 text-zinc-500 text-base">Everything in a GEM report is designed to answer one question: is this worth your time?</p>
              <ul className="mt-6 space-y-4 text-zinc-600">
                {[
                  "A clear verdict — Strong Signal, Worth the Read, Mixed, or Pass — so you know immediately where a script stands",
                  "A Hit Confidence score synthesized from thousands of signals across your script",
                  "Structured reasoning across commercial, character, and craft dimensions",
                  "Upside and risk analysis in plain language — actionable, not vague",
                  "Results in under 5 minutes — evaluate your whole pile, not just what you can afford",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-0.5 shrink-0 text-emerald-600 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing card — dark */}
            <div id="pricing" className="rounded-[2rem] bg-zinc-950 p-8 text-white shadow-xl flex flex-col justify-between">
              <div>
                <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Simple pricing</div>
                <h3 className="mt-4 text-5xl font-bold">$49
                  <span className="text-2xl font-normal text-zinc-400">/month</span>
                </h3>
                <p className="mt-2 text-xl font-semibold text-emerald-300">Unlimited scripts.</p>
                <p className="mt-3 max-w-md text-zinc-400 text-sm leading-relaxed">
                  Not $150 per read. Not a per-script fee that makes you ration your evaluations. One flat price — evaluate every script in your pipeline, all month long.
                </p>

                <div className="mt-8 space-y-3 text-sm text-zinc-200">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-emerald-400">✓</span>
                    <span>Start with 2 free evaluations — no credit card required</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-emerald-400">✓</span>
                    <span>Unlimited script evaluations after subscribing</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-emerald-400">✓</span>
                    <span>For producers, development teams, reps, and serious writers</span>
                  </div>
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                    <span className="text-emerald-400">✓</span>
                    <span>Cancel anytime — no commitment, no catch</span>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <Link
                  href="/auth/signup"
                  className="inline-block rounded-2xl bg-white px-6 py-3.5 font-semibold text-zinc-950 transition hover:opacity-90"
                >
                  Try 2 Scripts Free →
                </Link>
                <p className="mt-4 text-xs text-zinc-500">
                  Coverage readers charge $150–$500 <em>per script</em>.<br />GEM is $49 for the entire month — unlimited reads.
                </p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-zinc-200 bg-zinc-950 text-white">
        <div className="gem-container py-20 text-center lg:py-24">
          <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-400 mb-4">Stop rationing your reads</div>
          <h2 className="text-4xl font-semibold tracking-tight sm:text-5xl">
            Evaluate every script
            <span className="block text-emerald-400">with producer-grade AI.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-lg text-zinc-400">
            $49/month. Unlimited scripts. Analysis trained on what actually makes TV break through —
            not generic AI, not expensive-per-read coverage.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-2xl bg-white px-6 py-3.5 font-semibold text-zinc-950 transition hover:opacity-90"
            >
              Try 2 Scripts Free →
            </Link>
            <Link
              href="/auth/login"
              className="rounded-2xl border border-white/20 px-6 py-3.5 font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-4 text-sm text-zinc-500">No credit card required. Takes 30 seconds to sign up.</p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
