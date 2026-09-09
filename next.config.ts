import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root. Without it, Turbopack walks up looking for a lock
  // file and can settle on the home directory.
  turbopack: { root: import.meta.dirname },
  // Images are pre-optimised at upload time (client-side resize -> WebP at 3 widths,
  // stored in Supabase Storage). We emit real srcsets from <Picture />, so we do not
  // need — and on Cloudflare Workers cannot freely use — a server image optimiser.
  images: { unoptimized: true },
  experimental: {
    // Server Actions receive small JSON payloads only; image bytes go straight to
    // Supabase Storage from the browser via a signed upload URL.
    serverActions: { bodySizeLimit: '1mb' },
  },
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), browsing-topics=()',
          },
        ],
      },
    ]
  },
}

export default nextConfig
