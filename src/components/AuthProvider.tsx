// src/components/AuthProvider.tsx
"use client"; // This component must be a client component as it uses React Context

import { SessionProvider } from 'next-auth/react';
import React from 'react';

// Define the props for AuthProvider
interface AuthProviderProps {
  children: React.ReactNode;
}

// AuthProvider component wraps the application with NextAuth's SessionProvider
const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  return (
    <SessionProvider>
      {children}
    </SessionProvider>
  );
};

export default AuthProvider;