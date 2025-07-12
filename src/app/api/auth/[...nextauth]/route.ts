// src/app/api/auth/[...nextauth]/route.ts

import NextAuth, { AuthOptions, User, Account, Session } from 'next-auth';
import { JWT } from 'next-auth/jwt';
import CredentialsProvider from 'next-auth/providers/credentials';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import admin from 'firebase-admin';
import { UserProfile } from '@/types/user';

// Initialize Firebase Admin SDK (for server-side operations, e.g., custom token generation, user management)
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
export const authOptions: AuthOptions = {
  providers: [
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
          const userCredential = await signInWithEmailAndPassword(
            firebaseClientAuth,
            credentials.email,
            credentials.password
          );
          const user = userCredential.user;

          if (user) {
            const userProfileRef = doc(firebaseClientDb, `artifacts/${appId}/users/${user.uid}/profiles/userDoc`);
            const userProfileSnap = await getDoc(userProfileRef);

            if (!userProfileSnap.exists()) {
              const initialProfile: UserProfile = {
                username: user.displayName || user.email?.split('@')[0] || `Player_${user.uid.substring(0, 8)}`,
                bio: 'New player, ready to improve!',
                favoriteGame: 'Unknown',
                avatarUrl: user.photoURL || `https://placehold.co/128x128/334155/F8FAFC?text=${user.email?.substring(0,2).toUpperCase() || '??'}`
              };
              await setDoc(userProfileRef, initialProfile, { merge: true });
            }

            return {
              id: user.uid,
              email: user.email,
              name: user.displayName,
              image: user.photoURL,
            };
          }
          return null;
        } catch (error: unknown) { // Changed 'any' to 'unknown'
          const firebaseError = error as { code?: string; message?: string }; // Type assertion for Firebase error structure
          console.error("Firebase Auth Error:", firebaseError.code, firebaseError.message);
          if (firebaseError.code === 'auth/wrong-password' || firebaseError.code === 'auth/user-not-found' || firebaseError.code === 'auth/invalid-credential') {
            throw new Error('Invalid email or password.');
          }
          throw new Error(firebaseError.message || 'Authentication failed. Please try again.');
        }
      },
    }),
  ],
  callbacks: {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async jwt({ token, user, account }: { token: JWT; user: User; account: Account | null }) { // Added eslint-disable for 'account'
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (token.id) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
  debug: process.env.NODE_ENV === 'development',
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };