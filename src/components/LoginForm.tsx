// src/components/LoginForm.tsx
'use client'; // This component uses client-side hooks

import React, { useState } from 'react';
import { signIn } from 'next-auth/react'; // Import signIn from NextAuth.js
import Link from 'next/link'; // Use Next.js Link for navigation
import { useRouter } from 'next/navigation'; // Hook for client-side navigation

const LoginForm: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Sign in with credentials (Email/Password) configured in [...nextauth].ts
      const result = await signIn('credentials', {
        redirect: false, // Do not redirect automatically, handle it manually
        email,
        password,
      });

      if (result?.error) {
        // Display specific error messages from NextAuth or Firebase Auth
        if (result.error === 'CredentialsSignin') {
          setError('Invalid email or password.');
        } else {
          setError(result.error);
        }
      } else if (result?.ok) {
        // Redirect to dashboard on successful login
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred during login.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setError('');
    try {
      // Sign in with Google provider configured in [...nextauth].ts
      const result = await signIn('google', { redirect: false });
      if (result?.error) {
        setError(result.error);
      } else if (result?.ok) {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setError(err.message || 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
      <div className="bg-gray-800 p-8 rounded-xl shadow-lg w-full max-w-md">
        <h2 className="text-3xl font-bold text-center text-teal-400 mb-6">Welcome Back, Gamer!</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-gray-300 text-sm font-medium mb-2">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="gamer@example.com"
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-colors text-white"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-gray-300 text-sm font-medium mb-2">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="********"
              required
              className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-colors text-white"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-teal-600 hover:bg-teal-700 text-white font-semibold py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Logging In...' : 'Log In'}
          </button>
          {error && (
            <p className="mt-4 text-center text-sm text-red-400">{error}</p>
          )}
        </form>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-700"></span>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-gray-800 px-2 text-gray-500">Or continue with</span>
          </div>
        </div>
        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full bg-blue-700 hover:bg-blue-800 text-white font-semibold py-3 rounded-lg shadow-md transition-all duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="currentColor"><path d="M12 4.001c-4.418 0-8 3.582-8 8s3.582 8 8 8c4.095 0 7.42-3.056 7.949-7.001h-2.06c-.465 2.87-2.916 5-5.889 5-3.313 0-6-2.687-6-6s2.687-6 6-6c1.64 0 3.129.673 4.208 1.752L13.596 9.61c.42-.42.923-.61 1.488-.61h.008c.565 0 1.069.19 1.488.61l1.17 1.17c.48.48.749 1.12.749 1.792V12c0-.5-.224-1-.5-1.333V9c0-.5-.224-1-.5-1.333V6.76L16.29 5.462C15.02 4.544 13.551 4.001 12 4.001z"/></svg>
          {loading ? 'Signing In with Google...' : 'Sign In with Google'}
        </button>
        <p className="mt-6 text-center text-gray-400 text-sm">
          Don't have an account? {/* This link needs a dedicated register page, or a modal register form */}
          <Link href="#" className="text-teal-400 hover:underline" onClick={() => setError("Registration not implemented in this demo. Please use an existing Google account or register directly via Firebase Auth console.")}>Register here</Link>
        </p>
      </div>
    </div>
  );
};

export default LoginForm;