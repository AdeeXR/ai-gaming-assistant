import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // 'serverComponentsExternalPackages' has moved to 'serverExternalPackages'
  serverExternalPackages: [
    // Removed Genkit packages:
    // '@genkit-ai/core',
    // '@genkit-ai/flow',
    // '@genkit-ai/google-cloud',
    // Keep other necessary packages:
    '@google-cloud/storage', // Keep if you might use GCS for other purposes, otherwise can remove
    'firebase-admin', // Essential for Firebase Admin SDK
    '@supabase/supabase-js', // Essential for Supabase SDK
  ],
  images: {
    domains: ['placehold.co'],
  },
};

export default nextConfig;
