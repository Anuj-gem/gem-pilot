'use client'

// OnboardingShell — full-page layout for both guided flows (/submit and
// /onboarding). Calm, no top nav chrome, GEM mark in the corner. The
// checklist sits on the left on desktop, collapses above the content on
// mobile so the user can still see where they are without scrolling
// off the active step.
//
// Anuj 2026-04-30 v0.10.6.

import Link from 'next/link'
import { OnboardingChecklist, type ChecklistItem } from './onboarding-checklist'

interface Props {
  checklistTitle?: string
  checklistItems: ChecklistItem[]
  /** Big page heading above the active step's content. Optional —
   *  some step components carry their own heading. */
  heading?: string
  /** One-line subhead under the heading. */
  subhead?: string
  children: React.ReactNode
  /** Optional bottom-corner footer like "Already have an account? Log in". */
  footer?: React.ReactNode
}

export function OnboardingShell({
  checklistTitle,
  checklistItems,
  heading,
  subhead,
  children,
  footer,
}: Props) {
  return (
    <main className="min-h-screen bg-[var(--gem-black)] text-[var(--gem-gray-50)]">
      {/* GEM mark — small, top-left, links home so people aren't trapped. */}
      <header className="px-5 sm:px-8 pt-5 sm:pt-6">
        <Link href="/" prefetch={false} className="inline-flex items-center gap-2 group">
          <span
            aria-hidden="true"
            className="inline-block w-3 h-3 rotate-45"
            style={{
              background: 'linear-gradient(135deg, #a78bfa 0%, #7c3aed 100%)',
              boxShadow: '0 0 10px rgba(167, 139, 250, 0.5)',
            }}
          />
          <span className="text-[14px] font-bold tracking-tight text-[var(--gem-gray-50)] group-hover:text-white transition-colors">
            GEM
          </span>
        </Link>
      </header>

      <div className="max-w-[980px] mx-auto px-5 sm:px-8 py-8 sm:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-14">
          {/* CHECKLIST — top of page on mobile, left rail on desktop. */}
          <aside className="lg:sticky lg:top-12 lg:self-start">
            <OnboardingChecklist title={checklistTitle} items={checklistItems} />
          </aside>

          {/* CONTENT */}
          <section className="min-w-0">
            <header className="mb-6">
              <h1
                className="m-0 text-[28px] sm:text-[34px] font-bold tracking-tight leading-[1.15] text-[var(--gem-gray-50)]"
                style={{ fontFamily: 'Georgia, serif' }}
              >
                {heading}
              </h1>
              {subhead && (
                <p className="m-0 mt-2 text-[14.5px] sm:text-[15.5px] text-[var(--gem-gray-300)] leading-[1.55] max-w-[56ch]">
                  {subhead}
                </p>
              )}
            </header>
            <div>{children}</div>
            {footer && (
              <div className="mt-10 text-[12.5px] text-[var(--gem-gray-500)]">
                {footer}
              </div>
            )}
          </section>
        </div>
      </div>
    </main>
  )
}
