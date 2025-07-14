// src/lib/firebase.tsx
// This file sets up Firebase client-side services and provides them via React Context.

"use client"; // <--- This must be the very first line

import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseAuthUser, Auth, signInAnonymously, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore'; // No Timestamp needed here, so no import

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Extend the Auth type to include __app_id, which is provided by the Canvas environment
interface CustomAuth extends Auth {
  __app_id?: string;
}

// Define the shape of the Firebase context
interface FirebaseContextType {
  db: Firestore | null;
  auth: CustomAuth | null; // Use CustomAuth here
  currentUser: FirebaseAuthUser | null;
  loading: boolean;
  error: string | null;
}

// Create the Firebase context with default null values
const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

// Custom hook to easily access Firebase services from any component
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};

// FirebaseProvider component to initialize Firebase and provide services to its children
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [appInstance, setAppInstance] = useState<FirebaseApp | null>(null); // Suppress unused var warning
  const [dbInstance, setDbInstance] = useState<Firestore | null>(null);
  const [authInstance, setAuthInstance] = useState<CustomAuth | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [loading, setLoading] = useState(true); // Corrected typo: was `true` instead of `useState(true)`
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const initFirebase = async () => {
      try {
        // These are global variables provided by the Canvas environment.
        // They are checked for existence before use, as they are undefined in local dev.
        const canvasAppId = typeof __app_id !== 'undefined' ? __app_id : null;
        const canvasFirebaseConfig = typeof __firebase_config !== 'undefined' ? JSON.parse(__firebase_config) : null;
        const canvasInitialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;

        // Use environment variables for local development and Vercel deployments
        const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
        const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
        const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
        const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
        const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

        // Prioritize Canvas environment variables if available, otherwise use process.env
        const firebaseConfig = canvasFirebaseConfig || {
          apiKey: apiKey,
          authDomain: authDomain,
          projectId: projectId,
          messagingSenderId: messagingSenderId,
          appId: appId,
        };

        // Determine the app ID to attach to the auth object
        const currentAppId = canvasAppId || appId || 'default-app-id';

        // Basic check for essential Firebase config
        if (!firebaseConfig || !firebaseConfig.apiKey) {
          throw new Error("Firebase configuration is incomplete or missing. Check your .env.local file and Vercel environment variables.");
        }

        let app;
        // Initialize Firebase app only once to prevent multiple app instances
        if (!getApps().length) {
          app = initializeApp(firebaseConfig);
        } else {
          app = getApp(); // Get existing app instance if already initialized
        }
        setAppInstance(app); // Still set, but linting suppressed

        const db = getFirestore(app);
        setDbInstance(db);

        const auth: CustomAuth = getAuth(app); // Cast to CustomAuth to add __app_id
        auth.__app_id = currentAppId; // Attach __app_id to the auth object
        setAuthInstance(auth);

        // Authenticate user with custom token (from Canvas) or anonymously (for local/Vercel)
        if (canvasInitialAuthToken) {
          await signInWithCustomToken(auth, canvasInitialAuthToken);
        } else {
          await signInAnonymously(auth);
        }

        // Set up authentication state listener
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          setLoading(false); // Auth state determined, stop loading
        });

        // Cleanup subscription on component unmount
        return () => unsubscribe();
      } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred during Firebase initialization.';
        console.error("Firebase initialization error:", err);
        setError(errorMessage);
        setLoading(false); // Stop loading on error
      }
    };

    initFirebase();
  }, []); // Empty dependency array means this runs once on mount

  // Conditional rendering based on loading state
  if (loading) {
    // Render a simple loading message or a spinner while Firebase is initializing and auth state is being checked
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        Loading AI Gaming Assistant...
      </div>
    );
  }

  // Provide the Firebase service instances and current user down the component tree.
  // This is the main return for the provider, rendering its children.
  return (
    <FirebaseContext.Provider value={{ db: dbInstance, auth: authInstance, currentUser, loading, error }}>
      {children} {/* Renders all child components wrapped by this Provider */}
    </FirebaseContext.Provider>
  );
};