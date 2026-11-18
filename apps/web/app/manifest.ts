import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hyper Active',
    short_name: 'Hyper Active',
    description: 'Calorie and macro targets, Indian diet plans and weekly check-ins that adapt to you.',
    start_url: `${base}/`,
    scope: `${base}/`,
    display: 'standalone',
    background_color: '#f5f7fa',
    theme_color: '#38bdf8',
    icons: [{ src: `${base}/icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
