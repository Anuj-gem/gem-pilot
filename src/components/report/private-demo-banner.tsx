'use client'

import Link from 'next/link'

interface PrivateDemoBannerProps {
  writerName: string
}

export function PrivateDemoBanner({ writerName }: PrivateDemoBannerProps) {
  return (
    <div className="rounded-xl overflow-hidden border border-amber-200 bg-amber-50 shadow-sm">
      {/* Private notice strip */}
      <div className="bg-amber-100 border-b border-amber-200 px-5 py-2 flex items-center gap-2">
        <span className="text-amber-600">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </span>
        <p className="text-xs font-medium text-amber-700 tracking-wide uppercase">
          Private — For {writerName} Only · Not listed on GEM
        </p>
      </div>

      {/* Main content */}
      <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-gray-800">
            This evaluation was prepared for {writerName}.
          </p>
          <p className="text-sm text-gray-500 mt-0.5">
            GEM analyzed your script using the same lens a development executive uses. This is a private preview — only you have this link.
          </p>
        </div>

        <Link
          href="/submit"
          className="shrink-0 inline-flex items-center gap-2 rounded-lg bg-gray-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-gray-700 transition-colors whitespace-nowrap"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
          Submit Your Next Draft
        </Link>
      </div>
    </div>
  )
}
