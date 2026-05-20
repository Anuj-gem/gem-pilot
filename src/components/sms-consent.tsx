'use client'

import Link from 'next/link'

interface SmsConsentProps {
  checked: boolean
  onChange: (checked: boolean) => void
}

export default function SmsConsent({ checked, onChange }: SmsConsentProps) {
  return (
    <div className="w-full rounded-lg border border-[var(--gem-gray-700,#e5e7eb)] p-3">
      <label className="flex items-start gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          style={{ width: 16, minWidth: 16, height: 16, background: 'transparent' }}
          className="mt-[1px] rounded shrink-0 accent-[var(--gem-accent,#7c3aed)]"
        />
        <span className="text-[13px] font-medium text-current">
          I would like to receive updates by text
        </span>
      </label>
      <p className="text-[12px] leading-[1.5] text-current opacity-50 mt-1.5 mb-0 ml-6">
        We&apos;ll be sending you updates on your script evaluations and industry
        opportunities. Message and data rates may apply. Message frequency
        varies. At any time you can text HELP for help or STOP to opt out.
      </p>
      <div className="mt-2 ml-6">
        <Link href="/privacy" className="text-[12px] text-current opacity-50 underline">
          Privacy Policy
        </Link>
      </div>
    </div>
  )
}
