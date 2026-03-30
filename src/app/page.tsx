import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-zinc-900">
      <Navbar />

      {/* ── 1. Hero — upload-forward ── */}
      <section className="relative overflow-hidden border-b border-zinc-200 bg-white">
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-50 to-white" />
        <div className="relative gem-container py-24 lg:py-32 text-center max-w-3xl mx-auto">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-6">
            Free script analysis
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl leading-[1.1]">
            Find the right home<br />for your script.
          </h1>
          <p className="mt-6 text-xl leading-8 text-zinc-600">
            Upload your script and get a personalized report — detailed feedback plus a curated list of production companies that are the best fit for your project.
          </p>
          <div className="mt-10 flex justify-center">
            <Link
              href="/upload"
              className="inline-flex items-center gap-3 rounded-2xl bg-zinc-950 px-10 py-4 text-lg font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Upload Your Script
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-400">PDF, TXT, or Fountain &middot; Free &middot; Results in minutes</p>
        </div>
      </section>

      {/* ── 2. What You Get ── */}
      <section className="bg-zinc-950 text-white py-20 lg:py-24">
        <div className="gem-container max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-6">What you get</p>
          <h2 className="text-3xl font-semibold sm:text-4xl leading-snug">
            A producer&apos;s read of your script — plus a plan for what to do with it.
          </h2>
          <div className="mt-10 space-y-4 text-left max-w-lg mx-auto">
            <div className="flex items-start gap-4">
              <span className="mt-1 shrink-0 text-emerald-500 text-lg leading-none">&#10003;</span>
              <p className="text-zinc-300 text-lg">Detailed creative analysis across 10 dimensions — where your script shines and where it needs work.</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="mt-1 shrink-0 text-emerald-500 text-lg leading-none">&#10003;</span>
              <p className="text-zinc-300 text-lg">Production company matches — a curated shortlist of companies whose slate, genre focus, and budget range align with your project.</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="mt-1 shrink-0 text-emerald-500 text-lg leading-none">&#10003;</span>
              <p className="text-zinc-300 text-lg">Development guidance — the honest, specific feedback that tells you exactly what to focus on next.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. How It Works ── */}
      <section className="py-20 lg:py-24 bg-zinc-50 border-b border-zinc-100">
        <div className="gem-container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">How it works</p>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Upload. Analyze. Connect.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
            {[
              {
                step: "01",
                title: "Upload your script",
                copy: "Drop in your screenplay or pilot — PDF, text, or Fountain format. Film or TV.",
              },
              {
                step: "02",
                title: "Get your report",
                copy: "Our engine reads your script and scores it across 10 creative and commercial dimensions. You get the honest take.",
              },
              {
                step: "03",
                title: "See your matches",
                copy: "Based on your script's genre, tone, and budget profile, we surface the production companies most likely to respond to your project — with the reasoning behind each match.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div className="text-xs font-mono font-bold text-emerald-600 mb-3">{item.step}</div>
                <div className="text-xl font-semibold text-zinc-950 mb-3">{item.title}</div>
                <p className="text-sm leading-7 text-zinc-500">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. The Gap ── */}
      <section className="py-20 lg:py-24 border-b border-zinc-100">
        <div className="gem-container max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">The problem we solve</p>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Most writers don&apos;t need to write better.<br />
              They need to find the right door.
            </h2>
            <p className="mt-5 text-lg text-zinc-500 max-w-xl mx-auto">
              The difference between a script that gets made and one that doesn&apos;t is often targeting — knowing which companies are actively looking for what you&apos;ve written. That intelligence used to live only inside agencies. Now it&apos;s here.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              {
                label: "Without GEM",
                items: [
                  "Blast emails to every production company you can find",
                  "Get passed on by companies with conflicting projects",
                  "No idea why you're being rejected",
                  "Months of silence",
                ],
                dark: false,
              },
              {
                label: "With GEM",
                items: [
                  "5 targeted companies matched to your specific script",
                  "Conflict-checked against current development slates",
                  "Clear reasoning for every recommendation",
                  "Know exactly how to approach each one",
                ],
                dark: true,
              },
            ].map((col) => (
              <div
                key={col.label}
                className={`rounded-[2rem] p-8 ${
                  col.dark
                    ? "bg-zinc-950 text-white"
                    : "border border-zinc-200 bg-white"
                }`}
              >
                <div className={`text-sm font-semibold uppercase tracking-[0.15em] mb-5 ${
                  col.dark ? "text-emerald-400" : "text-zinc-400"
                }`}>
                  {col.label}
                </div>
                <ul className="space-y-3">
                  {col.items.map((item) => (
                    <li key={item} className={`flex items-start gap-3 text-sm leading-relaxed ${
                      col.dark ? "text-zinc-300" : "text-zinc-500"
                    }`}>
                      <span className={`mt-0.5 shrink-0 ${col.dark ? "text-emerald-400" : "text-zinc-300"}`}>
                        {col.dark ? "✓" : "—"}
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Track Record ── */}
      <section className="py-20 lg:py-24 bg-zinc-50 border-b border-zinc-100">
        <div className="gem-container max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">Why trust our read</p>
          <div className="text-7xl font-bold text-zinc-950">1B+</div>
          <div className="mt-1 text-2xl font-medium text-zinc-500">views on content we&apos;ve produced</div>
          <p className="mt-6 text-zinc-500 leading-relaxed max-w-lg mx-auto">
            We didn&apos;t learn what audiences respond to in a development meeting. We learned it by building content that found massive audiences — without a studio, without a network, and without asking permission. That&apos;s the lens we bring to your script.
          </p>
        </div>
      </section>

      {/* ── 6. Final CTA ── */}
      <section className="bg-zinc-950 text-white py-20 lg:py-24">
        <div className="gem-container max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-semibold sm:text-5xl tracking-tight">
            Stop guessing.<br />
            <span className="text-emerald-400">Start targeting.</span>
          </h2>
          <p className="mt-5 text-zinc-400 text-lg">
            Upload your script. Get your report. Find your companies.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/upload"
              className="rounded-2xl bg-white px-8 py-3.5 font-semibold text-zinc-950 transition hover:opacity-90"
            >
              Upload Your Script
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
