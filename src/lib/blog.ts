// Blog — single source of truth for blog post data.
//
// Posts live in /content/blog/*.md as plain markdown with YAML
// frontmatter (see content/blog/README.md for the contract).
//
// At BUILD time, scripts/build-blog-index.mjs reads every post and
// writes them as a static array into src/lib/blog-data.generated.ts.
// This module imports from there — no fs at runtime, no Next.js
// build-tracer guesswork, no path-resolution drama.
//
// To add a post: drop a .md file in content/blog/, then run
// `npm run build` (which kicks the prebuild codegen).

import { BLOG_POSTS } from './blog-data.generated'

export interface BlogPost {
  slug: string
  title: string
  date: string // ISO yyyy-mm-dd
  summary: string
  author: string
  og_image: string | null
  draft: boolean
  content: string
}

/** All published posts (drafts excluded), sorted newest first. */
export async function getAllPosts(): Promise<BlogPost[]> {
  return BLOG_POSTS.filter((p) => !p.draft)
}

/** A single published post by slug. Returns null if not found / drafted. */
export async function getPost(slug: string): Promise<BlogPost | null> {
  const all = await getAllPosts()
  return all.find((p) => p.slug === slug) ?? null
}

/** Slug list for static params + sitemap. */
export async function getAllPostSlugs(): Promise<string[]> {
  const all = await getAllPosts()
  return all.map((p) => p.slug)
}
