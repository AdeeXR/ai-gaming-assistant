// src/app/api/auth/[...nextauth]/route.ts

import NextAuth, { AuthOptions, User, Account, Profile, Session } from 'next-auth'; // Import AuthOptions, User, Account, Profile, Session
import { JWT } from 'next-auth/jwt'; // Import JWT
// import GoogleProvider from 'next-auth/providers/google'; // REMOVED: GoogleProvider
import CredentialsProvider from 'next-auth/providers/credentials';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import admin from 'firebase-admin';
import { UserProfile } from '@/types/user';

// Initialize Firebase Admin SDK (for server-side operations, e.g., custom token generation, user management)
// This uses the FIREBASE_SERVICE_ACCOUNT_KEY from environment variables.
if (!admin.apps.length) {
  try {
    const serviceAccountJson = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string);
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJson),
    });
  } catch (error) {
    console.error("Firebase Admin SDK initialization error in NextAuth:", error);
  }
}

// Initialize Firebase Client SDK (used specifically for `signInWithEmailAndPassword` for CredentialsProvider)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY as string,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN as string,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID as string,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID as string,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID as string,
};

let firebaseClientApp;
if (!getApps().length) {
  firebaseClientApp = initializeApp(firebaseConfig);
} else {
  firebaseClientApp = getApp();
}
const firebaseClientAuth = getAuth(firebaseClientApp);
const firebaseClientDb = getFirestore(firebaseClientApp);
const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id';

// Define the NextAuth.js options with explicit AuthOptions type
export const authOptions: AuthOptions = { // Added AuthOptions type here
  providers: [
    // REMOVED: GoogleProvider({ clientId: ..., clientSecret: ... }),
    // Credentials Provider for Email/Password authentication
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials.password) {
          throw new Error('Please enter your email and password');
        }

        try {
          // Use Firebase client-side SDK to sign in with email and password
          const userCredential = await signInWithEmailAndPassword(
            firebaseClientAuth,
            credentials.email,
            credentials.password
          );
          const user = userCredential.user;

          if (user) {
            // After successful Firebase login, ensure a user profile exists in Firestore.
            const userProfileRef = doc(firebaseClientDb, `artifacts/${appId}/users/${user.uid}/profiles/userDoc`);
            const userProfileSnap = await getDoc(userProfileRef);

            if (!userProfileSnap.exists()) {
              // Create a basic profile if it doesn't exist
              const initialProfile: UserProfile = {
                username: user.displayName || user.email?.split('@')[0] || `Player_${user.uid.substring(0, 8)}`,
                bio: 'New player, ready to improve!',
                favoriteGame: 'Unknown',
                avatarUrl: user.photoURL || `https://placehold.co/128x128/334155/F8FAFC?text=${user.email?.substring(0,2).toUpperCase() || '??'}`
              };
              await setDoc(userProfileRef, initialProfile, { merge: true });
            }

            // Return a user object compatible with NextAuth.js
            return {
              id: user.uid, // Crucial: Set the Firebase UID as the NextAuth user ID
              email: user.email,
              name: user.displayName,
              image: user.photoURL,
            };
          }
          return null; // Return null if Firebase sign-in fails
        } catch (error: any) {
          console.error("Firebase Auth Error:", error.code, error.message);
          if (error.code === 'auth/wrong-password' || error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
            throw new Error('Invalid email or password.');
          }
          throw new Error(error.message || 'Authentication failed. Please try again.');
        }
      },
    }),
  ],
  // Callbacks for extending JWT and Session types with custom data (like Firebase UID)
  callbacks: {
    async jwt({ token, user, account }: { token: JWT; user: User; account: Account | null }) { // Explicitly typed parameters
      // 'account' is declared but its value is never read.ts(6133) - This warning is fine as we removed GoogleProvider.
      // We keep 'account' in the type signature as it's part of NextAuth's callback interface.
      if (user) {
        token.id = user.id; // NextAuth's 'user.id' contains Firebase UID
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) { // Explicitly typed parameters
      // Add the Firebase UID from the JWT token to the session object, making it accessible on the client.
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  // Custom pages for authentication flows (e.g., redirect to homepage for sign-in)
  pages: {
    signIn: '/', // If unauthenticated, redirect to the homepage which contains the login form.
  },
  // Use JWT for session management
  session: {
    strategy: 'jwt',
  },
  // Enable debug mode in development for detailed logs
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };