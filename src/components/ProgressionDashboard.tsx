"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { collection, query, where, onSnapshot, QueryConstraint, doc, updateDoc, serverTimestamp, addDoc } from 'firebase/firestore';
import { useFirebase } from '@/lib/firebase';
import { Target, Trophy, CheckCircle2, Zap, RefreshCw } from 'lucide-react';

interface Objective {
  id: string;
  text: string;
  status: 'Active' | 'Improved' | 'Still Failing';
  createdAt?: Date;
  completedAt?: Date;
}

interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: string;
  unlockedAt?: Date;
}

const ProgressionDashboard: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { db, auth } = useFirebase();
  const [activeObjectives, setActiveObjectives] = useState<Objective[]>([]);
  const [improvedObjectives, setImprovedObjectives] = useState<Objective[]>([]);
  const [loading, setLoading] = useState(true);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  // Debug logging
  useEffect(() => {
    console.log('ProgressionDashboard mounted:', {
      sessionId: session?.user?.id,
      authUserId: auth?.currentUser?.uid,
      dbReady: !!db,
    });
  }, []);
  useEffect(() => {
    if (!session?.user?.id || !db || !auth?.currentUser) {
      console.log('ProgressionDashboard: Missing session, db, or auth', { sessionId: session?.user?.id, dbExists: !!db, authUser: !!auth?.currentUser });
      router.push('/');
      return;
    }

    console.log('ProgressionDashboard: Setting up listeners for userId:', auth.currentUser.uid);

    // Set up real-time listener for Active objectives
    const activeQuery = query(
      collection(db, `users/${auth.currentUser.uid}/objectives`),
      where('status', '==', 'Active') as QueryConstraint
    );

    const unsubscribeActive = onSnapshot(
      activeQuery,
      (snapshot) => {
        console.log('Active objectives snapshot:', snapshot.docs.length, 'docs');
        const objectives = snapshot.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text || '',
          status: 'Active' as const,
          createdAt: doc.data().createdAt?.toDate?.(),
        }));
        console.log('Processed active objectives:', objectives);
        setActiveObjectives(objectives);
        setLoading(false);
      },
      (error) => {
        console.error('Error listening to active objectives:', error);
      }
    );

    // Set up real-time listener for Improved objectives
    const improvedQuery = query(
      collection(db, `users/${auth.currentUser.uid}/objectives`),
      where('status', '==', 'Improved') as QueryConstraint
    );

    const unsubscribeImproved = onSnapshot(
      improvedQuery,
      (snapshot) => {
        const objectives = snapshot.docs.map((doc) => ({
          id: doc.id,
          text: doc.data().text || '',
          status: 'Improved' as const,
          completedAt: doc.data().completedAt?.toDate?.(),
        }));
        setImprovedObjectives(objectives);
      },
      (error) => {
        console.error('Error listening to improved objectives:', error);
      }
    );

    // Set up real-time listener for achievements
    const achievementsQuery = query(collection(db, `users/${auth.currentUser.uid}/achievements`));
    const unsubscribeAchievements = onSnapshot(
      achievementsQuery,
      async (snapshot) => {
        const achievementsData = snapshot.docs.map((doc) => ({
        id: doc.id,
        name: doc.data().name || '',
        description: doc.data().description || '',
        unlocked: doc.data().unlocked || false,
        icon: doc.data().icon || '🏆',
        unlockedAt: doc.data().unlockedAt?.toDate?.(),
      }));
      setAchievements(achievementsData);

      // Create default achievements if none exist
      if (snapshot.empty) {
        const defaultAchievements = [
          { name: 'First Steps', description: 'Completed your first set of gaming objectives!', icon: '🎯' },
          { name: 'Skill Master', description: 'Completed 10 objectives successfully!', icon: '⚡' },
          { name: 'Perfectionist', description: 'Completed all objectives in a single analysis!', icon: '💎' },
          { name: 'Consistent Player', description: 'Completed objectives for 7 days in a row!', icon: '🔥' },
          { name: 'Game Changer', description: 'Unlocked all achievements!', icon: '👑' },
        ];

        const achievementPromises = defaultAchievements.map(achievement =>
          addDoc(collection(db, `users/${auth.currentUser.uid}/achievements`), {
            ...achievement,
            unlocked: false,
          })
        );
        await Promise.all(achievementPromises);
      }
    },
      (error) => {
        console.error('Error listening to achievements:', error);
      }
    );

    return () => {
      unsubscribeActive();
      unsubscribeImproved();
      unsubscribeAchievements();
    };
  }, [auth?.currentUser?.uid, db, router]);

  if (!session?.user?.id || !auth?.currentUser?.uid) {
    return null;
  }

  const markObjectiveCompleted = async (objectiveId: string) => {
    if (!session?.user?.id || !db) return;

    try {
      const objectiveRef = doc(db, `users/${auth.currentUser.uid}/objectives/${objectiveId}`);
      await updateDoc(objectiveRef, {
        status: 'Improved',
        completedAt: serverTimestamp(),
      });

      // Check for achievements
      const updatedActiveObjectives = activeObjectives.filter(obj => obj.id !== objectiveId);
      const totalCompleted = improvedObjectives.length + 1; // +1 for the one just completed

      // Check if all active objectives are now completed
      if (updatedActiveObjectives.length === 0 && activeObjectives.length > 0) {
        // "Perfectionist" achievement - completed all objectives in a single analysis
        const perfectionistAchievement = achievements.find(a => a.name === 'Perfectionist');
        if (perfectionistAchievement && !perfectionistAchievement.unlocked) {
          const achievementRef = doc(db, `users/${auth.currentUser.uid}/achievements/${perfectionistAchievement.id}`);
          await updateDoc(achievementRef, {
            unlocked: true,
            unlockedAt: serverTimestamp(),
          });
        }
      }

      // "First Steps" achievement - completed first set of objectives
      if (totalCompleted >= activeObjectives.length && activeObjectives.length > 0) {
        const firstStepsAchievement = achievements.find(a => a.name === 'First Steps');
        if (firstStepsAchievement && !firstStepsAchievement.unlocked) {
          const achievementRef = doc(db, `users/${auth.currentUser.uid}/achievements/${firstStepsAchievement.id}`);
          await updateDoc(achievementRef, {
            unlocked: true,
            unlockedAt: serverTimestamp(),
          });
        }
      }

      // "Skill Master" achievement - completed 10 objectives
      if (totalCompleted >= 10) {
        const skillMasterAchievement = achievements.find(a => a.name === 'Skill Master');
        if (skillMasterAchievement && !skillMasterAchievement.unlocked) {
          const achievementRef = doc(db, `users/${auth.currentUser.uid}/achievements/${skillMasterAchievement.id}`);
          await updateDoc(achievementRef, {
            unlocked: true,
            unlockedAt: serverTimestamp(),
          });
        }
      }

    } catch (error) {
      console.error('Error marking objective as completed:', error);
    }
  };

  const manualRefresh = async () => {
    setRefreshing(true);
    try {
      console.log('Manual refresh triggered for userId:', session?.user?.id);
      // Force a short delay then remove it
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error('Refresh error:', error);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-white overflow-hidden relative">
      {/* Ambient glows */}
      <div className="absolute top-20 left-10 w-[400px] h-[400px] bg-cyan-500/20 blur-[100px] rounded-full opacity-40 pointer-events-none" />
      <div className="absolute bottom-20 right-10 w-[400px] h-[400px] bg-fuchsia-500/20 blur-[100px] rounded-full opacity-40 pointer-events-none" />

      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Zap className="w-8 h-8 text-cyan-400" />
            <h1 className="text-5xl font-black uppercase tracking-tighter bg-gradient-to-r from-cyan-400 via-cyan-300 to-fuchsia-500 bg-clip-text text-transparent">
              Progression Dashboard
            </h1>
          </div>
          <p className="text-cyan-400/60 uppercase tracking-widest text-sm">Real-Time Objective Tracking • Closed-Loop Verification</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin mx-auto mb-4" />
              <p className="text-cyan-400 font-mono">Loading objectives...</p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Live To-Do List - Active Objectives */}
            <div>
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300 h-full">
                <div className="flex items-center justify-between gap-3 mb-6">
                  <div className="flex items-center gap-3">
                    <Target className="w-6 h-6 text-fuchsia-500" />
                    <h2 className="text-2xl font-bold uppercase tracking-tighter">Live To-Do List</h2>
                  </div>
                  <button
                    onClick={manualRefresh}
                    disabled={refreshing}
                    className="p-2 text-cyan-400 hover:text-cyan-300 disabled:text-gray-500 transition-colors"
                    title="Refresh objectives"
                  >
                    <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {activeObjectives.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Target className="w-12 h-12 text-fuchsia-500/30 mb-3" />
                    <p className="text-white/50 text-sm">No active objectives yet.</p>
                    <p className="text-white/30 text-xs mt-1">Run an analysis to generate new goals!</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {activeObjectives.map((objective) => (
                      <div
                        key={objective.id}
                        className="bg-fuchsia-500/10 border border-fuchsia-500/30 rounded-lg p-4 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/15 transition-all duration-200"
                      >
                        <div className="flex items-start gap-3">
                          <button
                            onClick={() => markObjectiveCompleted(objective.id)}
                            className="w-5 h-5 border-2 border-fuchsia-500 rounded mt-0.5 flex-shrink-0 flex items-center justify-center bg-fuchsia-500/10 hover:bg-fuchsia-500/20 transition-colors"
                          >
                            <CheckCircle2 className="w-3 h-3 text-fuchsia-400 opacity-0 hover:opacity-100" />
                          </button>
                          <div className="flex-grow">
                            <p className="text-fuchsia-200 font-semibold text-sm leading-relaxed">{objective.text}</p>
                            {objective.createdAt && (
                              <p className="text-fuchsia-400/50 text-xs mt-1">
                                Created {new Date(objective.createdAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Trophy Room - Achievements */}
            <div>
              <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all duration-300 h-full">
                <div className="flex items-center gap-3 mb-6">
                  <Trophy className="w-6 h-6 text-cyan-400" />
                  <h2 className="text-2xl font-bold uppercase tracking-tighter">Achievement Vault</h2>
                </div>

                {achievements.filter(a => a.unlocked).length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <Trophy className="w-12 h-12 text-cyan-500/30 mb-3" />
                    <p className="text-white/50 text-sm">Complete objectives to unlock achievements!</p>
                    <p className="text-white/30 text-xs mt-1">Master skills and earn rewards.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {achievements.filter(a => a.unlocked).map((achievement) => (
                      <div
                        key={achievement.id}
                        className="bg-gradient-to-r from-cyan-500/20 to-cyan-500/10 border border-cyan-500/40 rounded-lg p-4 hover:border-cyan-400/60 hover:from-cyan-500/30 hover:to-cyan-500/20 transition-all duration-200 transform hover:scale-105"
                      >
                        <div className="flex items-start gap-3">
                          <div className="text-2xl">{achievement.icon}</div>
                          <div className="flex-grow">
                            <p className="text-cyan-200 font-semibold text-sm leading-relaxed">{achievement.name}</p>
                            <p className="text-cyan-300/70 text-xs mt-1">{achievement.description}</p>
                            {achievement.unlockedAt && (
                              <p className="text-cyan-400/50 text-xs mt-1">
                                Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Stats Section */}
        <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Active Goals', value: activeObjectives.length, color: 'fuchsia' },
            { label: 'Skills Mastered', value: improvedObjectives.length, color: 'cyan' },
            { label: 'Achievements', value: achievements.filter(a => a.unlocked).length, color: 'amber' },
            { label: 'Win Rate', value: improvedObjectives.length > 0 ? Math.round((improvedObjectives.length / (activeObjectives.length + improvedObjectives.length)) * 100) + '%' : '0%', color: 'emerald' },
          ].map((stat, idx) => (
            <div
              key={idx}
              className={`bg-${stat.color}-500/10 border border-${stat.color}-500/30 rounded-lg p-4 text-center`}
            >
              <p className={`text-${stat.color}-400 font-mono text-2xl font-bold`}>{stat.value}</p>
              <p className="text-white/50 text-xs uppercase tracking-wider mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProgressionDashboard;
