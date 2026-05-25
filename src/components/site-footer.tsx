// Site-wide footer. Slim by design — just the legal links + a quiet
// copyright. Mounted on the global layout so every page picks it up.

import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer
      className="gem-no-print mt-auto py-3 px-4 sm:px-6"
    >
      <div className="max-w-3xl mx-auto flex items-center justify-between gap-4 flex-wrap">
        <p className="text-[11px] text-white/30 m-0">
          © {new Date().getFullYear()} GEM Studios
        </p>
        <nav className="flex items-center gap-4 text-[11px]">
          <Link
            href="/privacy"
            className="text-white/30 hover:text-white/60 transition-colors no-underline"
          >
            Privacy
          </Link>
          <Link
            href="/terms"
            className="text-white/30 hover:text-white/60 transition-colors no-underline"
          >
            Terms
          </Link>
          <a
            href="mailto:support@gem.studio"
            className="text-white/30 hover:text-white/60 transition-colors no-underline"
          >
            Contact
          </a>
        </nav>
      </div>
    </footer>
  )
}
