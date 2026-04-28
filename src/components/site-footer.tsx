// Site-wide footer. Slim by design — just the legal links + a quiet
// copyright. Mounted on the global layout so every page picks it up.

import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer
      className="gem-no-print mt-auto border-t pt-6 pb-8 px-4 sm:px-6"
      style={{ borderColor: 'var(--gem-gray-800)' }}
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[12px] text-[var(--gem-gray-500)] m-0">
          © {new Date().getFullYear()} GEM Studios
        </p>
        <nav className="flex items-center gap-4 text-[12px]">
          <Link
            href="/privacy"
            className="text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-100)] transition-colors"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-100)] transition-colors"
          >
            Terms
          </Link>
          <a
            href="mailto:support@gem.studio"
            className="text-[var(--gem-gray-400)] hover:text-[var(--gem-gray-100)] transition-colors"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  )
}
