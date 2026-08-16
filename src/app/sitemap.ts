import type { MetadataRoute } from 'next'
import { createClient } from '@/lib/supabase-server'
import { getAllPosts } from '@/lib/blog'

const SITE_URL = 'https://www.gem.studio'

export const dynamic = 'force-dynamic'
export const revalidate = 3600 // 1 hour

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date()

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${SITE_URL}/`,
      lastModified: now,
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${SITE_URL}/sample`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.9,
    },
    {
      url: `${SITE_URL}/blog`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      // standalone HTML research post, served via middleware rewrite
      url: `${SITE_URL}/blog/which-hollywood-directors-consistently-exceed-expectations`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/writers`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/industry`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/selznick`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${SITE_URL}/apply`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${SITE_URL}/submit`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${SITE_URL}/login`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${SITE_URL}/signup`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.5,
    },
  ]

  // Blog posts — read off disk via getAllPosts(). Drafts are excluded
  // by the lib so the sitemap always reflects published-only.
  let blogRoutes: MetadataRoute.Sitemap = []
  try {
    const posts = await getAllPosts()
    blogRoutes = posts.map(p => ({
      url: `${SITE_URL}/blog/${p.slug}`,
      lastModified: new Date(p.date + 'T00:00:00Z'),
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  } catch {
    blogRoutes = []
  }

  // Sample report pages — high-value SEO targets (produced screenplay titles)
  let sampleRoutes: MetadataRoute.Sitemap = []
  try {
    const supabase = await createClient()
    const { data: samples } = await supabase
      .from('script_submissions')
      .select('sample_slug, created_at')
      .eq('is_sample', true)
      .eq('status', 'completed')
      .not('sample_slug', 'is', null)

    sampleRoutes = (samples ?? []).map((s: { sample_slug: string | null; created_at: string }) => ({
      url: `${SITE_URL}/sample/${s.sample_slug}`,
      lastModified: s.created_at ? new Date(s.created_at) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    }))
  } catch {
    // If DB is unreachable at build time, fall back to static routes only
    sampleRoutes = []
  }

  return [...staticRoutes, ...blogRoutes, ...sampleRoutes]
}
