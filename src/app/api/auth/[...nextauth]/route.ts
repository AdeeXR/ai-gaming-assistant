// src/app/api/auth/[...nextauth]/route.ts
// This file acts as the NextAuth.js API route handler.

import NextAuth from 'next-auth';
// Import authOptions from the new dedicated configuration file
import { authOptions } from '@/lib/auth'; // Correct import path for authOptions

// Create the NextAuth handler using the imported authOptions
const handler = NextAuth(authOptions);

// Export the handler for GET and POST requests, as required by Next.js App Router API routes
export { handler as GET, handler as POST };
