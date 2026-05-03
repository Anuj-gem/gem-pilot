// Recommended for you — gated state for non-industry viewers.
// For now (Phase 1) the tab shows the same gate to EVERYONE: a short pitch
// + Apply button. Phase 2 will wire up an industry_user role, an approval
// flow, and an actual ranked list for approved users.
//
// The Apply button points at a placeholder URL — swap INDUSTRY_APPLY_URL
// once Anuj provides a real form.
import { Sparkles, Filter, Mail } from 'lucide-react'

// TODO(2026-04-23): replace with real form URL once Anuj finalizes it.
// mailto fallback makes it functional immediately — writer emails anuj@gem.studio
// with the pre-filled subject.
const INDUSTRY_APPLY_URL =
  'mailto:anuj@gem.studio?subject=GEM%20industry%20access%20request&body=Hi%20Anuj%20%E2%80%94%20I%27d%20like%20to%20apply%20for%20industry%20access%20on%20GEM.%0A%0AName%3A%0ACompany%2Frole%3A%0AWhat%20I%27m%20scouting%20for%20(genres%2C%20formats%2C%20mandates)%3A%0A'

export function RecommendedGate() {
  return (
    <section
      className="relative overflow-hidden rounded-2xl p-8 sm:p-10"
      style={{
        background:
          'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(212,160,23,0.06) 60%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(124,58,237,0.28)',
      }}
    >
      <div className="max-w-[62ch]">
        <p
          className="text-[11px] uppercase tracking-[0.2em] font-bold mb-3 m-0"
          style={{ color: 'var(--gem-accent)' }}
        >
          Industry partners only
        </p>
        <h2
          className="text-[28px] sm:text-[34px] font-semibold leading-[1.15] m-0 mb-3 text-[var(--gem-gray-50)]"
          style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
        >
          Scripts curated for your slate.
        </h2>
        <p className="text-[15px] sm:text-[16px] text-[var(--gem-gray-200)] leading-[1.65] m-0 mb-7">
          GEM&apos;s evaluation engine matches industry partners with the scripts
          most likely to fit what they&apos;re looking for — by genre, tone,
          format, and production profile. No slush pile. No cold feed. A list
          that&apos;s actually worth your 20 minutes.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
          <ValueProp
            icon={<Sparkles size={18} />}
            title="Matched to your mandate"
            body="Tell us what you're scouting — we surface the scripts that fit."
          />
          <ValueProp
            icon={<Filter size={18} />}
            title="Quality-vetted"
            body="Every script has cleared the bar to appear on GEM at all."
          />
          <ValueProp
            icon={<Mail size={18} />}
            title="Direct to the writer"
            body="Reach out to writers directly from their report page."
          />
        </div>

        <a
          href={INDUSTRY_APPLY_URL}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-[14px] font-semibold text-white transition-colors hover:brightness-110"
          style={{ background: 'var(--gem-accent)' }}
        >
          Apply for industry access
        </a>
        <p className="text-[12px] text-[var(--gem-gray-500)] m-0 mt-3">
          We review applications by hand. Most responses within 48 hours.
        </p>
      </div>
    </section>
  )
}

function ValueProp({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <div>
      <div
        className="inline-flex items-center justify-center w-8 h-8 rounded-full mb-2"
        style={{
          background: 'rgba(124,58,237,0.1)',
          color: 'var(--gem-accent)',
        }}
      >
        {icon}
      </div>
      <p className="text-[13.5px] font-semibold text-[var(--gem-gray-50)] m-0 mb-1 leading-tight">
        {title}
      </p>
      <p className="text-[12.5px] text-[var(--gem-gray-400)] m-0 leading-[1.5]">
        {body}
      </p>
    </div>
  )
}
