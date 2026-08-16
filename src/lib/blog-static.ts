// Standalone HTML posts — full-design research pieces that live as
// self-contained files in /public/blog/<slug>.html and are served at
// /blog/<slug> by a middleware rewrite (see src/middleware.ts). They are
// NOT run through the markdown renderer; this list only exists so the
// /blog index and the sitemap know about them.
//
// To add one: drop the .html in public/blog/, add a rewrite line in
// middleware.ts, and add an entry here. Anuj 2026-08-12.

export interface StaticPost {
  slug: string
  title: string
  date: string // ISO yyyy-mm-dd
  summary: string
}

export const STATIC_POSTS: StaticPost[] = [
  {
    slug: 'which-hollywood-directors-consistently-exceed-expectations',
    title: 'Which Hollywood directors consistently exceed “expectations”?',
    date: '2026-08-12',
    summary:
      'Some directors clearly hit it out of the park, over and over, beyond what anyone could reasonably have expected. That is usually written off as unknowable. We set out to understand it: who does it, and what makes it happen.',
  },
]
