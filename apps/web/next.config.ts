import type { NextConfig } from 'next';

/** Set for the GitHub Pages build: the site is plain files served under /<repo>/. */
const staticExport = process.env.NEXT_OUTPUT === 'export';
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || undefined;

const securityHeaders = [
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  ...(basePath ? { basePath } : {}),
  ...(staticExport
    ? { output: 'export', trailingSlash: true, images: { unoptimized: true } }
    : {
        // Static hosts such as GitHub Pages cannot send headers; a Next.js server can.
        async headers() {
          return [{ source: '/:path*', headers: securityHeaders }];
        },
      }),
};

export default config;
