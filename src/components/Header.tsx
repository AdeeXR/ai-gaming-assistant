// src/components/Header.tsx
'use client'; // This component uses client-side hooks

import React from 'react';
import Link from 'next/link';
import { useSession, signOut } from 'next-auth/react'; // Import useSession and signOut from NextAuth.js
import { usePathname } from 'next/navigation'; // Hook to get current path

const Header: React.FC = () => {
  const { data: session, status } = useSession(); // Get session data and loading status
  const pathname = usePathname(); // Get current pathname for active link styling

  const navItems = [
    { name: 'Dashboard', href: '/dashboard' },
    { name: 'Profile', href: '/profile' },
    { name: 'Achievements', href: '/achievements' },
  ];

  return (
    <header className="bg-gray-800 text-white p-4 shadow-lg fixed top-0 w-full z-50">
      <nav className="container mx-auto flex justify-between items-center">
        <Link href="/" className="text-2xl font-bold text-teal-400 hover:text-teal-300 transition-colors">
          AI Gaming Assistant
        </Link>
        <div className="space-x-6 flex items-center">
          {navItems.map((item) => (
            <Link
              key={item.name}
              href={item.href}
              className={`px-4 py-2 rounded-md transition-colors ${
                pathname === item.href ? 'bg-teal-600 text-white' : 'hover:bg-gray-700 text-gray-300'
              }`}
            >
              {item.name}
            </Link>
          ))}
          {status === 'authenticated' && session?.user?.email && (
            <span className="text-xs text-gray-400 bg-gray-700 px-3 py-1 rounded-full truncate max-w-[150px]">
              {session.user.email}
            </span>
          )}
          {status === 'loading' ? (
            <div className="w-20 h-8 bg-gray-700 rounded-md animate-pulse"></div> // Loading state for user info
          ) : session ? (
            <button
              onClick={() => signOut()} // Sign out using NextAuth.js
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-md transition-colors"
            >
              Sign Out
            </button>
          ) : (
            <Link
              href="/api/auth/signin" // Link to NextAuth.js sign-in page (or directly to login form if no custom page)
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-md transition-colors"
            >
              Sign In
            </Link>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;