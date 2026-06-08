// Editorial masthead used on /blog and /blog/[slug]. Sits below the
// global Nav and gives the blog its own brand surface — GEM diamond +
// wordmark + a "Blog" tag — so posts read like articles, not like
// product pages with a heading.
//
// Anuj 2026-04-28: keep this clean and editorial. Single horizontal
// rule under it. No CTAs, no nav clutter — just a calm header.

import Link from 'next/link'

export function BlogMasthead() {
  return (
    <div
      className="border-b border-[var(--gem-gray-700)]"
      style={{
        background:
          'linear-gradient(180deg, var(--gem-gray-900) 0%, transparent 100%)',
      }}
    >
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        <Link
          href="/blog"
          className="inline-flex items-center gap-2.5 group"
          aria-label="GEM Blog"
        >
          <span
            aria-hidden
            className="inline-block w-3.5 h-3.5 sm:w-4 sm:h-4 rotate-45"
            style={{
              background:
                '#7c3aed',
              boxShadow: '0 0 12px rgba(167,139,250,0.45)',
            }}
          />
          <span
            className="text-[20px] sm:text-[22px] font-extrabold tracking-tight text-[var(--gem-gray-50)]"
            style={{ fontFamily: 'Georgia, "Times New Roman", serif' }}
          >
            GEM
          </span>
          <span
            aria-hidden
            className="inline-block w-px h-5 bg-[var(--gem-gray-700)] mx-0.5"
          />
          <span
            className="text-[11px] sm:text-[12px] uppercase tracking-[0.28em] font-bold text-[var(--gem-gray-400)] group-hover:text-[var(--gem-accent)] transition-colors"
          >
            Blog
          </span>
        </Link>
      </div>
    </div>
  )
}
