// src/app/layout.tsx
import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google"; // Keep your Geist font imports
import "./globals.css";
import { SessionProvider } from 'next-auth/react'; // Import SessionProvider
import { FirebaseProvider } from '@/lib/firebase'; // Import FirebaseProvider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Gaming Assistant", // You might want to update this title
  description: "AI-powered player assistance for gaming and esports", // You might want to update this description
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Wrap your children with SessionProvider and FirebaseProvider */}
        <SessionProvider>
          <FirebaseProvider>
            {children}
          </FirebaseProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
