// /selznick — the methodology / philosophy page.
//
// This is the credibility surface. We explain HOW we evaluate scripts —
// broadly: narrative + production + packaging + commercial signals —
// without exposing the base model, the scoring formula, or the
// dimension weights. The score is positioned as "a producer's-eye read,
// 0–100" and the page links out to /writers and /industry for the two
// product experiences.
//
// What we DON'T put here: which LLM we use, the dimension weights, the
// training corpus details, anything that gives away how the sausage is
// made beyond the conceptual frame.

import Link from 'next/link'
import Nav from '@/components/nav'
import { ArrowRight, Sparkles, Users, Layers, Compass } from 'lucide-react'

export const metadata = {
  title: 'Selznick — How GEM reads a script',
  description:
    'The rubric behind every GEM evaluation — how we read narrative, production, packaging, and commercial potential the way a producer would.',
}

export default function SelznickPage() {
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
            The Selznick rubric
          </p>
          <h1 className="text-[36px] sm:text-[52px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-[1.05] m-0 mb-5 font-[family-name:var(--font-display)]">
            How GEM reads a script.
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[var(--gem-gray-200)] leading-[1.55] m-0 max-w-[60ch]">
            Named after David O. Selznick — the producer who turned <em>Gone
            with the Wind</em> and <em>Rebecca</em> into events. The Selznick
            rubric is GEM&apos;s evaluation lens: a producer&apos;s-eye read on
            every script, returned as a structured report covering story,
            character, packaging, and production reality.
          </p>
        </div>

        {/* WHAT WE LOOK AT */}
        <Section eyebrow="What we look at" title="A producer evaluates four things at once. So do we.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            Most script-feedback tools score craft in isolation. The Selznick
            rubric reads a script the way a buyer does — checking craft AND
            asking whether the project would actually get made and find an
            audience. Four lenses, every time:
          </p>

          <div className="grid sm:grid-cols-2 gap-3">
            <Lens
              icon={<Sparkles size={16} />}
              title="Narrative"
              body="Hook, character depth, voice, pacing, tonal specificity, world-building, ensemble dynamics, slow-burn potential. The bones."
            />
            <Lens
              icon={<Users size={16} />}
              title="Cast"
              body="Who's the role for. What kind of actor reset would this give. Where the casting lift is hardest. Which parts pull a producer or an agent toward the project."
            />
            <Lens
              icon={<Layers size={16} />}
              title="Production"
              body="Period vs contemporary. Locations. Stunts, VFX, kids, animals, music clearances. The lift a buyer would actually need to plan for."
            />
            <Lens
              icon={<Compass size={16} />}
              title="Packaging"
              body="Audience target, budget tier, lane fit, franchise upside. The frame a producer would use to pitch this to a financier or a streamer."
            />
          </div>
        </Section>

        {/* THE REPORT */}
        <Section eyebrow="The report" title="A structured read, not a score.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-4 max-w-[64ch]">
            The report is the product. Each evaluation comes back with a
            sharpened headline, the strongest reasons the script lands,
            character profiles, packaging signals, and a margin-note read on
            production reality — the same shape a producer would write up
            before walking into a development meeting.
          </p>
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-4 max-w-[64ch]">
            A single number sits on the cover for fast triage. It&apos;s a
            quick-glance signal, not a verdict — the substance is the read
            underneath, and that&apos;s what producers actually use.
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
              label="For industry partners"
              body="A curated feed of evaluated scripts matched to your lane — with intros routed through GEM."
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

function Lens({
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
      <div className="flex items-center gap-2 mb-2">
        <span
          aria-hidden
          className="inline-flex items-center justify-center rounded-md"
          style={{
            width: 28,
            height: 28,
            background: 'rgba(212,160,23,0.10)',
            color: 'var(--gem-gold)',
          }}
        >
          {icon}
        </span>
        <p className="text-[16px] font-bold text-[var(--gem-gray-50)] m-0 leading-tight">
          {title}
        </p>
      </div>
      <p className="text-[14.5px] text-[var(--gem-gray-200)] leading-[1.55] m-0">
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
