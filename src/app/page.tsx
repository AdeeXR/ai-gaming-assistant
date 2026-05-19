// src/app/page.tsx
"use client";

import { useSession } from 'next-auth/react';
import LoginForm from '@/components/LoginForm';
import Dashboard from '@/components/Dashboard';

export default function HomePage() {
  const { data: session, status } = useSession();

  if (status === 'loading') {
    return (
      <main className="min-h-screen bg-[#09090b] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-cyan-400 font-mono">Loading...</p>
        </div>
      </main>
    );
  }

  return (
    <main>
      {session ? <Dashboard /> : <LoginForm />}
    </main>
  );
}
