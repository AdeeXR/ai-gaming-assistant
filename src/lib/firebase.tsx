// src/lib/firebase.ts
// This file sets up the Firebase client-side SDK for your Next.js application.
// It initializes Firebase services (Auth and Firestore) and provides a React Context
// for easy access to these services throughout your components.

// Import necessary functions and types from Firebase SDKs
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, User, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';

// Import React core hooks and types for creating context and components
import React, { useState, useEffect, createContext, useContext, ReactNode } from 'react';

// --- Firebase Configuration (using Environment Variables) ---
// In a Next.js application, public environment variables (those prefixed with NEXT_PUBLIC_)
// are exposed to the client-side code. This is how your frontend connects to Firebase.
// We use 'as string' to tell TypeScript these variables are definitely strings at runtime,
// assuming they are correctly set in your .env.local file or Vercel environment variables.
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
};

// Export the Firebase App ID, which is used in Firestore paths
// e.g., artifacts/{appId}/users/{userId}/...
export const appId: string = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id';

// --- Initialize Firebase Client-Side App ---
// This ensures that the Firebase app is initialized only once, even with Next.js's
// React Strict Mode which might cause components to render multiple times.
let appInstance: FirebaseApp;
if (!getApps().length) {
  // If no Firebase apps are currently initialized, create a new one.
  appInstance = initializeApp(firebaseConfig);
} else {
  // If an app is already initialized (e.g., during hot module replacement), get the existing instance.
  appInstance = getApp();
}

// Get instances of Firebase Authentication and Firestore Database services.
// Explicitly typing them provides better type safety.
const authInstance: Auth = getAuth(appInstance);
const dbInstance: Firestore = getFirestore(appInstance);

// --- Firebase Context for Global Access ---
// Define the shape of the context value that will be provided to components.
interface FirebaseContextType {
  db: Firestore;         // The Firestore database instance
  auth: Auth;           // The Firebase Authentication instance
  currentUser: User | null; // The currently authenticated Firebase user, or null if logged out
}

// Create the React Context. Its default value is 'undefined' to indicate it's not yet provided.
const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

// --- FirebaseProvider Component ---
// This component wraps your application (or a part of it) and makes the Firebase
// services and current user accessible to all children components via the context.
export const FirebaseProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  // State to hold the current Firebase authenticated user.
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Effect hook to subscribe to Firebase Authentication state changes.
  // This runs once on component mount (due to empty dependency array).
  useEffect(() => {
    // onAuthStateChanged returns an unsubscribe function.
    const unsubscribe = authInstance.onAuthStateChanged((user) => {
      // Update the currentUser state whenever the authentication state changes.
      setCurrentUser(user);
    });

    // Cleanup function: unsubscribe from auth state changes when the component unmounts.
    return () => unsubscribe();
  }, []); // Empty dependency array ensures this effect runs only once.

  // Provide the Firebase service instances and current user down the component tree.
  return (
    <FirebaseContext.Provider value={{ db: dbInstance, auth: authInstance, currentUser }}>
      {children} {/* Renders all child components wrapped by this Provider */}
    </FirebaseContext.Provider>
  );
};

// --- useFirebase Custom Hook ---
// A custom hook to easily consume the Firebase context in any functional component.
export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  // Throw an error if the hook is used outside of a FirebaseProvider, which indicates a setup issue.
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
};