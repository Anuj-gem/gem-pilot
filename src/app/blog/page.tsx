// /blog — index listing of all published posts, on the same night sky
// as the rest of gem.studio. Cards sit a shade lighter than the ground.

import GemStudiosNav from '@/components/gem-studios-nav'
import { getAllPosts } from '@/lib/blog'
import { STATIC_POSTS } from '@/lib/blog-static'

export const metadata = {
  title: 'Blog — GEM Studios',
  description:
    'Notes from GEM Studios — what we\'re building, what we\'re finding, and how we think about making great films.',
}

// Posts are read off disk on each request. We tried `force-static` but
// Next's build-time tracer drops content/ from the bundle on Vercel,
// so the build-time read returned empty and the index showed no posts.
// `force-dynamic` reads at request time; outputFileTracingIncludes in
// next.config keeps content/ in the deploy bundle so the read works.
// This is a low-traffic page — perf cost is irrelevant. Anuj 2026-04-28.
export const dynamic = 'force-dynamic'
export const revalidate = 0

const NIGHT = '#0E0B14'
const CREAM = '#F3EFE8'
const GOLD = '#E4C97E'
const VIOLET = '#C4B5FD'

export default async function BlogIndexPage() {
  const md = await getAllPosts()
  const posts = [
    ...STATIC_POSTS.map(p => ({ ...p, kind: 'static' as const })),
    ...md.map(p => ({ slug: p.slug, title: p.title, date: p.date, summary: p.summary, kind: 'md' as const })),
  ].sort((a, b) => (a.date < b.date ? 1 : -1))

  return (
    <div style={{ minHeight: '100vh', color: CREAM, fontFamily: 'Inter, -apple-system, sans-serif' }}>
      <canvas id="page-field" aria-hidden="true" style={{ position: 'fixed', inset: 0, zIndex: -1, width: '100%', height: '100%', display: 'block' }} />
      <GemStudiosNav />
      <main style={{ maxWidth: 940, margin: '0 auto', padding: '70px 28px 120px' }}>
        <header style={{ marginBottom: 48 }}>
          <div style={{ letterSpacing: '0.22em', fontSize: 12.5, color: GOLD, textTransform: 'uppercase', fontWeight: 600 }}>
            GEM Studios
          </div>
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', Georgia, serif",
              fontWeight: 500,
              fontSize: 'clamp(40px, 5.2vw, 60px)',
              lineHeight: 1.08,
              letterSpacing: '-0.02em',
              margin: '18px 0 16px',
              color: CREAM,
            }}
          >
            Notes from <em style={{ fontStyle: 'italic', color: VIOLET }}>GEM Studios.</em>
          </h1>
          <p style={{ fontSize: 18, lineHeight: 1.55, color: 'rgba(243,239,232,0.7)', margin: 0, maxWidth: '58ch' }}>
            What we&apos;re building, what we&apos;re finding, and how we think about making great films.
          </p>
        </header>

        {posts.length === 0 ? (
          <p style={{ fontSize: 15, color: 'rgba(243,239,232,0.5)', margin: 0 }}>No posts yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 18 }}>
            {posts.map(post => (
              <li key={post.slug}>
                <a
                  href={`/blog/${post.slug}`}
                  className="gem-post-card"
                  style={{
                    display: 'block',
                    borderRadius: 16,
                    padding: '28px 30px 26px',
                    textDecoration: 'none',
                    background: 'linear-gradient(160deg, rgba(255,255,255,0.055), rgba(139,92,246,0.05))',
                    border: '1px solid rgba(255,255,255,0.10)',
                    transition: 'border-color .2s, background .2s',
                  }}
                >
                  <p style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.16em', fontWeight: 600, color: GOLD, margin: '0 0 12px' }}>
                    {formatDate(post.date)}
                  </p>
                  <h2
                    style={{
                      fontFamily: "'Cormorant Garamond', Georgia, serif",
                      fontWeight: 500,
                      fontSize: 'clamp(26px, 3.2vw, 34px)',
                      lineHeight: 1.15,
                      letterSpacing: '-0.01em',
                      color: CREAM,
                      margin: '0 0 12px',
                    }}
                  >
                    {post.title}
                  </h2>
                  <p style={{ fontSize: 16, lineHeight: 1.6, color: 'rgba(243,239,232,0.72)', margin: '0 0 16px', maxWidth: '68ch' }}>
                    {post.summary}
                  </p>
                  <span style={{ fontSize: 12.5, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', color: VIOLET }}>
                    Read the post →
                  </span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
      <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
      <script src="/gem-sky.js" async />
      <style>{`
        html, body { background: ${NIGHT} !important; }
        .gem-post-card:hover { border-color: rgba(228,201,126,0.45) !important; background: linear-gradient(160deg, rgba(255,255,255,0.08), rgba(139,92,246,0.08)) !important; }
      `}</style>
    </div>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })
}
