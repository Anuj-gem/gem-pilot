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
            Submit your script. Get real feedback. Get discovered.
          </h1>
          <p className="mt-6 text-xl leading-8 text-zinc-600">
            GEM uses AI to evaluate every submission across 10 dimensions — the same framework used by top development teams.
            <br />
            <span className="font-semibold text-zinc-900">Free for every writer. No catch.</span>
          </p>
          <div className="mt-8">
            <Link
              href="/auth/signup"
              className="inline-block rounded-2xl bg-zinc-950 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Submit Your Script
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-400">Free detailed feedback on every script you submit</p>
        </div>
      </section>

      {/* ── 2. What GEM Is ── */}
      <section className="bg-zinc-950 text-white py-20 lg:py-24">
        <div className="gem-container max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-6">What GEM is</p>
          <h2 className="text-3xl font-semibold sm:text-4xl leading-snug">
            We&apos;re a production company looking for the best undiscovered scripts in the world.
          </h2>
          <div className="mt-8 space-y-4 text-left max-w-lg mx-auto">
            <div className="flex items-start gap-4">
              <span className="mt-1 shrink-0 text-zinc-500 text-lg leading-none">&mdash;</span>
              <p className="text-zinc-300 text-lg">Every writer who submits gets detailed, honest feedback — scored across the same 10 dimensions that predict whether a show breaks out.</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="mt-1 shrink-0 text-zinc-500 text-lg leading-none">&mdash;</span>
              <p className="text-zinc-300 text-lg">The scripts that stand out get seen by our development team. We&apos;re looking for projects to produce.</p>
            </div>
          </div>
          <p className="mt-10 text-xl text-zinc-100 font-medium">
            Great writing deserves to be found — not buried in a slush pile.
          </p>
        </div>
      </section>

      {/* ── 3. How It Works ── */}
      <section className="py-20 lg:py-24 border-b border-zinc-100">
        <div className="gem-container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">How it works</p>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Submit. Get feedback. Get discovered.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
            {[
              {
                step: "01",
                title: "Submit your pilot script",
                copy: "Upload a PDF or text file. Our AI reads the full script and evaluates it across 10 critical dimensions.",
              },
              {
                step: "02",
                title: "Get detailed feedback in minutes",
                copy: "Every writer gets a full report — what's working, what needs development, and where your script ranks. Honest and constructive.",
              },
              {
                step: "03",
                title: "Stand out and get seen",
                copy: "Scripts that score highest get flagged for human review by our development team. We're actively looking for projects to produce.",
              },
            ].map((item) => (
              <div key={item.step} className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div className="text-xs font-mono font-bold text-emerald-600 mb-3">{item.step}</div>
                <div className="text-xl font-semibold text-zinc-950">{item.title}</div>
                <p className="mt-4 text-base leading-7 text-zinc-500">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Sample Feedback Output ── */}
      <section className="py-20 lg:py-24 bg-zinc-50 border-b border-zinc-100">
        <div className="gem-container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">What you&apos;ll get</p>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Feedback that actually helps you improve.
            </h2>
            <p className="mt-5 text-lg text-zinc-500 max-w-xl mx-auto">
              Not a form letter. Not a vague &ldquo;pass.&rdquo; A real analysis of your script&apos;s strengths and what to work on next.
            </p>
          </div>

          {/* Feedback card mockup */}
          <div className="max-w-xl mx-auto rounded-[2rem] border border-zinc-200 bg-white shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-zinc-950 px-6 py-5 flex items-center justify-between">
              <div>
                <div className="text-xs font-medium uppercase tracking-widest text-zinc-400">GEM Feedback Report</div>
                <div className="mt-1 text-lg font-semibold text-white">THE LAST BROADCAST</div>
              </div>
              <div className="rounded-full bg-emerald-500 px-4 py-1.5 text-sm font-bold text-white">
                GEM SELECT
              </div>
            </div>

            {/* Verdict line */}
            <div className="px-6 py-5 border-b border-zinc-100">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-2">Our read</div>
              <p className="text-zinc-900 text-base font-medium leading-snug">
                A sharp, original voice with a concept that hooks immediately. This is the kind of script we look for.
              </p>
            </div>

            {/* Signal rows */}
            <div className="px-6 py-5 space-y-3">
              <div className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-3">Your strengths</div>
              {[
                { label: "Conceptual hook", value: "Exceptional", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { label: "Tonal voice", value: "Distinctive", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { label: "Character depth", value: "Strong", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { label: "Series potential", value: "High", color: "text-emerald-700 bg-emerald-50 border-emerald-200" },
                { label: "Pacing", value: "Room to tighten", color: "text-amber-700 bg-amber-50 border-amber-200" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-sm text-zinc-600">{label}</span>
                  <span className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${color}`}>{value}</span>
                </div>
              ))}
            </div>

            {/* Quote */}
            <div className="bg-zinc-50 border-t border-zinc-100 px-6 py-4">
              <p className="text-sm text-zinc-500 italic">
                &ldquo;This script has a voice that&apos;s hard to forget. The kind of writing we want to help get made.&rdquo;
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Why GEM ── */}
      <section className="py-20 lg:py-24 border-b border-zinc-100">
        <div className="gem-container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">Why submit to GEM</p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                title: "Real feedback, not silence",
                copy: "Most submissions disappear into a void. At GEM, every writer gets a detailed breakdown — what's working, what needs work, and exactly where to focus.",
              },
              {
                title: "A fair shot at being discovered",
                copy: "We read everything. Our AI ensures no great script gets buried because the right person didn't happen to pick it up. Talent is talent.",
              },
              {
                title: "A production company, not just a tool",
                copy: "GEM isn't a coverage service. We're actively looking for projects to develop and produce. When we find something great, we reach out.",
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

      {/* ── 6. Social Proof ── */}
      <section className="py-20 lg:py-24 bg-zinc-50 border-b border-zinc-100">
        <div className="gem-container max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">Our track record</p>
          <div className="text-7xl font-bold text-zinc-950">1B+</div>
          <div className="mt-1 text-2xl font-medium text-zinc-500">views on our content</div>
          <p className="mt-6 text-zinc-500 leading-relaxed">
            We know what resonates with audiences. Now we&apos;re using that expertise — and our AI — to find the next generation of breakout writers.
          </p>
        </div>
      </section>

      {/* ── 7. Final CTA ── */}
      <section className="bg-zinc-950 text-white py-20 lg:py-24">
        <div className="gem-container max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-semibold sm:text-5xl tracking-tight">
            Your script deserves<br />
            <span className="text-emerald-400">to be read.</span>
          </h2>
          <p className="mt-5 text-zinc-400 text-lg">
            Free feedback. A real shot at development. No gatekeepers.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/signup"
              className="rounded-2xl bg-white px-8 py-3.5 font-semibold text-zinc-950 transition hover:opacity-90"
            >
              Submit Your Script
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
