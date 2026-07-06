// /blog/[slug] — individual post page.

import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import GemStudiosNav from '@/components/gem-studios-nav'
import { ArrowLeft } from 'lucide-react'
import { getAllPostSlugs, getPost } from '@/lib/blog'

const SITE_URL = 'https://www.gem.studio'

// Read on each request — same reasoning as /blog page (build-time
// content/ access on Vercel was returning empty, causing 404s for new
// posts). outputFileTracingIncludes ensures content/ is bundled at
// runtime. Anuj 2026-04-28.
export const dynamic = 'force-dynamic'
export const revalidate = 0
export const dynamicParams = true

// Kept for Next.js to discover the route surface — but unused while
// dynamic='force-dynamic' is in effect. Safe to keep so we can flip
// back to static rendering later without restoring this function.
export async function generateStaticParams() {
  const slugs = await getAllPostSlugs()
  return slugs.map(slug => ({ slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return { title: 'Post not found — GEM' }
  const url = `${SITE_URL}/blog/${post.slug}`
  // Falls back to the per-post dynamic OG image route (opengraph-image.tsx)
  // rather than a static default file, since /og/blog-default.png doesn't
  // exist in public/. Anuj 2026-07-06.
  const og = post.og_image || `/blog/${post.slug}/opengraph-image`
  return {
    title: `${post.title} — GEM`,
    description: post.summary,
    alternates: { canonical: url },
    openGraph: {
      type: 'article',
      url,
      title: post.title,
      description: post.summary,
      images: [{ url: og.startsWith('http') ? og : `${SITE_URL}${og}` }],
      publishedTime: post.date,
      authors: [post.author],
    },
    twitter: {
      card: 'summary_large_image',
      title: post.title,
      description: post.summary,
      images: [og.startsWith('http') ? og : `${SITE_URL}${og}`],
    },
  }
}

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) notFound()

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    datePublished: post.date,
    author: { '@type': 'Person', name: post.author },
    publisher: { '@type': 'Organization', name: 'GEM' },
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
    description: post.summary,
  }

  return (
    <>
      <GemStudiosNav />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14 pb-24">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-[var(--gem-gray-400)] hover:text-[var(--gem-accent)] transition-colors mb-8"
        >
          <ArrowLeft size={14} />
          All posts
        </Link>

        <header className="mb-10">
          <p
            className="text-[11px] uppercase tracking-[0.22em] font-bold m-0 mb-3"
            style={{ color: 'var(--gem-accent)' }}
          >
            {formatDate(post.date)} · {post.author}
          </p>
          <h1 className="text-[34px] sm:text-[48px] font-extrabold tracking-tight text-[var(--gem-gray-50)] leading-[1.05] m-0 mb-4 font-[family-name:var(--font-display)]">
            {post.title}
          </h1>
          <p className="text-[16px] sm:text-[18px] text-[var(--gem-gray-300)] leading-[1.55] m-0 max-w-[60ch]">
            {post.summary}
          </p>
        </header>

        <article className="gem-prose">
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            rehypePlugins={[rehypeRaw]}
          >
            {post.content}
          </ReactMarkdown>
        </article>

        <div className="mt-14 pt-8 border-t border-[var(--gem-gray-800)]">
          <Link
            href="/blog"
            className="inline-flex items-center gap-1.5 text-[14px] font-semibold text-[var(--gem-accent)] hover:text-[var(--gem-gray-50)] transition-colors"
          >
            <ArrowLeft size={14} />
            More posts
          </Link>
        </div>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
