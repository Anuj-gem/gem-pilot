// /blog — index listing of all published posts.

import Link from 'next/link'
import Nav from '@/components/nav'
import { ArrowRight } from 'lucide-react'
import { getAllPosts } from '@/lib/blog'

export const metadata = {
  title: 'Blog — GEM',
  description:
    'Notes on the screenwriter network for industry. Product updates, how Selznick reads, and what makes a script qualify.',
}

// Posts are read off disk at build time; no need for revalidation
// since adding a post requires a deploy. Switch to ISR if we ever
// support drafts/CMS authoring.
export const dynamic = 'force-static'

export default async function BlogIndexPage() {
  const posts = await getAllPosts()
  return (
    <>
      <Nav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 pb-24">
        <header className="mb-10 sm:mb-14">
          <p
            className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-3"
            style={{ color: 'var(--gem-accent)' }}
          >
            Blog
          </p>
          <h1 className="text-[36px] sm:text-[48px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-[1.05] m-0 mb-4 font-[family-name:var(--font-display)]">
            Notes from GEM.
          </h1>
          <p className="text-[15.5px] sm:text-[16px] text-[var(--gem-gray-300)] leading-[1.6] m-0 max-w-[60ch]">
            Product updates, how Selznick reads, and what makes a script
            qualify. Subscribe by following along — every post lands at
            <code className="mx-1 px-1.5 py-0.5 rounded bg-[var(--gem-gray-900)] border border-[var(--gem-gray-700)] text-[13px]">
              /blog
            </code>
            and on the homepage.
          </p>
        </header>

        {posts.length === 0 ? (
          <p className="text-[15px] text-[var(--gem-gray-400)] m-0">
            No posts yet — first one ships at launch.
          </p>
        ) : (
          <ul className="list-none p-0 m-0 space-y-4">
            {posts.map(post => (
              <li key={post.slug}>
                <Link
                  href={`/blog/${post.slug}`}
                  className="group block rounded-2xl p-5 sm:p-6 transition-all hover:border-[var(--gem-gold)]"
                  style={{
                    background: '#fff',
                    border: '1px solid var(--gem-gray-700)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                  }}
                >
                  <p className="text-[12px] uppercase tracking-[0.16em] font-bold text-[var(--gem-gray-500)] m-0 mb-2">
                    {formatDate(post.date)}
                  </p>
                  <h2
                    className="text-[22px] sm:text-[26px] font-bold tracking-tight text-[var(--gem-gray-50)] leading-tight m-0 mb-2 group-hover:text-[var(--gem-accent)] transition-colors"
                    style={{ fontFamily: 'Georgia, serif' }}
                  >
                    {post.title}
                  </h2>
                  <p className="text-[14.5px] text-[var(--gem-gray-300)] leading-[1.55] m-0 mb-3">
                    {post.summary}
                  </p>
                  <span className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[var(--gem-accent)] group-hover:underline">
                    Read post
                    <ArrowRight size={13} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  )
}

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00Z')
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  })
}
