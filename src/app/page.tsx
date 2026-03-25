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

            {/* Left: headline + CTAs + stats */}
            <div>
              <div className="mb-5 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                TV pilot evaluation &mdash; producer-grade, startup pricing
              </div>
              <h1 className="text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl">
                Serious script analysis.
                <span className="block text-emerald-700">Not serious pricing.</span>
              </h1>
              <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-600 sm:text-xl">
                GEM helps producers, development teams, and serious writers evaluate <span className="font-medium text-zinc-800">TV pilot scripts</span> with
                structured, high-quality story intelligence — at a fraction of the cost of
                traditional coverage and competing tools.
              </p>

              <div className="mt-8 flex flex-wrap gap-4">
                <Link
                  href="/auth/signup"
                  className="rounded-2xl bg-zinc-950 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
                >
                  Try 2 Scripts Free
                </Link>
              </div>
              <p className="mt-3 text-sm text-zinc-500">No credit card required &middot; 2 free evaluations &middot; Then $49/month</p>

              <div className="mt-8 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <div className="text-2xl font-semibold text-zinc-950">$49</div>
                  <div className="mt-1 text-sm text-zinc-600">per month</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <div className="text-2xl font-semibold text-zinc-950">Fast</div>
                  <div className="mt-1 text-sm text-zinc-600">Producer-style readout in minutes</div>
                </div>
                <div className="rounded-2xl border border-zinc-200 p-4">
                  <div className="text-2xl font-semibold text-zinc-950">Deep</div>
                  <div className="mt-1 text-sm text-zinc-600">Structured scoring, reasoning, and decision support</div>
                </div>
              </div>
            </div>

            {/* Right: sample report card */}
            <div id="report" className="relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-r from-emerald-100 to-zinc-100 blur-2xl opacity-60" />
              <div className="relative rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-2xl">
                <div className="flex items-center justify-between border-b border-zinc-200 pb-4">
                  <div>
                    <div className="text-sm font-medium text-zinc-500">GEM Analysis Report</div>
                    <div className="mt-1 text-xl font-semibold text-zinc-950">THE LAST BROADCAST</div>
                  </div>
                  <div className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-semibold text-emerald-800">
                    STRONG SIGNAL
                  </div>
                </div>

                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="text-sm text-zinc-500">Hit Confidence</div>
                    <div className="mt-2 text-4xl font-semibold text-zinc-950">83</div>
                    <div className="mt-2 text-sm text-zinc-600">High commercial potential with strong hook clarity and durable character engine.</div>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="text-sm text-zinc-500">Producer Take</div>
                    <div className="mt-2 text-base font-medium text-zinc-900">
                      Clear audience, strong pilot propulsion, and real series viability.
                    </div>
                    <div className="mt-2 text-sm text-zinc-600">Feels like something worth prioritizing, not just something worth admiring.</div>
                  </div>
                </div>

                <div className="mt-6 space-y-3">
                  {[
                    ["Conceptual Hook", "9.1", "Immediate, marketable premise with strong pitchability."],
                    ["Audience Appeal", "8.6", "Broad enough to sell, distinct enough to stand out."],
                    ["Character Engine", "8.4", "Sustained conflict and episode-generation power."],
                    ["Execution Risk", "Low–Moderate", "Ambitious, but still producible with smart packaging."],
                  ].map(([label, score, copy]) => (
                    <div key={label} className="rounded-2xl border border-zinc-200 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="font-semibold text-zinc-900">{label}</div>
                          <div className="mt-1 text-sm text-zinc-600">{copy}</div>
                        </div>
                        <div className="shrink-0 rounded-xl bg-zinc-100 px-3 py-1 text-sm font-semibold text-zinc-800">{score}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── Why producers switch ── */}
      <section className="py-20 lg:py-24">
        <div className="gem-container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">Why producers switch</div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Better than bargain-bin AI.
              <span className="block">Far cheaper than legacy coverage.</span>
            </h2>
            <p className="mt-5 text-lg text-zinc-600">
              GEM is built to feel like a serious development tool: structured, commercial, and
              actually useful in decision-making. Not to generate fluff — to help you decide
              what deserves your attention.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Sharper analysis",
                copy: "Producer-style scoring and reasoning designed to surface what matters: hook, audience, character engine, execution risk, and commercial viability — calibrated against the most transcendent pilots ever made.",
              },
              {
                title: "Lower cost",
                copy: "At $49/month, GEM costs less than a single traditional coverage read and dramatically less than high-priced analysis platforms. Evaluate every script in your pile, not just the ones you can afford to.",
              },
              {
                title: "Actually actionable",
                copy: "Every report is built to support triage, prioritization, and development judgment — not just summarize the script back to you. Read the signal, then decide if it's worth your time.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div className="text-xl font-semibold text-zinc-950">{item.title}</div>
                <p className="mt-4 text-base leading-7 text-zinc-600">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The value case ── */}
      <section className="border-y border-zinc-200 bg-zinc-50">
        <div className="gem-container py-20 lg:py-24">
          <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700">The value case</div>
              <h2 className="mt-4 text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
                Why pay premium prices
                <span className="block">for slower, weaker insight?</span>
              </h2>
              <p className="mt-5 max-w-2xl text-lg text-zinc-600">
                Most alternatives force a bad tradeoff: either cheap but shallow, or expensive
                enough that you only use them sparingly. GEM breaks that tradeoff.
              </p>
            </div>

            <div className="rounded-[2rem] border border-zinc-200 bg-white p-6 shadow-sm">
              <div className="overflow-hidden rounded-2xl border border-zinc-200">
                <div className="grid grid-cols-3 bg-zinc-100 px-4 py-3 text-sm font-semibold text-zinc-700">
                  <div>Option</div>
                  <div>Quality</div>
                  <div>Cost</div>
                </div>
                {[
                  ["Traditional coverage", "Useful, but slow and expensive", "$50–$500 per read"],
                  ["Generic AI tools", "Fast, but shallow and inconsistent", "Cheap, but low trust"],
                  ["GEM", "Structured, commercial, producer-minded", "$49/month"],
                ].map((row) => (
                  <div
                    key={row[0]}
                    className={`grid grid-cols-3 border-t border-zinc-200 px-4 py-4 text-sm text-zinc-700 ${row[0] === "GEM" ? "bg-zinc-50" : ""}`}
                  >
                    <div className={row[0] === "GEM" ? "font-semibold text-zinc-950" : "font-medium text-zinc-900"}>{row[0]}</div>
                    <div>{row[1]}</div>
                    <div className={row[0] === "GEM" ? "font-semibold text-emerald-700" : ""}>{row[2]}</div>
                  </div>
                ))}
              </div>
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
              <h3 className="mt-4 text-3xl font-semibold text-zinc-950">A report that helps you make decisions</h3>
              <ul className="mt-6 space-y-4 text-zinc-600">
                {[
                  "Weighted scoring across 10 dimensions that predict transcendence",
                  "Clear verdict and signal strength — Strong Signal down to Pass",
                  "Dimension-by-dimension reasoning, not vague praise or filler",
                  "Commercially minded assessment of audience and market viability",
                  "Fast turnaround — under 5 minutes — for triage across more scripts",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 text-emerald-600">&#10003;</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Pricing card — dark */}
            <div id="pricing" className="rounded-[2rem] bg-zinc-950 p-8 text-white shadow-xl">
              <div className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-300">Simple pricing</div>
              <h3 className="mt-4 text-4xl font-semibold">$49<span className="text-2xl font-normal text-zinc-400">/month</span></h3>
              <p className="mt-4 max-w-md text-zinc-300">
                Built for producers and development teams who want high-quality script intelligence
                without paying per-read fees that add up fast.
              </p>
              <div className="mt-8 space-y-3 text-sm text-zinc-200">
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Start with 2 free evaluations — no credit card required</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Unlimited script evaluations after subscribing</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Ideal for producers, dev teams, reps, and serious writers</div>
                <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">Cancel anytime — no long-term commitment</div>
              </div>
              <div className="mt-8">
                <Link
                  href="/auth/signup"
                  className="rounded-2xl bg-white px-6 py-3 font-semibold text-zinc-950 transition hover:opacity-90"
                >
                  Try 2 Scripts Free
                </Link>
              </div>
              <p className="mt-5 text-xs text-zinc-500">
                Coverage readers charge $200–500 <em>per script</em>. GEM is $49 for the whole month.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="border-t border-zinc-200 bg-white">
        <div className="gem-container py-20 text-center lg:py-24">
          <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
            The smarter script tool
            <span className="block text-emerald-700">for people who actually have to choose.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-zinc-600">
            Don&apos;t overpay for coverage. Don&apos;t settle for shallow AI.
            Use GEM to evaluate more scripts with better judgment.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-2xl bg-zinc-950 px-6 py-3 font-semibold text-white transition hover:opacity-90"
            >
              Try 2 Scripts Free
            </Link>
            <Link
              href="/auth/login"
              className="rounded-2xl border border-zinc-300 px-6 py-3 font-semibold text-zinc-800 transition hover:bg-zinc-50"
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
