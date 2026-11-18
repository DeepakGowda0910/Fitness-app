import type { MetadataRoute } from 'next';

export const dynamic = 'force-static';

const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fitness',
    short_name: 'Fitness',
    description: 'Calorie and macro targets, Indian diet plans and weekly check-ins that adapt to you.',
    start_url: `${base}/`,
    scope: `${base}/`,
    display: 'standalone',
    background_color: '#f6f7f5',
    theme_color: '#0f766e',
    icons: [{ src: `${base}/icon.svg`, sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
