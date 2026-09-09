import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Pin the workspace root. Without it, Turbopack walks up looking for a lock
  // file and can settle on the home directory.
  turbopack: { root: import.meta.dirname },
  /*
   * No server-side image optimiser. Cloudflare Workers has none without a paid
   * service, so images are committed to /public already sized and compressed,
   * and <Picture> carries explicit dimensions to keep layout shift at zero.
   */
  images: { unoptimized: true },
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
