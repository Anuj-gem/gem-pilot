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
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-6">
            Open call &mdash; no submission fee
          </p>
          <h1 className="text-5xl font-semibold tracking-tight text-zinc-950 sm:text-6xl leading-[1.1]">
            We&apos;re looking for the best undiscovered scripts in the world.
          </h1>
          <p className="mt-6 text-xl leading-8 text-zinc-600">
            Submit your pilot script. Every submission gets a personalized review — honest feedback through the lens of a producer who has to decide whether to make it.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/auth/signup"
              className="inline-block rounded-2xl bg-zinc-950 px-8 py-3.5 text-base font-semibold text-white shadow-sm transition hover:opacity-90"
            >
              Submit Your Script
            </Link>
          </div>
          <p className="mt-3 text-sm text-zinc-400">Free &middot; Personalized review delivered within 24 hours</p>
        </div>
      </section>

      {/* ── 2. What GEM Is ── */}
      <section className="bg-zinc-950 text-white py-20 lg:py-24">
        <div className="gem-container max-w-2xl mx-auto text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400 mb-6">What GEM is</p>
          <h2 className="text-3xl font-semibold sm:text-4xl leading-snug">
            A production company with a point of view, not a coverage service.
          </h2>
          <div className="mt-8 space-y-4 text-left max-w-lg mx-auto">
            <div className="flex items-start gap-4">
              <span className="mt-1 shrink-0 text-zinc-500 text-lg leading-none">&mdash;</span>
              <p className="text-zinc-300 text-lg">We actively develop and produce projects we believe in. When we read your script, we&apos;re asking one question: is this something we want to make?</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="mt-1 shrink-0 text-zinc-500 text-lg leading-none">&mdash;</span>
              <p className="text-zinc-300 text-lg">Every submission gets a real read through the lens of a producer who has to decide whether to make it. You get the honest take most writers spend years trying to access.</p>
            </div>
            <div className="flex items-start gap-4">
              <span className="mt-1 shrink-0 text-zinc-500 text-lg leading-none">&mdash;</span>
              <p className="text-zinc-300 text-lg">Scripts that stand out get taken further. We have production partnerships specifically to move the right material forward.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 3. What We Look For ── */}
      <section className="py-20 lg:py-24 border-b border-zinc-100">
        <div className="gem-container max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">What we look for</p>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Wild. Original. Undeniable.
            </h2>
            <p className="mt-5 text-lg text-zinc-500 max-w-xl mx-auto">
              We are not looking for safe. We are looking for scripts with a genuine point of view — work that couldn&apos;t have been written by committee and couldn&apos;t have been written by anyone else.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {[
              {
                title: "A real voice",
                copy: "Tonal specificity. A distinct perspective. The kind of writing where you know whose work it is from the first page.",
              },
              {
                title: "Something that has to exist",
                copy: "Not another version of something. The thing that fills a gap you didn't know was there until you read it.",
              },
              {
                title: "The craft to pull it off",
                copy: "Bold choices only work when the execution earns them. We want scripts that take risks and land.",
              },
            ].map((item) => (
              <div key={item.title} className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div className="text-lg font-semibold text-zinc-950 mb-3">{item.title}</div>
                <p className="text-sm leading-7 text-zinc-500">{item.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. How It Works ── */}
      <section className="py-20 lg:py-24 bg-zinc-50 border-b border-zinc-100">
        <div className="gem-container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">How it works</p>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Submit. We review. You get the real take.
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-3 max-w-3xl mx-auto">
            {[
              {
                step: "01",
                title: "Submit your pilot script",
                copy: "Upload a PDF or text file. Your script goes into review — you\u2019ll see it as pending in your dashboard.",
              },
              {
                step: "02",
                title: "We read it",
                copy: "Your script gets a full read through a production lens — what\u2019s working, what\u2019s not, what would move this forward. Real notes from someone who has to decide whether to make it.",
              },
              {
                step: "03",
                title: "Your review lands in 24 hours",
                copy: "You get an honest producer\u2019s read \u2014 what\u2019s working, why we\u2019re passing or moving forward, and the inside view most writers never get.",
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

      {/* ── 5. The Review ── */}
      <section className="py-20 lg:py-24 border-b border-zinc-100">
        <div className="gem-container">
          <div className="text-center mb-14">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-700 mb-4">What you receive</p>
            <h2 className="text-4xl font-semibold tracking-tight text-zinc-950 sm:text-5xl">
              Not coverage. A producer&apos;s honest take.
            </h2>
            <p className="mt-5 text-lg text-zinc-500 max-w-xl mx-auto">
              We tell you what&apos;s genuinely working, why we&apos;re passing if we are, and the real commercial and creative picture of your project &mdash; the inside baseball most writers spend years trying to piece together.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 max-w-3xl mx-auto">
            {[
              {
                label: "What\u2019s working",
                desc: "The genuine strengths in your script \u2014 the elements that stand out and why they matter to someone deciding whether to make it.",
              },
              {
                label: "Why we\u2019re passing",
                desc: "If we\u2019re not moving forward, you\u2019ll know exactly why. Is it the writing, the market, the budget reality, the timing? You deserve a real answer.",
              },
              {
                label: "The producer lens",
                desc: "Budget tier, buyer fit, what attachment would move this \u2014 the commercial picture of your project that most writers never see.",
              },
              {
                label: "What to focus on next",
                desc: "The single highest-leverage thing you could do to make this script \u2014 or your next one \u2014 closer to something we\u2019d develop.",
              },
            ].map((item) => (
              <div key={item.label} className="rounded-[2rem] border border-zinc-200 bg-white p-8 shadow-sm">
                <div className="text-base font-semibold text-zinc-950 mb-2">{item.label}</div>
                <p className="text-sm leading-7 text-zinc-500">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 6. Track Record ── */}
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

      {/* ── 7. Final CTA ── */}
      <section className="bg-zinc-950 text-white py-20 lg:py-24">
        <div className="gem-container max-w-2xl mx-auto text-center">
          <h2 className="text-4xl font-semibold sm:text-5xl tracking-tight">
            If you&apos;ve written something<br />
            <span className="text-emerald-400">worth making, we want to read it.</span>
          </h2>
          <p className="mt-5 text-zinc-400 text-lg">
            Free. Personalized. Delivered within 24 hours.
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
