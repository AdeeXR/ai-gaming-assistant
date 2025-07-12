import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 'serverComponentsExternalPackages' has moved from 'experimental'
  serverExternalPackages: [
    '@google-cloud/storage',
    'firebase-admin',
    '@genkit-ai/core',
    '@genkit-ai/flow',
    '@genkit-ai/google-cloud',
    '@supabase/supabase-js', // Add this as we are using Supabase
  ],
  images: {
    domains: ['placehold.co'],
  },
};

export default nextConfig;