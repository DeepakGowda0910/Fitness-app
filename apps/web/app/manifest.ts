import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Fitness',
    short_name: 'Fitness',
    description: 'Calorie and macro targets, Indian diet plans and weekly check-ins that adapt to you.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f6f7f5',
    theme_color: '#0f766e',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' }],
  };
}
