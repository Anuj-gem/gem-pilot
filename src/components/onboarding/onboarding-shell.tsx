'use client'

// OnboardingShell — full-page layout for both /submit and /onboarding.
//
// Three persistent zones:
//   1. Sticky top bar: GEM mark + back/skip/continue actions
//   2. Sticky checklist:
//        desktop → vertical timeline in left rail
//        mobile  → compact horizontal pill strip pinned below the top bar
//   3. Content area: just the form, no embedded buttons
//
// The framingBanner sits above the heading and stays the same across all
// steps — "Your report drops in 60s" / "Get your account set up" — so the
// user always knows what they're working toward.
//
// Anuj 2026-04-30 v0.10.8.

import Link from 'next/link'
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { OnboardingChecklist, type ChecklistItem } from './onboarding-checklist'

export interface ActionBar {
  /** Back arrow handler. Omit to hide the back button. */
  onBack?: () => void
  /** Primary forward action. Omit to hide. */
  onContinue?: () => void
  /** Skip action — equally weighted with Continue when present. */
  onSkip?: () => void
  /** Continue button label. Defaults to "Continue". */
  continueLabel?: string
  /** Continue button disabled state. */
  continueDisabled?: boolean
  /** Continue button loading state. */
  continueLoading?: boolean
  /** Step label shown center of action bar (mobile) and as a subtitle on
   *  desktop. e.g. "Privacy", "Profile". */
  label?: string
}

interface Props {
  checklistTitle?: string
  checklistItems: ChecklistItem[]
  /** Big page heading above the active step's content. Optional —
   *  some step components carry their own heading. */
  heading?: string
  /** One-line subhead under the heading. */
  subhead?: string
  /** Persistent banner above the heading on every step. Quietly reminds
   *  the user why they're here ("Your report drops in 60s"). */
  framingBanner?: React.ReactNode
  /** Top action bar — buttons live here, not in the form. */
  actionBar?: ActionBar
  children: React.ReactNode
  /** Optional bottom-corner footer like "Already have an account? Log in". */
  footer?: React.ReactNode
}

export function OnboardingShell({
  checklistTitle,
  checklistItems,
  heading,
  subhead,
  framingBanner,
  actionBar,
  children,
  footer,
}: Props) {
  const showAction = !!actionBar
  return (
    <main className="min-h-screen bg-[var(--gem-black)] text-[var(--gem-gray-50)]">
      {/* STICKY TOP BAR — GEM mark + action buttons. */}
      <div
        className="sticky top-0 z-30 border-b border-[var(--gem-gray-700)] bg-[var(--gem-black)]/95 backdrop-blur-sm"
      >
        <div className="max-w-[980px] mx-auto px-4 sm:px-8 h-14 flex items-center justify-between gap-3">
          <Link href="/" prefetch={false} className="inline-flex items-center gap-2 group shrink-0">
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

          {showAction && (
            <div className="flex items-center gap-2 sm:gap-3">
              {actionBar?.onBack && (
                <button
                  type="button"
                  onClick={actionBar.onBack}
                  aria-label="Back"
                  className="inline-flex items-center justify-center w-9 h-9 rounded-lg text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] hover:bg-[var(--gem-gray-900)] transition-colors"
                >
                  <ArrowLeft size={18} />
                </button>
              )}
              {actionBar?.onSkip && (
                <button
                  type="button"
                  onClick={actionBar.onSkip}
                  className="text-[13px] font-semibold text-[var(--gem-gray-300)] hover:text-[var(--gem-gray-50)] px-2 py-1.5 transition-colors"
                >
                  Skip
                </button>
              )}
              {actionBar?.onContinue && (
                <button
                  type="button"
                  onClick={actionBar.onContinue}
                  disabled={actionBar.continueDisabled || actionBar.continueLoading}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3.5 sm:px-4 py-2 text-[13.5px] font-semibold text-white transition-all duration-150 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{ background: 'var(--gem-accent)' }}
                >
                  {actionBar.continueLoading && <Loader2 size={14} className="animate-spin" />}
                  {actionBar.continueLabel || 'Continue'}
                  {!actionBar.continueLoading && <ArrowRight size={14} />}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Compact checklist on mobile — pinned below the action bar so
            it's always visible regardless of scroll position. */}
        <div className="lg:hidden border-t border-[var(--gem-gray-800)] px-4 py-2.5 max-w-[980px] mx-auto">
          <OnboardingChecklist
            title={checklistTitle}
            items={checklistItems}
            variant="compact"
          />
        </div>
      </div>

      <div className="max-w-[980px] mx-auto px-5 sm:px-8 py-6 sm:py-10">
        <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-8 lg:gap-14">
          {/* CHECKLIST — vertical timeline on desktop only (mobile uses
              the compact strip pinned to the top bar). */}
          <aside className="hidden lg:block lg:sticky lg:top-24 lg:self-start">
            <OnboardingChecklist title={checklistTitle} items={checklistItems} />
          </aside>

          {/* CONTENT */}
          <section className="min-w-0">
            {framingBanner && (
              <div className="mb-5 rounded-xl px-3.5 py-2.5 text-[12.5px] leading-snug text-[var(--gem-gray-300)]"
                style={{
                  background: 'rgba(124,58,237,0.08)',
                  border: '1px solid rgba(124,58,237,0.20)',
                }}
              >
                {framingBanner}
              </div>
            )}

            {heading && (
              <header className="mb-6">
                <h1
                  className="m-0 text-[26px] sm:text-[32px] font-bold tracking-tight leading-[1.15] text-[var(--gem-gray-50)]"
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
            )}
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
