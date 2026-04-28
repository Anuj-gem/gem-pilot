// /writers — the writer product page.
//
// Deep-dive into what writers actually get from GEM. Trial structure,
// what's in the report, Pro value props, sample report annotations.
// We don't expose model specifics or scoring formulas — that's
// /selznick.

import Link from 'next/link'
import Nav from '@/components/nav'
import { ArrowRight, Check, Eye, Clock, Sparkles } from 'lucide-react'

export const metadata = {
  title: 'For writers — GEM',
  description:
    "Upload your screenplay. Get a producer's-eye read in 60 seconds — and the industry to actually see it. First read free.",
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
            A real read on your script. And the industry to actually see it.
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[var(--gem-gray-200)] leading-[1.55] m-0 mb-7 max-w-[60ch]">
            Upload your screenplay. In 60 seconds, GEM gives you the report a
            producer would write before greenlight: what works, what to plan
            for, who would chase it. Then we put it in front of working
            industry partners — only the ones you choose to share with.
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
              Get my read — free
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
              How GEM reads scripts
            </Link>
          </div>
        </div>

        {/* THE TRIAL */}
        <Section eyebrow="The trial" title="Free first eval. 7 free days on Industry. Engagement extends.">
          <div className="grid sm:grid-cols-3 gap-3">
            <TrialBlock
              icon={<Sparkles size={16} />}
              label="1 free evaluation"
              body="Upload your first screenplay free. Full report, no blur, no asterisk."
            />
            <TrialBlock
              icon={<Eye size={16} />}
              label="7 days on Industry"
              body="Every report you publish goes live to matched producers and reps for 7 days at no charge."
            />
            <TrialBlock
              icon={<Clock size={16} />}
              label="Producers extend it"
              body="Any producer engagement — view, interest, intro — extends the post past day 7. If nobody bites, it auto-unpublishes."
            />
          </div>
          <p className="text-[14px] text-[var(--gem-gray-400)] leading-snug m-0 mt-5 max-w-[60ch]">
            Your <em>report itself</em> is yours forever. The 7-day window is just for industry exposure.
          </p>
        </Section>

        {/* WHAT YOU GET */}
        <Section eyebrow="What's in the report" title="The packet a producer would write before greenlight.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            Every GEM evaluation produces a structured report covering the
            same axes a producer would weigh in a development meeting. Full
            access, no upsell to read your own work.
          </p>
          <div className="space-y-3">
            <ReportBlock
              number="01"
              title="Commercial-potential score"
              body="A 0–100 read calibrated by the Selznick rubric. Greenlight, optionable, needs development, or early-stage — at a glance."
            />
            <ReportBlock
              number="02"
              title="Why this can be a hit"
              body="The strongest commercial notes about the script. The case a manager could forward verbatim."
            />
            <ReportBlock
              number="03"
              title="Cast"
              body="Lead and supporting characters with the actor-want angle: who chases this part, what performance comp it pulls from."
            />
            <ReportBlock
              number="04"
              title="Packaging"
              body="Audience target, budget tier (per-episode for series), and whether the project has franchise upside."
            />
            <ReportBlock
              number="05"
              title="Project Complexity"
              body="What a producer would plan for on production and casting — the lift, the dependencies, the heads-up."
            />
            <ReportBlock
              number="06"
              title="Development considerations"
              body="The case against: the sharpest lever and every other note a buyer would weigh before saying yes."
            />
          </div>
        </Section>

        {/* PRO */}
        <Section eyebrow="GEM Pro" title="$20/mo. Unlimited everything.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            One free eval gets you the door. Pro keeps it open — unlimited
            scripts, indefinite industry exposure, and the toolkit a working
            screenwriter actually uses.
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
                / month · cancel anytime
              </span>
            </div>
            <ul className="grid sm:grid-cols-2 gap-x-5 gap-y-2.5 list-none m-0 p-0">
              <ProBullet>Unlimited script evaluations</ProBullet>
              <ProBullet>Posts stay live on Industry indefinitely</ProBullet>
              <ProBullet>Submit revisions and rescore old reports</ProBullet>
              <ProBullet>Producer intros routed to your inbox</ProBullet>
              <ProBullet>Per-section privacy + score-eye toggles</ProBullet>
              <ProBullet>Branded PDF download of every report</ProBullet>
            </ul>
            <div className="mt-7">
              <Link
                href="/submit"
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-lg text-sm font-semibold text-white"
                style={{ background: 'var(--gem-accent)' }}
              >
                Start with a free eval
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </Section>

        {/* CROSS-LINK */}
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
              label="The Selznick rubric"
              body="The producer's-eye lens behind every GEM evaluation."
            />
            <CrossLink
              href="/industry"
              label="For industry partners"
              body="Producers and reps: see how the matched feed works on your side."
            />
          </div>
        </div>
      </main>
    </>
  )
}

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
