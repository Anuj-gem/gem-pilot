'use client'

import Link from 'next/link'

interface SmsConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
  /** When true, renders white text for dark backgrounds */
  dark?: boolean
}

export default function SmsConsent({ checked, onChange, dark }: SmsConsentProps) {
  const textColor = dark ? '#ffffff' : undefined
  const mutedColor = dark ? 'rgba(255,255,255,0.5)' : undefined
  const borderColor = dark ? 'rgba(255,255,255,0.15)' : undefined

  return (
    <div
      className="w-full rounded-lg border border-[var(--gem-gray-700,#e5e7eb)] p-3"
      style={borderColor ? { borderColor } : undefined}
    >
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, minWidth: 16, height: 16, background: 'transparent' }}
          className="mt-[1px] rounded shrink-0 accent-[var(--gem-accent,#7c3aed)]"
        />
        <span className="text-[13px] font-medium" style={textColor ? { color: textColor } : { color: 'currentColor' }}>
          I would like to receive updates by text
        </span>
      </label>
      <p className="text-[12px] leading-[1.5] mt-1.5 mb-0 ml-6" style={{ color: mutedColor || 'currentColor', opacity: dark ? 1 : 0.5 }}>
        We&apos;ll be sending you updates on your script evaluations and industry
        opportunities. Message and data rates may apply. Message frequency
        varies. At any time you can text HELP for help or STOP to opt out.
      </p>
      <div className="mt-2 ml-6">
        <Link href="/privacy" className="text-[12px] underline" style={{ color: mutedColor || 'currentColor', opacity: dark ? 1 : 0.5 }}>
          Privacy Policy
        </Link>
      </div>
    </div>
  )
}
