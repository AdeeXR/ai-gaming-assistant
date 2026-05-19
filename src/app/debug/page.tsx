// src/app/debug/page.tsx
"use client";

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useFirebase } from '@/lib/firebase';
import { collection, getDocs, query, where, addDoc, serverTimestamp } from 'firebase/firestore';

interface DebugInfo {
  sessionUserId: string | null;
  firebaseUserId: string | null;
  dbConnected: boolean;
  objectivesData: any[];
  achievementsData: any[];
  errorMessage: string | null;
}

export default function DebugPage() {
  const { data: session } = useSession();
  const { db, auth } = useFirebase();
  const [debugInfo, setDebugInfo] = useState<DebugInfo>({
    sessionUserId: null,
    firebaseUserId: null,
    dbConnected: false,
    objectivesData: [],
    achievementsData: [],
    errorMessage: null,
  });
  const [loading, setLoading] = useState(true);
  const [testLoading, setTestLoading] = useState(false);

  useEffect(() => {
    const fetchDebugInfo = async () => {
      try {
        const info: DebugInfo = {
          sessionUserId: session?.user?.id || null,
          firebaseUserId: auth?.currentUser?.uid || null,
          dbConnected: !!db,
          objectivesData: [],
          achievementsData: [],
          errorMessage: null,
        };

        console.log('Debug Info - Session User ID:', info.sessionUserId);
        console.log('Debug Info - Firebase User ID:', info.firebaseUserId);
        console.log('Debug Info - DB Connected:', info.dbConnected);

        if (!db || !session?.user?.id) {
          info.errorMessage = 'Missing DB or Session User ID';
          setDebugInfo(info);
          setLoading(false);
          return;
        }

        const userId = session.user.id;

        // Fetch objectives
        try {
          const objectivesQuery = query(
            collection(db, `users/${userId}/objectives`)
          );
          const objectivesSnapshot = await getDocs(objectivesQuery);
          info.objectivesData = objectivesSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          console.log('Objectives fetched:', info.objectivesData);
        } catch (err) {
          console.error('Error fetching objectives:', err);
          info.errorMessage = `Error fetching objectives: ${err instanceof Error ? err.message : 'Unknown error'}`;
        }

        // Fetch achievements
        try {
          const achievementsQuery = query(
            collection(db, `users/${userId}/achievements`)
          );
          const achievementsSnapshot = await getDocs(achievementsQuery);
          info.achievementsData = achievementsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
          }));
          console.log('Achievements fetched:', info.achievementsData);
        } catch (err) {
          console.error('Error fetching achievements:', err);
          if (!info.errorMessage) {
            info.errorMessage = `Error fetching achievements: ${err instanceof Error ? err.message : 'Unknown error'}`;
          }
        }

        setDebugInfo(info);
      } catch (error) {
        console.error('Debug page error:', error);
        setDebugInfo(prev => ({
          ...prev,
          errorMessage: `Unexpected error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        }));
      } finally {
        setLoading(false);
      }
    };

    fetchDebugInfo();
  }, [session?.user?.id, db, auth?.currentUser?.uid]);

  const createTestObjective = async () => {
    if (!db || !session?.user?.id) {
      alert('Missing DB or session');
      return;
    }

    setTestLoading(true);
    try {
      const userId = session.user.id;
      await addDoc(collection(db, `users/${userId}/objectives`), {
        text: `TEST OBJECTIVE - ${new Date().toLocaleTimeString()}`,
        status: 'Active',
        createdAt: serverTimestamp(),
      });
      alert('Test objective created! Check the Objectives section above.');
      
      // Refresh debug info
      setLoading(true);
      const fetchDebugInfo = async () => {
        try {
          const objectivesQuery = query(
            collection(db, `users/${userId}/objectives`)
          );
          const objectivesSnapshot = await getDocs(objectivesQuery);
          setDebugInfo(prev => ({
            ...prev,
            objectivesData: objectivesSnapshot.docs.map(doc => ({
              id: doc.id,
              ...doc.data(),
            })),
          }));
          setLoading(false);
        } catch (err) {
          console.error('Error fetching objectives:', err);
          setLoading(false);
        }
      };
      fetchDebugInfo();
    } catch (error) {
      console.error('Error creating test objective:', error);
      alert(`Error creating test objective: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Debug Information</h1>

        {loading ? (
          <div className="text-center">
            <p>Loading debug info...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* IDs Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">User IDs</h2>
              <div className="space-y-2 font-mono text-sm">
                <div className="bg-gray-900 p-3 rounded">
                  <p className="text-gray-400">Session User ID:</p>
                  <p className={debugInfo.sessionUserId ? 'text-green-400' : 'text-red-400'}>
                    {debugInfo.sessionUserId || 'NOT SET'}
                  </p>
                </div>
                <div className="bg-gray-900 p-3 rounded">
                  <p className="text-gray-400">Firebase User ID:</p>
                  <p className={debugInfo.firebaseUserId ? 'text-green-400' : 'text-red-400'}>
                    {debugInfo.firebaseUserId || 'NOT SET'}
                  </p>
                </div>
                <div className="bg-gray-900 p-3 rounded">
                  <p className="text-gray-400">IDs Match:</p>
                  <p className={debugInfo.sessionUserId === debugInfo.firebaseUserId ? 'text-green-400' : 'text-yellow-400'}>
                    {debugInfo.sessionUserId === debugInfo.firebaseUserId ? 'YES ✓' : 'NO - MISMATCH!'}
                  </p>
                </div>
              </div>
            </div>

            {/* Connection Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Connection Status</h2>
              <div className="space-y-2">
                <div className="bg-gray-900 p-3 rounded">
                  <p className="text-gray-400">DB Connected:</p>
                  <p className={debugInfo.dbConnected ? 'text-green-400' : 'text-red-400'}>
                    {debugInfo.dbConnected ? 'YES ✓' : 'NO'}
                  </p>
                </div>
              </div>
            </div>

            {/* Objectives Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold">Objectives ({debugInfo.objectivesData.length})</h2>
                <button
                  onClick={createTestObjective}
                  disabled={testLoading}
                  className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-gray-600 rounded text-white font-semibold"
                >
                  {testLoading ? 'Creating...' : '+ Create Test Objective'}
                </button>
              </div>
              {debugInfo.objectivesData.length === 0 ? (
                <div className="bg-gray-900 p-4 rounded text-gray-400">
                  No objectives found in database
                </div>
              ) : (
                <div className="space-y-3">
                  {debugInfo.objectivesData.map(obj => (
                    <div key={obj.id} className="bg-gray-900 p-4 rounded">
                      <p className="text-cyan-400 font-semibold">{obj.text}</p>
                      <p className="text-gray-400 text-sm mt-1">Status: {obj.status}</p>
                      <p className="text-gray-400 text-sm">ID: {obj.id}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Achievements Section */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Achievements ({debugInfo.achievementsData.length})</h2>
              {debugInfo.achievementsData.length === 0 ? (
                <div className="bg-gray-900 p-4 rounded text-gray-400">
                  No achievements found in database
                </div>
              ) : (
                <div className="space-y-3">
                  {debugInfo.achievementsData.map(ach => (
                    <div key={ach.id} className="bg-gray-900 p-4 rounded">
                      <p className="text-cyan-400 font-semibold">{ach.name}</p>
                      <p className="text-gray-400 text-sm mt-1">{ach.description}</p>
                      <p className="text-gray-400 text-sm">Unlocked: {ach.unlocked ? 'YES' : 'NO'}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Error Section */}
            {debugInfo.errorMessage && (
              <div className="bg-red-900 rounded-lg p-6">
                <h2 className="text-2xl font-bold mb-4 text-red-300">Error</h2>
                <p className="text-red-100">{debugInfo.errorMessage}</p>
              </div>
            )}

            {/* Console Logs */}
            <div className="bg-gray-800 rounded-lg p-6">
              <h2 className="text-2xl font-bold mb-4">Check Browser Console</h2>
              <p className="text-gray-400">Open DevTools (F12) and look at the Console tab for detailed logs.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
