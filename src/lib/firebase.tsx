// src/lib/firebase.tsx
// This file sets up Firebase client-side services and provides them via React Context.

"use client"; // <--- ADD THIS LINE AT THE VERY TOP

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, onAuthStateChanged, User as FirebaseAuthUser } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';

// Define the shape of the Firebase context
interface FirebaseContextType {
  db: ReturnType<typeof getFirestore> | null;
  auth: ReturnType<typeof getAuth> | null;
  currentUser: FirebaseAuthUser | null;
}

// Create the Firebase context with default null values
const FirebaseContext = createContext<FirebaseContextType>({
  db: null,
  auth: null,
  currentUser: null,
});

// Custom hook to easily access Firebase services from any component
export const useFirebase = () => useContext(FirebaseContext);

// FirebaseProvider component to initialize Firebase and provide services to its children
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [firebaseApp, setFirebaseApp] = useState<any>(null);
  const [dbInstance, setDbInstance] = useState<ReturnType<typeof getFirestore> | null>(null);
  const [authInstance, setAuthInstance] = useState<ReturnType<typeof getAuth> | null>(null);
  const [currentUser, setCurrentUser] = useState<FirebaseAuthUser | null>(null);
  const [loading, setLoading] = useState(true); // Track loading state for auth

  // Ensure environment variables are defined before attempting to initialize Firebase
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;

  // Check if all required Firebase config variables are present
  const isFirebaseConfigComplete = apiKey && authDomain && projectId && messagingSenderId && appId;

  useEffect(() => {
    // If Firebase config is incomplete, log an error and stop loading
    if (!isFirebaseConfigComplete) {
      console.error("Firebase configuration is incomplete. Check your .env.local file and Vercel environment variables.");
      setLoading(false); // Stop loading if config is bad
      return; // Exit useEffect early
    }

    // Construct firebaseConfig object only if all parts are present
    const firebaseConfig = {
      apiKey: apiKey as string,
      authDomain: authDomain as string,
      projectId: projectId as string,
      messagingSenderId: messagingSenderId as string,
      appId: appId as string,
    };

    let app;
    // Initialize Firebase app only once to prevent multiple app instances
    if (!getApps().length) {
      app = initializeApp(firebaseConfig);
    } else {
      app = getApp(); // Get existing app instance if already initialized
    }
    setFirebaseApp(app);

    const db = getFirestore(app);
    setDbInstance(db);

    const auth = getAuth(app);
    setAuthInstance(auth);

    // Set up authentication state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false); // Auth state determined, stop loading
    });

    // Cleanup subscription on component unmount
    return () => unsubscribe();
  }, [isFirebaseConfigComplete, apiKey, authDomain, projectId, messagingSenderId, appId]); // Dependencies for useEffect

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
    <FirebaseContext.Provider value={{ db: dbInstance, auth: authInstance, currentUser }}>
      {children} {/* Renders all child components wrapped by this Provider */}
    </FirebaseContext.Provider>
  );
};