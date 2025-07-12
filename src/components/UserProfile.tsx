// src/components/UserProfile.tsx
'use client';

import React, { useState, useEffect } from 'react';
import * as Avatar from '@radix-ui/react-avatar';
import { useFirebase } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import { UserProfile as UserProfileType } from '@/types/user';
import { Button } from './ui/button';

const UserProfile: React.FC = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id; // Get user ID from NextAuth.js session
  const { db } = useFirebase();

  const [profile, setProfile] = useState<UserProfileType>({ username: '', bio: '', favoriteGame: '', avatarUrl: '' });
  const [isEditing, setIsEditing] = useState(false);
  const [message, setMessage] = useState('');

  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id'; // Use environment variable

  useEffect(() => {
    if (!userId || !db) return;

    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles/userDoc`);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setProfile(docSnap.data() as UserProfileType);
      } else {
        // Initialize profile if it doesn't exist
        const initialProfile: UserProfileType = {
          username: session?.user?.name || session?.user?.email?.split('@')[0] || `Player_${userId.substring(0, 8)}`,
          bio: 'New player, ready to improve!',
          favoriteGame: 'Unknown',
          avatarUrl: session?.user?.image || `https://placehold.co/128x128/334155/F8FAFC?text=${userId.substring(0,2).toUpperCase()}`
        };
        setDoc(userDocRef, initialProfile, { merge: true });
        setProfile(initialProfile);
      }
    }, (err) => {
      console.error("Error fetching user profile:", err);
    });

    return () => unsubscribe();
  }, [userId, db, appId, session]); // Depend on session to update initial profile from auth data

  const handleSaveProfile = async () => {
    if (!userId || !db) return;
    setMessage('');
    try {
      const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles/userDoc`);
      await setDoc(userDocRef, profile, { merge: true });
      setMessage('Profile saved successfully!');
      setIsEditing(false);
    } catch (error) {
      console.error("Error saving profile:", error);
      setMessage('Failed to save profile. Please try again.');
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile((prev: UserProfileType) => ({ ...prev, [name]: value }));
  };

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-xl text-gray-400">Please sign in to view your profile.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pt-24 bg-gray-900 min-h-screen text-white">
      <h2 className="text-4xl font-extrabold text-teal-400 mb-8 text-center animate-fade-in-down">Your Profile</h2>

      <div className="bg-gray-800 p-8 rounded-xl shadow-2xl max-w-2xl mx-auto transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <div className="flex flex-col items-center mb-8">
          <Avatar.Root className="bg-gray-700 flex h-32 w-32 items-center justify-center rounded-full overflow-hidden mb-4">
            <Avatar.Image
              className="h-full w-full object-cover"
              src={profile.avatarUrl || `https://placehold.co/128x128/334155/F8FAFC?text=${userId?.substring(0,2).toUpperCase() || '??'}`}
              alt="User Avatar"
            />
            <Avatar.Fallback className="text-gray-300 text-5xl font-bold leading-none" delayMs={600}>
              {profile.username ? profile.username.substring(0,2).toUpperCase() : '??'}
            </Avatar.Fallback>
          </Avatar.Root>
          <h3 className="text-3xl font-bold text-gray-100">{profile.username}</h3>
          <p className="text-gray-400 text-sm">User ID: {userId}</p>
        </div>

        {isEditing ? (
          <div className="space-y-4">
            <div>
              <label htmlFor="username" className="block text-gray-300 text-sm font-medium mb-1">Username:</label>
              <input
                type="text"
                id="username"
                name="username"
                value={profile.username}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-colors text-white"
              />
            </div>
            <div>
              <label htmlFor="bio" className="block text-gray-300 text-sm font-medium mb-1">Bio:</label>
              <textarea
                id="bio"
                name="bio"
                value={profile.bio}
                onChange={handleChange}
                className="w-full min-h-[100px] px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-colors text-white"
              ></textarea>
            </div>
            <div>
              <label htmlFor="favoriteGame" className="block text-gray-300 text-sm font-medium mb-1">Favorite Game:</label>
              <input
                type="text"
                id="favoriteGame"
                name="favoriteGame"
                value={profile.favoriteGame}
                onChange={handleChange}
                className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-colors text-white"
              />
            </div>
            <div>
                <label htmlFor="avatarUrl" className="block text-gray-300 text-sm font-medium mb-1">Avatar URL:</label>
                <input
                    type="text"
                    id="avatarUrl"
                    name="avatarUrl"
                    value={profile.avatarUrl}
                    onChange={handleChange}
                    className="w-full px-4 py-2 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-teal-500 focus:border-transparent outline-none transition-colors text-white"
                    placeholder="https://example.com/avatar.jpg"
                />
            </div>
            <div className="flex justify-end space-x-4 mt-6">
              <Button
                variant="secondary"
                onClick={() => setIsEditing(false)}
                className="px-6 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveProfile}
                className="px-6 py-2"
              >
                Save Profile
              </Button>
            </div>
            {message && <p className="text-center text-sm mt-4 text-green-400">{message}</p>}
          </div>
        ) : (
          <div className="space-y-4 text-gray-300 text-lg">
            <p><strong>Bio:</strong> {profile.bio}</p>
            <p><strong>Favorite Game:</strong> {profile.favoriteGame}</p>
            <Button
              onClick={() => setIsEditing(true)}
              className="mt-6 w-full"
            >
              Edit Profile
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;