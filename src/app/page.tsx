import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900">
      <Navbar />

      {/* ── 1. Hero ── */}
      <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 to-white" />
        <div className="relative gem-container py-24 lg:py-32 text-center max-w-3xl mx-auto">
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl leading-[1.1]">
            AI script analysis for producers and development teams
          </h1>
          <p className="mt-6 text-xl leading-8 text-zinc-600">
            Find breakout scripts faster. Skip weak ones earlier.<br />
            <span className="font-semibold text-zinc-900">Just $49/month unlimited</span> — far cheaper than traditional coverage.
          </p>
          <div className="mt-8">
            <Link
              href="/auth/signup"
              className="inline-block rounded-2xl bg-zinc-950 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Try GEM Free
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-400">No credit card required &middot; 2 free evaluations included</p>
        </div>
      </section>

      {/* ── 2. Pain / Problem ── */}
      <section className="bg-zinc-950 text-white py-20 lg:py-24">
        <div className="gem-container max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-6">The problem with read piles</p>
          <h2 className="text-3xl font-semibold sm:text-4xl leading-snug">
            Most read piles have two problems.
          </h2>
          <div className="mt-8 space-y-4 text-left max-w-lg mx-auto">
            <div className="flex items-start gap-4">
              <span className="mt-1 shrink-0 text-zinc-500 text-lg leading-none">—</span>
              <p className="text-zinc-300 text-lg">The standout script is easy to miss.</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="mt-1 shrink-0 text-zinc-500 text-lg leading-none">—</span>
              <p className="text-zinc-300 text-lg">Too much time gets wasted on scripts that were never worth serious attention.</p>
            </div>
          </div>
          <p className="mt-10 text-xl text-zinc-100 font-medium">
            GEM is built to help solve both.
          </p>
        </div>
      </section>

      {/* ── 3. GEM vs Traditional Coverage ── */}
      <section className="py-20 lg:py-24 border-b border-zinc-100">
        <div className="gem-container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">Why GEM instead of traditional coverage</p>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              A better way to work through a read pile.
            </h2>
          </div>

          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Traditional */}
            <div className="rounded-[2rem] border border-zinc-200 bg-zinc-50 p-8">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-5">Traditional Coverage</div>
              <ul className="space-y-4">
                {[
                  "Pay per script — costs add up fast",
                  "Slow turnaround",
                  "Inconsistent quality, reader to reader",
                  "Often more summary than signal",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-zinc-600">
                    <span className="mt-1 shrink-0 text-zinc-300 font-bold">✗</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* GEM */}
            <div className="rounded-[2rem] border border-emerald-200 bg-emerald-50 p-8">
              <div className="text-xs font-semibold uppercase tracking-widest text-emerald-700 mb-5">GEM</div>
              <ul className="space-y-4">
                {[
                  "$49/month — unlimited scripts",
                  "Instant analysis, every time",
                  "Built to surface breakout potential",
                  "Helps you rule out weak scripts early",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-zinc-700">
                    <span className="mt-1 shrink-0 text-emerald-600 font-bold">✓</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <p className="text-center mt-10 text-zinc-500 text-sm">
            Coverage readers charge $150–$500 <em>per script</em>. GEM is $49 for the entire month.
          </p>
        </div>
      </section>

      {/* ── 4. Sample Decision Output ── */}
      <section className="py-20 lg:py-24 bg-zinc-50 border-b border-zinc-100">
        <div className="gem-container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">What GEM tells you</p>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Built to help you decide.<br />Not just analyze.
            </h2>
            <p className="mt-5 text-lg text-zinc-500 max-w-xl mx-auto">
              Every GEM report answers the question that actually matters: is this worth my time?
            </p>
          </div>

          {/* Decision card mockup */}
          <div className="max-w-xl mx-auto rounded-[2rem] border border-zinc-200 bg-white shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-zinc-950 px-6 py-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-widest text-zinc-400">GEM Analysis</div>
                <div className="mt-1 text-lg font-semibold text-white">THE LAST BROADCAST</div>
              </div>
              <div className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-bold text-white">
                STRONG SIGNAL
              </div>
            </div>

            {/* Verdict line */}
            <div className="px-6 py-5 border-b border-zinc-100">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Bottom line</div>
              <p className="text-zinc-900 text-base font-medium leading-snug">
                Worth serious attention. Strong hook, clear audience, real series viability.
              </p>
            </div>

            {/* Signal rows */}
            <div className="px-6 py-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Key signals</div>
              {[
                { label: "Breakout potential", value: "High", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { label: "Commercial signal", value: "High", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { label: "Hook strength", value: "Strong", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { label: "Series longevity", value: "Strong", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { label: "Execution risk", value: "Low–Moderate", color: "text-amber-700 bg-amber-50 border-amber-200" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600">{label}</span>
                  <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Ruling */}
            <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4">
              <p className="text-sm text-zinc-500 italic">
                &ldquo;Feels like something worth prioritizing, not just something worth admiring.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. 3-Card Benefits ── */}
      <section className="py-20 lg:py-24 border-b border-zinc-100">
        <div className="gem-container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">What GEM is built to do</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Surface breakout material",
                copy: "Identify scripts with real hook, upside, and commercial potential — before they get buried in the pile.",
              },
              {
                title: "Kill weak scripts early",
                copy: "See quickly when a script likely isn't worth deeper attention. Stop spending time on reads that go nowhere.",
              },
              {
                title: "Scale across the pile",
                copy: "Use GEM on every script without paying per read. Evaluate more, miss less, spend your attention where it counts.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div className="text-xl font-semibold text-zinc-950">{item.title}</div>
                <p className="mt-4 text-base leading-7 text-zinc-500">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Pricing ── */}
      <section id="pricing" className="py-20 lg:py-24 bg-zinc-50 border-b border-zinc-100">
        <div className="gem-container max-w-lg mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">Pricing</p>
          <div className="text-7xl font-bold text-zinc-950">$49</div>
          <div className="mt-1 text-2xl font-medium text-zinc-500">/month</div>
          <div className="mt-3 text-xl font-semibold text-emerald-700">Unlimited scripts.</div>

          <p className="mt-6 text-zinc-500 leading-relaxed">
            Use GEM as a first-pass filter across your entire read pile.<br />
            No more paying script by script just to figure out what&apos;s worth reading.
          </p>

          <div className="mt-8">
            <Link
              href="/auth/signup"
              className="inline-block rounded-2xl bg-zinc-950 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Try GEM Free
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-400">No credit card required &middot; 2 free evaluations &middot; Cancel anytime</p>
        </div>
      </section>

      {/* ── 7. Final CTA ── */}
      <section className="bg-zinc-950 text-white py-20 lg:py-24">
        <div className="gem-container max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-semibold sm:text-5xl tracking-tight">
            Find breakout scripts faster.<br />
            <span className="text-emerald-400">Skip weak ones earlier.</span>
          </h2>
          <p className="mt-5 text-zinc-400 text-lg">
            $49/month. Unlimited scripts. No per-read fees.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-2xl bg-white px-8 py-3.5 font-semibold text-zinc-950 transition hover:opacity-90"
            >
              Try GEM Free
            </Link>
            <Link
              href="/auth/login"
              className="rounded-2xl border border-white/20 px-8 py-3.5 font-semibold text-zinc-300 transition hover:bg-white/10"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
