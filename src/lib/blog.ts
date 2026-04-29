// Blog — single source of truth for reading posts off disk.
//
// Posts live in /content/blog/*.md as plain markdown with YAML frontmatter:
//   ---
//   title: "Selznick is here."
//   slug: launch
//   date: 2026-04-28
//   summary: "What changed and why it matters."
//   author: "Anuj Kommareddy"
//   og_image: /og/blog-launch.png   # optional, defaults to /og/blog-default.png
//   draft: false                     # optional; true hides from index + sitemap
//   ---
//
// Add a new post = drop a .md file in /content/blog. Filename and slug
// don't have to match — the slug field in frontmatter wins.
//
// File org (Anuj 2026-04-28): we keep posts as plain files in /content/
// so anyone can author them in markdown without spinning up a CMS. If we
// later want React components inside posts (interactive widgets,
// embedded charts), switch from react-markdown to next-mdx-remote and
// rename .md → .mdx.

import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

export interface BlogPost {
  slug: string
  title: string
  date: string // ISO yyyy-mm-dd
  summary: string
  author: string
  og_image?: string
  draft: boolean
  content: string
}

const POSTS_DIR = path.join(process.cwd(), 'content', 'blog')

async function readDirSafe(dir: string): Promise<string[]> {
  try {
    return await fs.readdir(dir)
  } catch {
    return []
  }
}

function normalizePost(raw: matter.GrayMatterFile<string>, fallbackSlug: string): BlogPost | null {
  const data = raw.data as Record<string, unknown>
  const title = typeof data.title === 'string' ? data.title : ''
  const slug = typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : fallbackSlug
  const date = typeof data.date === 'string' ? data.date : ''
  const summary = typeof data.summary === 'string' ? data.summary : ''
  const author = typeof data.author === 'string' ? data.author : 'Anuj Kommareddy'
  const og_image = typeof data.og_image === 'string' ? data.og_image : undefined
  const draft = data.draft === true
  if (!title || !slug || !date) return null
  return {
    slug,
    title,
    date,
    summary,
    author,
    og_image,
    draft,
    content: raw.content,
  }
}

/** All published posts (drafts excluded), sorted newest first. */
export async function getAllPosts(): Promise<BlogPost[]> {
  const files = await readDirSafe(POSTS_DIR)
  const posts: BlogPost[] = []
  for (const file of files) {
    if (!file.endsWith('.md') && !file.endsWith('.mdx')) continue
    const raw = await fs.readFile(path.join(POSTS_DIR, file), 'utf-8')
    const post = normalizePost(matter(raw), file.replace(/\.(md|mdx)$/, ''))
    if (!post || post.draft) continue
    posts.push(post)
  }
  return posts.sort((a, b) => (a.date < b.date ? 1 : -1))
}

/** A single published post by slug. Returns null if not found / drafted. */
export async function getPost(slug: string): Promise<BlogPost | null> {
  const all = await getAllPosts()
  return all.find(p => p.slug === slug) ?? null
}

/** Slug list for static params + sitemap. */
export async function getAllPostSlugs(): Promise<string[]> {
  const all = await getAllPosts()
  return all.map(p => p.slug)
}
