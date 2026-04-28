// /industry — the industry partner product page.
//
// Pitch to producers and reps. Shows what they'd get from the platform:
// a curated feed, lane-matched, intros routed through GEM. Apply-for-
// access form at the bottom (mailto for now, until we wire a proper
// application table).

import Link from 'next/link'
import Nav from '@/components/nav'
import { ArrowRight, Inbox, Filter, Mail, FileText, Shield } from 'lucide-react'

const INDUSTRY_APPLY_URL =
  'mailto:industry@gem.studio?subject=Apply%20for%20industry%20access'

export const metadata = {
  title: 'For industry partners — GEM',
  description:
    'A curated feed of new screenplays, evaluated and matched to your lane. Producer and rep accounts are vetted. Apply for access.',
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
            New screenplays. Already read. Already matched to your lane.
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[var(--gem-gray-200)] leading-[1.55] m-0 mb-7 max-w-[60ch]">
            GEM is a curated feed of evaluated screenplays — every one with a
            structured report covering Cast, Packaging, Project Complexity,
            and the case for greenlight. Mark Interested, send a one-click
            intro, and the writer&apos;s reply lands in your inbox. No cold
            inbox triage.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href={INDUSTRY_APPLY_URL}
              className="inline-flex items-center gap-1.5 px-5 py-3 rounded-lg text-[15px] font-semibold text-white"
              style={{
                background: 'var(--gem-accent)',
                boxShadow: '0 2px 10px rgba(124,58,237,0.30)',
              }}
            >
              Apply for access
              <ArrowRight size={15} />
            </a>
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

        {/* WHAT YOU GET */}
        <Section eyebrow="What you get" title="A signal-rich slate, not an inbox.">
          <div className="grid sm:grid-cols-2 gap-3">
            <ValueBlock
              icon={<Inbox size={16} />}
              title="A matched feed"
              body="Scripts filtered to your lane: genre, format, budget tier. New-since-last-visit signal so you only triage what's actually new."
            />
            <ValueBlock
              icon={<FileText size={16} />}
              title="Structured reports"
              body="Every script comes with a producer's-eye read — Why this can be a hit, Cast, Packaging, Project Complexity, Development considerations."
            />
            <ValueBlock
              icon={<Mail size={16} />}
              title="Intros routed by GEM"
              body="Mark Interested, send a one-line intro. We deliver it to the writer with your email as the Reply-To. Their reply lands in your inbox directly."
            />
            <ValueBlock
              icon={<Filter size={16} />}
              title="Slate management"
              body="Inbox / Slate / Passed columns. Pass-with-comment lets you give the writer a private note even when the script isn't for you."
            />
          </div>
        </Section>

        {/* HOW MATCHING WORKS */}
        <Section eyebrow="How it works" title="Onboard your lane. The slate fills itself.">
          <div className="space-y-5">
            <Step
              number="1"
              title="Tell us your lane."
              body="Genre preferences, format (feature / series / both), budget tier you typically work in. Five minutes during onboarding."
            />
            <Step
              number="2"
              title="GEM matches new scripts to you."
              body="Every published script is run through your lane filter. New scripts that fit show up in your inbox; the rest don't compete for your attention."
            />
            <Step
              number="3"
              title="React in one tap."
              body="Interested moves the script into your Slate and signals the writer. Pass closes the loop — with or without a comment. Send Intro fires the email."
            />
            <Step
              number="4"
              title="Talk to the writer."
              body="Once they reply to your intro, the conversation moves to email. GEM stays out of the way."
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
          <a
            href={INDUSTRY_APPLY_URL}
            className="inline-flex items-center gap-1.5 px-5 py-3 rounded-lg text-[15px] font-semibold text-white"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 2px 10px rgba(124,58,237,0.30)',
            }}
          >
            Apply for access
            <ArrowRight size={15} />
          </a>
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
              label="The Selznick rubric"
              body="The producer's-eye lens behind every GEM evaluation."
            />
            <CrossLink
              href="/writers"
              label="For writers"
              body="Writers: see what your side of the platform looks like."
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
