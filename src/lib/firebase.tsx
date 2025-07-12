    // src/lib/firebase.ts
    // This file sets up Firebase client-side services and provides them via React Context.

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

      // Firebase configuration from environment variables
      const firebaseConfig = {
        apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
        authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
        appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
      };

      useEffect(() => {
        let app;
        // Initialize Firebase app only once
        if (!getApps().length) {
          app = initializeApp(firebaseConfig);
        } else {
          app = getApp();
        }
        setFirebaseApp(app);

        const db = getFirestore(app);
        setDbInstance(db);

        const auth = getAuth(app);
        setAuthInstance(auth);

        // Listen for authentication state changes
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          setCurrentUser(user);
          setLoading(false); // Auth state determined
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
      }, []); // Empty dependency array means this runs once on mount

      // Show a loading indicator or null while authentication is being checked
      if (loading) {
        // You can return a loading spinner or null here
        return <div>loading Firebase...</div>; // Or simply return null; for no visible loading
      }

      // Provide the Firebase service instances and current user down the component tree.
      return (
        <FirebaseContext.Provider value={{ db: dbInstance, auth: authInstance, currentUser }}>
          {children} {/* Renders all child components wrapped by this Provider */}
        </FirebaseContext.Provider>
      );
    };