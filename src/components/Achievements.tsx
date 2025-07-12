// src/components/Achievements.tsx
'use client';

import React, { useState, useEffect } from 'react';
import { useFirebase } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import { Achievement } from '@/types/achievement';
import { Button } from './ui/button';

const Achievements: React.FC = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { db } = useFirebase();

  const [achievements, setAchievements] = useState<Achievement[]>([]);

  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id';

  useEffect(() => {
    if (!userId || !db) return;

    const achievementsDocRef = doc(db, `artifacts/${appId}/users/${userId}/achievements/myAchievements`);

    const unsubscribe = onSnapshot(achievementsDocRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setAchievements(data?.list || []);
      } else {
        
        const initialAchievements: Achievement[] = [
          { id: 'first_analysis', name: 'First AI Analysis', description: 'Complete your first AI gameplay analysis.', unlocked: false, icon: '🌟' },
          { id: 'pro_scout', name: 'Pro Scout', description: 'Upload 5 gameplay logs for analysis.', unlocked: false, icon: '🕵️‍♂️' },
          { id: 'strategy_master', name: 'Strategy Master', description: 'Implement 3 suggested strategies in your gameplay.', unlocked: false, icon: '🎯' },
          { id: 'clutch_king', name: 'Clutch King', description: 'Achieve a simulated "Clutch" moment (AI detects it).', unlocked: false, icon: '👑' },
          { id: 'rapid_reflexes', name: 'Rapid Reflexes', description: 'Maintain average reaction time below 200ms for 3 consecutive analyses.', unlocked: false, icon: '⚡' },
        ];
        setDoc(achievementsDocRef, { list: initialAchievements }, { merge: true });
        setAchievements(initialAchievements);
      }
    }, (err) => {
      console.error("Error fetching achievements:", err);
    });

    return () => unsubscribe();
  }, [userId, db, appId]); // Depend on userId, db, and appId

  // Simulate unlocking an achievement (for demo purposes)
  const unlockAchievement = async (achievementId: string) => {
    if (!userId || !db) return;

    const achievementsDocRef = doc(db, `artifacts/${appId}/users/${userId}/achievements/myAchievements`);
    const updatedAchievements = achievements.map(ach =>
      ach.id === achievementId ? { ...ach, unlocked: true, unlockedAt: new Date() } : ach
    );
    await setDoc(achievementsDocRef, { list: updatedAchievements }, { merge: true });
  };


  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-xl text-gray-400">Please sign in to view your achievements.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pt-24 bg-gray-900 min-h-screen text-white">
      <h2 className="text-4xl font-extrabold text-teal-400 mb-8 text-center animate-fade-in-down">Your Achievements</h2>
      <p className="text-gray-400 mb-10 text-center">Track your progress and unlock milestones as you improve!</p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {achievements.length === 0 ? (
          <p className="col-span-full text-center text-gray-400">Loading achievements...</p>
        ) : (
          achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`relative bg-gray-800 p-6 rounded-xl shadow-lg border ${
                achievement.unlocked ? 'border-green-500 bg-gradient-to-br from-gray-800 to-gray-700' : 'border-gray-600 bg-gray-800'
              } transform hover:scale-105 transition-transform duration-300 ease-in-out flex flex-col items-center text-center`}
            >
              <div className="text-5xl mb-4">{achievement.icon}</div>
              <h3 className="text-2xl font-bold text-gray-100 mb-2">{achievement.name}</h3>
              <p className="text-gray-300 text-sm mb-4">{achievement.description}</p>
              {achievement.unlocked ? (
                <span className="px-4 py-1 bg-green-600 text-white text-xs font-semibold rounded-full mt-auto">Unlocked!</span>
              ) : (
                <Button
                  onClick={() => unlockAchievement(achievement.id)}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-full text-sm font-medium transition-colors duration-200 mt-auto"
                >
                  Unlock (Demo)
                </Button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Achievements;