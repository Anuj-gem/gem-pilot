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
  title: 'Selznick — The technology behind every GEM evaluation',
  description:
    'Selznick reads every screenplay the way a room full of producers would — story, character, voice, audience, packaging, production reality, all at once. The technology behind every GEM evaluation.',
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
            The technology behind every GEM evaluation.
          </h1>
          <p className="text-[17px] sm:text-[19px] text-[var(--gem-gray-200)] leading-[1.55] m-0 max-w-[60ch]">
            Selznick reads every screenplay the way a room full of producers,
            agents, and financiers would &mdash; story, character, voice,
            audience, packaging, production reality, all at once. A structured
            evaluation covering every dimension that determines whether
            something gets made.
          </p>
        </div>

        {/* THOUSANDS OF SIGNALS */}
        <Section
          eyebrow="The evaluation"
          title="Every angle. All at once."
        >
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            Selznick doesn&apos;t score one thing at a time. It reads story,
            character, voice, audience, packaging, and production reality
            simultaneously &mdash; the way a real evaluation happens in a
            development meeting. Every screenplay uploaded to GEM gets the
            same structured, thorough read: the kind that used to require
            knowing someone.
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

        {/* BEYOND THE READ */}
        <Section
          eyebrow="Beyond the read"
          title="The evaluation opens the door. Opportunities are on the other side."
        >
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 mb-6 max-w-[64ch]">
            Most platforms stop at the evaluation. You get a score, maybe some
            notes, and then nothing. Selznick keeps going. Once your script is
            evaluated, its qualities &mdash; genre, format, budget tier, score
            &mdash; are matched against every active opportunity on GEM. The
            evaluation becomes the key that connects your work to the right
            people.
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <Pillar
              icon={<Network size={16} />}
              title="Automatic matching"
              body="Every opportunity on GEM has specific requirements. Selznick matches your script against all of them the moment your evaluation completes."
            />
            <Pillar
              icon={<Film size={16} />}
              title="Built to make things"
              body="The point isn't a score. It's to close the gap between great scripts and the people who make them into films and series."
            />
          </div>
        </Section>

        {/* THE NAME */}
        <Section eyebrow="The name" title="Named for the producer who set the standard.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 max-w-[64ch]">
            David O. Selznick turned <em>Gone with the Wind</em> and{' '}
            <em>Rebecca</em> into cultural events by reading scripts the way
            only the sharpest producers can &mdash; for what would land with an
            audience, attract the best talent, and endure. We named the engine
            after him because that&apos;s the bar: every script evaluated with
            the seriousness it deserves.
          </p>
        </Section>

        {/* THE VISION */}
        <Section eyebrow="Why we built this" title="Great stories can come from anywhere.">
          <p className="text-[16px] sm:text-[17px] text-[var(--gem-gray-200)] leading-[1.6] m-0 max-w-[64ch]">
            The entertainment industry has always had a discovery problem.
            Access determines who gets read. Connections determine who gets
            meetings. Geography determines who&apos;s in the room. GEM exists
            to change that. Every writer gets the same thorough evaluation
            &mdash; regardless of who they know or where they live. The scripts
            that qualify don&apos;t sit in a database. They go directly to the
            producers, reps, and financiers actively looking for that exact
            kind of work. Our job is to make sure great writers get found.
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
              body="Upload your script and get your Selznick evaluation."
            />
            <CrossLink
              href="/industry"
              label="For industry partners"
              body="See how the platform works for producers and reps."
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
