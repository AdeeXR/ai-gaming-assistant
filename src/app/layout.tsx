// src/app/layout.tsx
import type { Metadata } from 'next';
import { GeistSans, GeistMono } from 'geist/font';
import '@/styles/globals.css';
import AuthProvider from '@/components/AuthProvider';
import { FirebaseProvider } from '@/lib/firebase';
import DashboardNav from '@/components/DashboardNav';

export const metadata: Metadata = {
  title: 'Smart Detective',
  description: 'AI-powered competitive gaming coaching',
};

const geistSans = GeistSans;
const geistMono = GeistMono;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.className} ${geistMono.className} antialiased`}>
        <AuthProvider>
          <FirebaseProvider>
            <DashboardNav />
            {children}
          </FirebaseProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
