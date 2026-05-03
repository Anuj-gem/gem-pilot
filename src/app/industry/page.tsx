// /industry — the industry partner product page.
//
// Pitch to producers and reps. Shows what they'd get from the platform:
// a curated feed, lane-matched, intros routed through GEM. Apply-for-
// access form at the bottom (mailto for now, until we wire a proper
// application table).

import Link from 'next/link'
import Nav from '@/components/nav'
import { ArrowRight, Inbox, Filter, Mail, FileText, Shield, Handshake, DollarSign, Users, BadgeCheck } from 'lucide-react'

export const metadata = {
  title: 'For industry partners — GEM',
  description:
    'Post what you are looking for. Get qualified, pre-evaluated scripts from writers who match your requirements. Producer and rep accounts are vetted.',
}

export default function IndustryPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 pb-24">
        {/* HERO */}
        <div className="mb-12 sm:mb-16">
          <p
            className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-3"
            style={{ color: 'var(--gem-accent)' }}
          >
            For industry partners
          </p>
          <h1 className="text-[36px] sm:text-[52px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-[1.05] m-0 mb-5 font-[family-name:var(--font-display)]">
            Post what you&apos;re looking for. Get qualified scripts.
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[var(--gem-gray-200)] leading-[1.55] m-0 mb-7 max-w-[60ch]">
            GEM gives producers, reps, and financiers a direct channel to
            evaluated screenplays. Post an opportunity with your requirements
            &mdash; genre, format, budget tier, deal type &mdash; and qualified
            writers submit directly. Every script comes with a full structured
            evaluation. No slush pile. No triage.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/apply"
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-lg text-[15px] font-semibold text-white"
              style={{
                background: 'var(--gem-accent)',
                boxShadow: '0 2px 10px rgba(124,58,237,0.30)',
              }}
            >
              Apply for access
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

        {/* MATCHED FEED MOCK */}
        <FeedFilterMock />

        {/* DEAL TYPES */}
        <Section eyebrow="Deal types" title="Four ways to work with writers on GEM.">
          <div className="grid sm:grid-cols-2 gap-3">
            <DealTypeBlock
              icon={<Handshake size={16} />}
              title="Option"
              body="Low upfront commitment with a path to production. The writer retains rights until purchase is triggered."
              color="#16a34a"
            />
            <DealTypeBlock
              icon={<DollarSign size={16} />}
              title="Purchase"
              body="Outright acquisition at WGA scale or above. Writer stays attached for credit."
              color="var(--gem-accent)"
            />
            <DealTypeBlock
              icon={<Users size={16} />}
              title="Representation"
              body="Build your roster. Writers on GEM come with structured evaluations and track records — you can see exactly what you're signing."
              color="#6366f1"
            />
            <DealTypeBlock
              icon={<BadgeCheck size={16} />}
              title="Production finance"
              body="Shared backend model. You put up the financing, the writer shares in distribution revenue."
              color="var(--gem-gold)"
            />
          </div>
        </Section>

        {/* WHAT YOU GET */}
        <Section eyebrow="The platform" title="Every script pre-evaluated. Every submission qualified.">
          <div className="grid sm:grid-cols-2 gap-3">
            <ValueBlock
              icon={<FileText size={16} />}
              title="Pre-evaluated scripts"
              body="Every script comes with a full structured report: headline, characters, packaging, budget tier, production complexity. You're reading the evaluation, not the first 10 pages."
            />
            <ValueBlock
              icon={<Filter size={16} />}
              title="Qualified submissions only"
              body="You set the requirements. Only scripts that meet your criteria can submit. No slush, no off-lane pitches."
            />
            <ValueBlock
              icon={<Inbox size={16} />}
              title="Writer profiles"
              body="Every submission includes the writer's full profile: scripts, scores, track record. One page tells you who you're working with."
            />
            <ValueBlock
              icon={<Mail size={16} />}
              title="Direct contact"
              body="When you're interested, reach the writer directly. GEM routes the connection; the conversation happens between you."
            />
          </div>
        </Section>

        {/* HOW MATCHING WORKS */}
        <Section eyebrow="How it works" title="Post an opportunity. Qualified writers come to you.">
          <div className="space-y-5">
            <Step
              number="1"
              title="Tell us your lane."
              body="Genre preferences, format, budget tier, what kind of deal you're offering. Five minutes."
            />
            <Step
              number="2"
              title="Post an opportunity."
              body="Describe what you're looking for. Your listing goes live with your requirements as automatic filters."
            />
            <Step
              number="3"
              title="Qualified writers submit."
              body="Only scripts meeting your criteria can apply. Every submission comes with the full evaluation and writer profile."
            />
            <Step
              number="4"
              title="Review and connect."
              body="Read the evaluation. Check the writer's profile. Reach out directly when you find the right fit."
            />
          </div>
        </Section>

        {/* TRUST */}
        <Section eyebrow="Confidentiality" title="Scripts are owned by their authors. Always.">
          <div
            className="rounded-xl p-5"
            style={{
              background: 'rgba(124,58,237,0.05)',
              border: '1px solid rgba(124,58,237,0.25)',
            }}
          >
            <div className="flex items-start gap-3 mb-2">
              <span
                aria-hidden
                className="inline-flex items-center justify-center rounded-md mt-0.5 shrink-0"
                style={{
                  width: 24,
                  height: 24,
                  background: 'rgba(124,58,237,0.10)',
                  color: 'var(--gem-accent)',
                }}
              >
                <Shield size={14} />
              </span>
              <div>
                <p className="text-[15px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5 leading-snug">
                  At signup, every industry partner acknowledges:
                </p>
                <ul className="list-disc pl-5 space-y-1 text-[14px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
                  <li>Scripts on GEM are confidential and owned by their authors.</li>
                  <li>No redistribution outside of GEM without the author&apos;s express approval.</li>
                  <li>Any option, development, or production conversation happens directly with the writer.</li>
                </ul>
              </div>
            </div>
          </div>
        </Section>

        {/* APPLY */}
        <Section eyebrow="Get access" title="Industry accounts are vetted.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            We approve producer and representative accounts manually so the
            writer-side of the platform stays clean. Tell us who you are and
            what you&apos;re looking for — we&apos;ll get back within a few
            business days.
          </p>
          <Link
            href="/apply"
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-lg text-[15px] font-semibold text-white"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 2px 10px rgba(124,58,237,0.30)',
            }}
          >
            Apply for access
            <ArrowRight size={15} />
          </Link>
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
              href="/writers"
              label="For writers"
              body="Writers: see what the platform looks like on your side."
            />
          </div>
        </div>
      </main>
    </>
  )
}

// FeedFilterMock — full-width producer-side preview: filter chips on
// top, three matched-script rows underneath. Sells the "easy to filter
// + skim" experience as the centerpiece of /industry.
function FeedFilterMock() {
  return (
    <section className="mt-14 sm:mt-16">
      <div
        className="rounded-2xl p-5 sm:p-6"
        style={{
          background: '#fff',
          border: '1px solid var(--gem-gray-700)',
          boxShadow: '0 18px 40px rgba(0,0,0,0.06), 0 4px 12px rgba(0,0,0,0.03)',
        }}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <p className="text-[10.5px] uppercase tracking-[0.18em] font-bold text-[var(--gem-gray-500)] m-0">
            Your matched feed
          </p>
          <span className="text-[10px] italic" style={{ color: 'var(--gem-gray-500)' }}>
            demo
          </span>
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap items-center gap-2 mb-5 pb-4" style={{ borderBottom: '1px solid var(--gem-gray-800)' }}>
          <FilterChip label="Genre: Drama" active />
          <FilterChip label="Format: Series" active />
          <FilterChip label="Budget: Premium cable" active />
          <FilterChip label="+ Tone" />
          <FilterChip label="+ Setting" />
          <span className="ml-auto text-[11px] text-[var(--gem-gray-500)]">
            12 scripts in your lane
          </span>
        </div>

        {/* Feed rows */}
        <div className="space-y-2.5">
          <FeedRow
            title="Untitled mob therapy pilot"
            meta="Series · 1 hr drama · Premium cable"
            score="78"
            interested={5}
            isNew
          />
          <FeedRow
            title="The Northern Line"
            meta="Series · 1 hr drama · Premium cable"
            score="74"
            interested={3}
          />
          <FeedRow
            title="Glass Cathedral"
            meta="Series · 1 hr drama · Premium cable"
            score="71"
            interested={2}
          />
        </div>
      </div>
    </section>
  )
}

function FilterChip({ label, active = false }: { label: string; active?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11.5px] font-semibold"
      style={{
        background: active ? 'rgba(124,58,237,0.08)' : 'transparent',
        border: `1px solid ${active ? 'rgba(124,58,237,0.30)' : 'var(--gem-gray-700)'}`,
        color: active ? 'var(--gem-accent)' : 'var(--gem-gray-400)',
      }}
    >
      {label}
    </span>
  )
}

function FeedRow({
  title,
  meta,
  score,
  interested,
  isNew = false,
}: {
  title: string
  meta: string
  score: string
  interested: number
  isNew?: boolean
}) {
  return (
    <div
      className="rounded-xl px-4 py-3 flex items-center gap-3"
      style={{
        background: 'var(--gem-gray-900)',
        border: '1px solid var(--gem-gray-700)',
      }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-1">
          <p className="text-[14px] font-semibold m-0 text-[var(--gem-gray-50)] truncate leading-tight">
            {title}
          </p>
          {isNew && (
            <span
              className="text-[8.5px] font-bold uppercase tracking-wider px-1 py-[1px] rounded text-white"
              style={{ background: '#16a34a' }}
            >
              New
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <p className="text-[11.5px] text-[var(--gem-gray-400)] m-0">{meta}</p>
          <span className="text-[var(--gem-gray-700)]">·</span>
          <p className="text-[11.5px] m-0" style={{ color: '#15803d' }}>
            {interested} interested
          </p>
        </div>
      </div>
      <div className="shrink-0 flex items-center gap-1.5">
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded leading-none"
          style={{
            background: 'var(--gem-accent)',
            color: '#fff',
          }}
        >
          ✓ Interested
        </span>
        <span
          className="text-[11px] font-bold px-2.5 py-1 rounded leading-none"
          style={{
            background: '#fff',
            color: 'var(--gem-gray-500)',
            border: '1px solid var(--gem-gray-700)',
          }}
        >
          × Pass
        </span>
      </div>
    </div>
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

function ValueBlock({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
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
          background: 'rgba(124,58,237,0.10)',
          color: 'var(--gem-accent)',
        }}
      >
        {icon}
      </span>
      <p className="text-[15px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5 leading-tight">
        {title}
      </p>
      <p className="text-[13.5px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
        {body}
      </p>
    </div>
  )
}

function Step({
  number,
  title,
  body,
}: {
  number: string
  title: string
  body: string
}) {
  return (
    <div className="grid grid-cols-[36px_1fr] sm:grid-cols-[44px_1fr] gap-x-3 sm:gap-x-4">
      <span
        className="text-[18px] sm:text-[22px] font-bold tabular-nums leading-tight"
        style={{ color: 'var(--gem-accent)' }}
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

function DealTypeBlock({
  icon,
  title,
  body,
  color,
}: {
  icon: React.ReactNode
  title: string
  body: string
  color: string
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
          background: `${color}15`,
          color,
        }}
      >
        {icon}
      </span>
      <p className="text-[15px] font-bold text-[var(--gem-gray-50)] m-0 mb-1.5 leading-tight">
        {title}
      </p>
      <p className="text-[13.5px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
        {body}
      </p>
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
