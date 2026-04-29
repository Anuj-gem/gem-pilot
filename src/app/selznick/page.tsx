// /selznick — the engine page. Rebuilt 2026-04-28 to lead with the
// technology: Selznick is the most advanced script evaluation engine
// ever built, it reads from every angle a producer would, and it
// matches the strongest scripts with the right industry partners so
// great films and TV find the people who can make them. No academic
// rubric breakdowns, no tier tables, no false principles.

import Link from 'next/link'
import Nav from '@/components/nav'
import { ArrowRight, Sparkles, Layers, Network, Film } from 'lucide-react'

export const metadata = {
  title: 'Selznick — The script evaluation engine',
  description:
    'Selznick is the most advanced script evaluation engine ever built. It reads every screenplay across thousands of signals, then matches the strongest scripts with the right industry partners.',
}

export default function SelznickPage() {
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 pb-24">
        {/* HERO */}
        <div className="mb-14 sm:mb-20">
          <p
            className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-3"
            style={{ color: 'var(--gem-accent)' }}
          >
            The Selznick engine
          </p>
          <h1 className="text-[36px] sm:text-[56px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-[1.02] m-0 mb-5 font-[family-name:var(--font-display)]">
            The most advanced script evaluation engine ever built.
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[var(--gem-gray-200)] leading-[1.55] m-0 max-w-[60ch]">
            Selznick reads every screenplay across thousands of signals —
            every angle a producer, an agent, and a financier would weigh in
            the same room. Then it matches the strongest scripts with the
            right industry partners, so the films and TV that deserve to get
            made find the people who can make them.
          </p>
        </div>

        {/* THOUSANDS OF SIGNALS */}
        <Section
          eyebrow="Thousands of signals"
          title="Every angle, all at once."
        >
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            Selznick doesn&apos;t score one thing at a time. It reads story,
            character, voice, audience, packaging, and production reality
            simultaneously — the way a development executive does walking out
            of a meeting. Every screenplay comes back as a structured report
            covering every lens that matters.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Pillar
              icon={<Sparkles size={16} />}
              title="Multi-dimensional read"
              body="Story, character, voice, audience, packaging, production — every dimension scored against what producers actually weigh."
            />
            <Pillar
              icon={<Layers size={16} />}
              title="Calibrated to real industry signal"
              body="Trained on the patterns that historically predict what gets greenlit, what finds an audience, and what gets remembered."
            />
          </div>
        </Section>

        {/* THE MATCH */}
        <Section
          eyebrow="The match"
          title="Right script. Right producer. Always in lane."
        >
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            Most platforms stop at the read. Selznick keeps going. Once a
            script qualifies, the engine routes it to the producers,
            development executives, agents, and managers who are actively
            scouting that exact lane — genre, format, and budget — and the
            writer hears from them directly.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Pillar
              icon={<Network size={16} />}
              title="Lane-matched routing"
              body="Every industry partner sees only the scripts that fit their mandate. Writers reach the producers most likely to chase the work."
            />
            <Pillar
              icon={<Film size={16} />}
              title="Built to make things"
              body="The point isn't a score. The point is a green light. Selznick exists to close the gap between great writers and the people who turn screenplays into films."
            />
          </div>
        </Section>

        {/* THE NAME */}
        <Section eyebrow="The name" title="Named for the producer who built the standard.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 max-w-[64ch]">
            David O. Selznick turned <em>Gone with the Wind</em> and{' '}
            <em>Rebecca</em> into events by reading scripts the way only the
            sharpest producers can — for what would actually land. We named
            the engine after him because that&apos;s the standard it&apos;s
            built to meet.
          </p>
        </Section>

        {/* CROSS-LINKS */}
        <div className="mt-16 sm:mt-20 pt-10 border-t border-[var(--gem-gray-800)]">
          <p
            className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-5"
            style={{ color: 'var(--gem-gray-500)' }}
          >
            What this looks like in practice
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <CrossLink
              href="/writers"
              label="For writers"
              body="Upload your script, get the Selznick read, decide who in the industry sees it."
            />
            <CrossLink
              href="/industry"
              label="For producers"
              body="A curated, lane-matched feed of evaluated scripts — every one with a full report."
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

function Pillar({
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
        background: '#fff',
        border: '1px solid var(--gem-gray-700)',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          aria-hidden
          className="inline-flex items-center justify-center rounded-md"
          style={{
            width: 28,
            height: 28,
            background: 'rgba(124,58,237,0.10)',
            color: 'var(--gem-accent)',
          }}
        >
          {icon}
        </span>
        <p className="text-[15.5px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight">
          {title}
        </p>
      </div>
      <p className="text-[14px] text-[var(--gem-gray-300)] leading-[1.55] m-0">
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
