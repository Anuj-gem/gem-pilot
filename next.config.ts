import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
  // Ensure content/ markdown files are bundled into the Vercel deploy
  // output. The blog reads from content/blog/*.md at build time
  // (generateStaticParams) AND at request time (sitemap.ts is
  // dynamic='force-dynamic'). Without this, Next's tracer drops the
  // files from the deploy bundle and reads return empty → 404s for
  // new posts and missing /blog entries from sitemap.xml.
  // Anuj 2026-04-28.
  outputFileTracingIncludes: {
    '/blog': ['./content/blog/**/*'],
    '/blog/[slug]': ['./content/blog/**/*'],
    '/sitemap.xml': ['./content/blog/**/*'],
  },
};

export default nextConfig;
