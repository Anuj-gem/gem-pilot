'use client'

// Pro upsell — shown to free-tier writers when at least one of their
// matches has come back as Interested. Sits below the projects list.
// Visual is the violet 2px-bordered editorial card from the v3 mockup.

import { UnlockTrigger } from '@/components/dashboard/unlock-trigger'

export function ProUpsellCard() {
  return (
    <div className="mt-8">
      <div
        className="rounded-2xl px-6 sm:px-8 py-6 sm:py-7 grid items-center gap-5 sm:gap-7 grid-cols-1 sm:grid-cols-[auto_1fr_auto]"
        style={{
          background:
            'radial-gradient(ellipse at 0% 50%, rgba(124,58,237,0.05) 0%, transparent 55%), #fff',
          border: '2px solid var(--gem-accent)',
          boxShadow: '0 2px 14px rgba(124,58,237,0.08)',
        }}
      >
        <div
          aria-hidden
          className="hidden sm:flex w-11 h-11 rounded-xl items-center justify-center shrink-0"
          style={{
            background: 'rgba(124,58,237,0.10)',
            border: '1px solid rgba(124,58,237,0.20)',
          }}
        >
          <span
            className="block w-3 h-3 rounded-full"
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 0 0 5px rgba(124,58,237,0.18)',
            }}
          />
        </div>

        <div className="min-w-0">
          <div
            className="text-[10.5px] uppercase tracking-[0.22em] font-bold flex items-center gap-2 mb-1.5"
            style={{ color: 'var(--gem-accent)' }}
          >
            <span
              aria-hidden
              className="inline-block w-[22px] h-0.5 rounded-sm"
              style={{ background: 'var(--gem-gold)' }}
            />
            A producer is waiting
          </div>
          <p className="text-[17px] sm:text-[19px] font-bold text-[var(--gem-gray-50)] leading-snug tracking-tight m-0 mb-1.5">
            Send a new draft and keep your script in continuous rotation.
          </p>
          <p className="text-[13.5px] sm:text-[14px] text-[var(--gem-gray-300)] leading-[1.5] max-w-[58ch] m-0">
            Pro unlocks unlimited drafts, continuous matching with new partners
            as they come online, and direct response when someone asks for revisions.
          </p>
        </div>

        <UnlockTrigger
          ariaLabel="Upgrade to Pro"
          className="inline-flex items-center justify-center gap-1 text-[14px] font-bold rounded-xl whitespace-nowrap transition-all duration-150 hover:brightness-110 active:scale-[0.97] text-white"
        >
          <span
            style={{
              background: 'var(--gem-accent)',
              boxShadow: '0 2px 8px rgba(124,58,237,0.35)',
              padding: '12px 20px',
              borderRadius: '10px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            Start free trial
          </span>
        </UnlockTrigger>
      </div>
    </div>
  )
}
