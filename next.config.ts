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
  // pdfkit ships with .afm font metric files alongside its JS. Next's default
  // bundler tree-shakes them out, which makes the package crash at runtime
  // on Vercel ("ENOENT: ... Helvetica.afm"). Marking pdfkit as an external
  // server package leaves it as a regular node_modules require at runtime,
  // with all its data files intact.
  serverExternalPackages: ['pdfkit'],
};

export default nextConfig;
