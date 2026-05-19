// src/components/LoginForm.tsx
"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { useFirebase } from '@/lib/firebase';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Zap, LogIn } from 'lucide-react';

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { auth } = useFirebase();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    if (!auth) {
      setError("Firebase Auth not initialized.");
      setIsModalOpen(true);
      setIsLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
        setSuccessMessage('Registration successful! You can now log in.');
        setIsRegistering(false);
        setEmail('');
        setPassword('');
        setIsModalOpen(true);
      } else {
        const result = await signIn('credentials', {
          redirect: false,
          email,
          password,
        });

        if (result?.error) {
          setError(result.error);
          setIsModalOpen(true);
        } else {
          setSuccessMessage('Login successful! Redirecting...');
          setIsModalOpen(true);
          setTimeout(() => {
            router.push('/');
          }, 1500);
        }
      }
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      console.error('Authentication error:', err);
      if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential') {
        setError('Invalid email or password.');
      } else {
        setError(firebaseError.message || 'An unexpected error occurred during authentication.');
      }
      setIsModalOpen(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-hidden relative flex flex-col items-center justify-center p-4">
      {/* Ambient glows */}
      <div className="absolute top-20 left-10 w-[400px] h-[400px] bg-cyan-500/20 blur-[100px] rounded-full opacity-40 pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[400px] h-[400px] bg-fuchsia-500/20 blur-[100px] rounded-full opacity-40 pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Zap className="w-8 h-8 text-cyan-400" />
            <h1 className="text-4xl font-black uppercase tracking-tighter bg-gradient-to-r from-cyan-400 via-cyan-300 to-fuchsia-500 bg-clip-text text-transparent">
              Smart Detective
            </h1>
          </div>
          <p className="text-cyan-400/60 uppercase tracking-widest text-xs">AI-Powered Gaming Analysis</p>
        </div>

        {/* Auth Card */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300">
          <h2 className="text-2xl font-bold uppercase tracking-tighter mb-8 text-center">
            {isRegistering ? 'Create Account' : 'Enter The Arena'}
          </h2>

          <form onSubmit={handleAuth} className="space-y-6">
            {/* Email Input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                placeholder="your@email.com"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
                required
              />
            </div>

            {/* Password Input */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                placeholder="••••••••••"
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200"
                required
              />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-bold uppercase tracking-wider py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  {isRegistering ? 'Create Account' : 'Login'}
                </>
              )}
            </Button>
          </form>

          {/* Toggle Register/Login */}
          <div className="mt-6 text-center border-t border-white/10 pt-6">
            <p className="text-white/60 text-sm mb-3">
              {isRegistering ? 'Already have an account?' : 'New to Smart Detective?'}
            </p>
            <button
              onClick={() => {
                setIsRegistering(!isRegistering);
                setError(null);
                setSuccessMessage(null);
              }}
              disabled={isLoading}
              className="text-cyan-400 hover:text-cyan-300 font-semibold uppercase tracking-wider text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isRegistering ? 'Sign In' : 'Create Account'}
            </button>
          </div>
        </div>

        {/* Info Cards */}
        <div className="mt-8 grid grid-cols-2 gap-4">
          {[
            { title: 'Analyze', desc: 'AI Analysis' },
            { title: 'Verify', desc: 'Closed-Loop' },
          ].map((item, idx) => (
            <div
              key={idx}
              className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-400/30 rounded-lg p-3 text-center"
            >
              <p className="text-cyan-400 font-bold text-sm uppercase tracking-wider">{item.title}</p>
              <p className="text-white/50 text-xs mt-1">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Modal for messages */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="bg-white/[0.03] backdrop-blur-xl border border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-cyan-400 uppercase tracking-wider">
              {error ? 'Error' : successMessage ? 'Success' : 'Message'}
            </DialogTitle>
            <DialogDescription className="text-white/70">
              {error && <div className="text-red-400 font-mono">{error}</div>}
              {successMessage && <div className="text-green-400 font-mono">{successMessage}</div>}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-3">
            <Button
              onClick={() => setIsModalOpen(false)}
              className="bg-fuchsia-500/20 border border-fuchsia-500/50 text-fuchsia-400 hover:bg-fuchsia-500/30"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default LoginForm;