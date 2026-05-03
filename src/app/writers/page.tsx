// /writers — the writer product page.
// v0.13.0 messaging-v3. Evaluation + opportunities value prop.
// Replaces community/peer-review framing with opportunity matching.

import Link from 'next/link'
import Nav from '@/components/nav'
import { ArrowRight, Check, Sparkles, Eye, Target } from 'lucide-react'

export const metadata = {
  title: 'For writers — GEM',
  description:
    'Unlimited script evaluations. Real industry opportunities. Upload your screenplay, get a structured evaluation in under a minute, then match to opportunities from producers, reps, and financiers.',
}

export default function WritersPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 pb-24">
        {/* HERO */}
        <div className="mb-12 sm:mb-16">
          <p
            className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-3"
            style={{ color: 'var(--gem-gold)' }}
          >
            For writers
          </p>
          <h1 className="text-[36px] sm:text-[52px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-[1.05] m-0 mb-5 font-[family-name:var(--font-display)]">
            Unlimited script evaluations. Real industry opportunities.
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[var(--gem-gray-200)] leading-[1.55] m-0 mb-7 max-w-[60ch]">
            Upload your screenplay. In under a minute, get a structured
            evaluation covering every dimension a producer weighs &mdash;
            characters, packaging, budget, the honest development notes. Then
            match to active opportunities from producers, reps, and financiers
            who are looking for exactly your kind of work. First evaluation free.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/submit"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-lg text-[15px] font-semibold text-white"
              style={{
                background: 'var(--gem-accent)',
                boxShadow: '0 2px 10px rgba(124,58,237,0.30)',
              }}
            >
              Get my free evaluation
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/selznick"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-lg text-[15px] font-semibold border transition-colors hover:border-[var(--gem-gold)] hover:text-[var(--gem-gold)]"
              style={{
                borderColor: 'var(--gem-gray-700)',
                background: '#fff',
                color: 'var(--gem-gray-50)',
              }}
            >
              How GEM evaluates scripts
            </Link>
          </div>
        </div>

        {/* FREE TIER */}
        <Section eyebrow="The free tier" title="One full evaluation. Yours forever.">
          <div className="grid sm:grid-cols-3 gap-3">
            <TrialBlock
              icon={<Sparkles size={16} />}
              label="Full evaluation"
              body="Upload your first screenplay free. Full report, full score, no paywall. The same evaluation Pro members get."
            />
            <TrialBlock
              icon={<Eye size={16} />}
              label="Sharable URL"
              body="Send your report link to anyone — agents, producers, friends. They see the same report you see."
            />
            <TrialBlock
              icon={<Target size={16} />}
              label="See your matches"
              body="Even free, you can see which active opportunities your script qualifies for. Pro unlocks submissions."
            />
          </div>
        </Section>

        {/* WHAT'S IN THE REPORT */}
        <Section eyebrow="The evaluation" title="Every dimension a producer weighs.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            Every GEM evaluation produces a structured report covering the
            same axes a producer would weigh in a development meeting. Full
            access, no upsell to read your own work.
          </p>
          <div className="space-y-3">
            <ReportBlock
              number="01"
              title="Headline + Why this is a hit"
              body="A sharpened version of your premise plus the strongest commercial case — the pitch a manager could forward verbatim."
            />
            <ReportBlock
              number="02"
              title="Cast"
              body="Lead and supporting characters with the actor-want angle: who chases this part, what performance it pulls from."
            />
            <ReportBlock
              number="03"
              title="Packaging"
              body="Audience target, budget tier (per-episode for series), franchise potential."
            />
            <ReportBlock
              number="04"
              title="Project complexity"
              body="What a producer would plan for on production and casting — the lift, the dependencies, the heads-up."
            />
            <ReportBlock
              number="05"
              title="Development considerations"
              body="The sharpest lever and every other note a buyer would weigh before saying yes."
            />
            <ReportBlock
              number="06"
              title="GEM Score"
              body="One number for fast triage. But the substance is the report underneath."
            />
          </div>
        </Section>

        {/* HOW OPPORTUNITIES WORK */}
        <Section eyebrow="Opportunities" title="Your script matches to real opportunities. Automatically.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            Every active opportunity on GEM has specific requirements &mdash;
            genre, format, budget tier, minimum score. When your script meets
            the criteria, it qualifies. You decide whether to submit. No query
            letters. No entry fees. No waiting months for a form rejection.
          </p>
          <div className="space-y-5">
            <FlowCard
              caption="Industry partners post what they're looking for"
              body="Producers, lit reps, talent reps, and financiers list active opportunities — option deals, purchases, representation, production financing. Each with specific requirements."
              visual={<OpportunitiesListMock />}
            />
            <FlowCard
              caption="GEM checks your script against every opportunity"
              body="The moment your evaluation completes, GEM matches your script's qualities against all active opportunities. Qualifying matches appear on your dashboard."
              visual={<DashboardMatchMock />}
            />
            <FlowCard
              caption="Review the opportunity. Submit your qualifying script."
              body="Read what the buyer is looking for. If your script fits, submit. They get your full evaluation and writer profile."
              visual={<SubmitMock />}
            />
          </div>
        </Section>

        {/* GEM PRO */}
        <Section eyebrow="GEM Pro" title="$20/mo. Unlimited everything.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            One free eval gets you in the door. Pro keeps it open &mdash; unlimited
            scripts, unlimited opportunity submissions, revisions and rescores, and a
            full profile visible to every industry partner on the platform.
          </p>
          <div
            className="rounded-2xl px-6 sm:px-8 py-7"
            style={{
              border: '1.5px solid var(--gem-accent)',
              background:
                'linear-gradient(135deg, rgba(124,58,237,0.06), rgba(124,58,237,0.02) 65%), #fff',
            }}
          >
            <div className="flex items-baseline gap-2 mb-5">
              <span className="text-[40px] font-extrabold tabular-nums text-[var(--gem-gray-50)]">
                $20
              </span>
              <span className="text-[15px] text-[var(--gem-gray-500)] font-medium">
                / month &middot; cancel anytime
              </span>
            </div>
            <ul className="grid sm:grid-cols-2 gap-x-5 gap-y-2.5 list-none m-0 p-0">
              <ProBullet>Unlimited script evaluations</ProBullet>
              <ProBullet>Submit to every opportunity you qualify for</ProBullet>
              <ProBullet>Revise and rescore any script</ProBullet>
              <ProBullet>Full writer profile visible to industry</ProBullet>
              <ProBullet>Priority in opportunity matching</ProBullet>
              <ProBullet>Branded PDF download of every report</ProBullet>
            </ul>
            <div className="mt-7">
              <Link
                href="/submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--gem-accent)' }}
              >
                Start with a free evaluation
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          {/* Competitor comparison */}
          <div
            className="mt-5 rounded-xl px-5 py-4"
            style={{
              background: 'rgba(255,255,255,0.02)',
              border: '1px solid var(--gem-gray-700)',
            }}
          >
            <p className="text-[13.5px] text-[var(--gem-gray-300)] leading-[1.6] m-0">
              The Blacklist charges $100 per evaluation. Competitions charge
              $50-80 per entry and take months. Coverage services run $75-150
              per read. GEM Pro: unlimited everything, $20/mo.
            </p>
          </div>
        </Section>

        {/* CROSS-LINKS */}
        <div className="mt-16 sm:mt-20 pt-10 border-t border-[var(--gem-gray-800)]">
          <p
            className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-5"
            style={{ color: 'var(--gem-gray-500)' }}
          >
            More on the platform
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <CrossLink
              href="/selznick"
              label="The Selznick engine"
              body="The technology behind every GEM evaluation."
            />
            <CrossLink
              href="/industry"
              label="For industry partners"
              body="Producers and reps: see how the platform works on your side."
            />
          </div>
        </div>
      </main>
    </>
  )
}

// ─── Shared layout components ───────────────────────────────────────

function Section({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string
  title: string
  children: React.ReactNode
}) {
  return (
    <section className="mt-14 sm:mt-16">
      <p
        className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-3"
        style={{ color: 'var(--gem-gray-500)' }}
      >
        {eyebrow}
      </p>
      <h2 className="text-[26px] sm:text-[34px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-[1.15] m-0 mb-5">
        {title}
      </h2>
      {children}
    </section>
  )
}

function TrialBlock({
  icon,
  label,
  body,
}: {
  icon: React.ReactNode
  label: string
  body: string
}) {
  return (
    <div
      className="rounded-xl p-5"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-md mb-3"
        style={{
          width: 28,
          height: 28,
          background: 'rgba(212,160,23,0.10)',
          color: 'var(--gem-gold)',
        }}
      >
        {icon}
      </span>
      <p className="text-[15px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5 leading-tight">
        {label}
      </p>
      <p className="text-[13.5px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
        {body}
      </p>
    </div>
  )
}

function ReportBlock({
  number,
  title,
  body,
}: {
  number: string
  title: string
  body: string
}) {
  return (
    <div className="grid grid-cols-[40px_1fr] sm:grid-cols-[52px_1fr] gap-x-3 sm:gap-x-4 py-3 border-b last:border-0 border-[var(--gem-gray-800)]">
      <span
        className="text-[18px] sm:text-[22px] font-bold tabular-nums leading-tight"
        style={{ color: 'var(--gem-gold)' }}
      >
        {number}
      </span>
      <div className="min-w-0">
        <p className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 leading-snug mb-1">
          {title}
        </p>
        <p className="text-[14.5px] text-[var(--gem-gray-300)] leading-[1.55] m-0 max-w-[60ch]">
          {body}
        </p>
      </div>
    </div>
  )
}

function ProBullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2 text-[14px] text-[var(--gem-gray-100)] leading-snug">
      <span
        aria-hidden
        className="inline-flex items-center justify-center rounded-full mt-0.5 shrink-0"
        style={{
          width: 16,
          height: 16,
          background: 'rgba(124,58,237,0.10)',
          color: 'var(--gem-accent)',
        }}
      >
        <Check size={10} strokeWidth={3} />
      </span>
      <span>{children}</span>
    </li>
  )
}

function FlowCard({
  caption,
  body,
  visual,
}: {
  caption: string
  body: string
  visual: React.ReactNode
}) {
  return (
    <div
      className="rounded-2xl p-5 sm:p-6"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div className="mb-5 max-w-[60ch]">
        <p
          className="text-[10.5px] uppercase tracking-[0.18em] font-bold m-0 mb-2"
          style={{ color: 'var(--gem-accent)' }}
        >
          {caption}
        </p>
        <p className="text-[14.5px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
          {body}
        </p>
      </div>
      <div>{visual}</div>
    </div>
  )
}

// ─── Opportunity flow mockups ───────────────────────────────────────

function OpportunitiesListMock() {
  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <p className="text-[9.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-3">
        Active opportunities
      </p>
      <div className="space-y-2">
        <OppRow title="Character-driven thriller — limited series" deal="Option" perspective="Producer" />
        <OppRow title="Underrepresented voices — comedy features" deal="Representation" perspective="Lit Rep" />
        <OppRow title="Action/thriller IP acquisition" deal="Purchase" perspective="Producer" />
      </div>
    </div>
  )
}

function OppRow({ title, deal, perspective }: { title: string; deal: string; perspective: string }) {
  return (
    <div
      className="rounded-lg px-3 py-2"
      style={{ background: '#fff', border: '1px solid var(--gem-gray-700)' }}
    >
      <div className="flex flex-wrap gap-1.5 mb-1">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          {deal}
        </span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
          {perspective}
        </span>
      </div>
      <p className="text-[11.5px] font-semibold m-0 text-[var(--gem-gray-50)] leading-tight">
        {title}
      </p>
    </div>
  )
}

function DashboardMatchMock() {
  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <p className="text-[9.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0 mb-3">
        Your scripts
      </p>
      <div
        className="rounded-lg px-3 py-2.5 flex items-center justify-between gap-3"
        style={{ background: '#fff', border: '1px solid var(--gem-gray-700)' }}
      >
        <div className="min-w-0 flex-1">
          <p
            className="text-[12.5px] font-bold m-0 leading-tight text-[var(--gem-gray-50)]"
            style={{ fontFamily: 'Georgia, serif' }}
          >
            Untitled mob-therapy pilot
          </p>
          <p className="text-[10px] text-[var(--gem-gray-400)] m-0 mt-0.5">
            Series &middot; 1 hr drama &middot; Score 78
          </p>
        </div>
        <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-50 text-emerald-700">
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="6" fill="currentColor" opacity="0.15"/><path d="M3.5 6.2L5.2 7.8L8.5 4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
          3 opportunities
        </span>
      </div>
      <div className="mt-2 pl-3 space-y-1">
        <p className="text-[10px] text-[var(--gem-gray-400)] m-0 leading-snug">
          &bull; Character-driven thriller — limited series
        </p>
        <p className="text-[10px] text-[var(--gem-gray-400)] m-0 leading-snug">
          &bull; Premium cable drama — returning showrunner
        </p>
        <p className="text-[10px] text-[var(--gem-gray-400)] m-0 leading-snug">
          &bull; Indie drama — first-time features
        </p>
      </div>
    </div>
  )
}

function SubmitMock() {
  return (
    <div
      className="rounded-xl p-3.5"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="flex flex-wrap gap-1.5 mb-2">
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          Option
        </span>
        <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
          Producer
        </span>
      </div>
      <p
        className="text-[13px] font-bold m-0 mb-1 leading-tight text-[var(--gem-gray-50)]"
        style={{ fontFamily: 'Georgia, serif' }}
      >
        Character-driven thriller — limited series
      </p>
      <p className="text-[11px] text-[var(--gem-gray-400)] m-0 mb-3 leading-snug">
        Looking for contained, high-tension pilots with a strong singular lead.
      </p>

      {/* The opportunity box */}
      <div
        className="rounded-lg px-3 py-2.5 mb-3"
        style={{ background: 'rgba(22,163,74,0.06)', border: '1px solid rgba(22,163,74,0.25)' }}
      >
        <p className="text-[8.5px] font-bold uppercase tracking-wider text-emerald-700 m-0 mb-1">
          The opportunity
        </p>
        <p className="text-[11px] text-emerald-800 leading-snug m-0">
          Option your script with a path to production. You retain rights until a purchase is triggered.
        </p>
      </div>

      {/* Qualifying script + submit */}
      <div
        className="rounded-lg px-3 py-2 flex items-center justify-between gap-2"
        style={{ background: 'var(--gem-gray-900)', border: '1px solid rgba(16,185,129,0.30)' }}
      >
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--gem-gray-500)] m-0 mb-0.5">
            Your qualifying script
          </p>
          <p className="text-[11.5px] font-semibold text-[var(--gem-gray-50)] m-0 leading-tight">
            Untitled mob-therapy pilot
          </p>
        </div>
        <span
          className="shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-lg text-white"
          style={{ background: 'var(--gem-accent)', cursor: 'default' }}
        >
          Submit
        </span>
      </div>
    </div>
  )
}

function CrossLink({
  href,
  label,
  body,
}: {
  href: string
  label: string
  body: string
}) {
  return (
    <Link
      href={href}
      className="group rounded-xl p-5 transition-all hover:border-[var(--gem-gold)]"
      style={{
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div className="flex items-center justify-between gap-3 mb-2">
        <p className="text-[14px] font-bold text-[var(--gem-gray-50)] m-0">
          {label}
        </p>
        <ArrowRight
          size={16}
          className="text-[var(--gem-gray-500)] transition-colors group-hover:text-[var(--gem-gold)]"
        />
      </div>
      <p className="text-[14px] text-[var(--gem-gray-300)] leading-snug m-0">
        {body}
      </p>
    </Link>
  )
}
