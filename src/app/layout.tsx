// src/app/layout.tsx
import type { Metadata } from 'next';
import { GeistSans, GeistMono } from 'geist/font'; // Corrected import for Geist fonts
import '@/styles/globals.css'; // Global CSS import
import AuthProvider from '@/components/AuthProvider'; // NextAuth.js session provider
import { FirebaseProvider } from '@/lib/firebase'; // Firebase context provider

// Initialize Geist fonts
const geistSans = GeistSans; // Use directly from geist/font
const geistMono = GeistMono; // Use directly from geist/font

export const metadata: Metadata = {
  title: 'AI Gaming Assistant', // Your project title
  description: 'AI-powered insights for improving your gameplay.', // Your project description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        // Apply Geist font classes to the body
        className={`${geistSans.className} ${geistMono.className} antialiased`}
      >
        {/* Wrap the entire application with AuthProvider first */}
        <AuthProvider>
          {/* Then wrap with FirebaseProvider. Components using Firebase context must be inside this. */}
          <FirebaseProvider>
            {children}
          </FirebaseProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
