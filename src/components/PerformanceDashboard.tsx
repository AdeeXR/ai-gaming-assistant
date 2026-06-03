// src/components/PerformanceDashboard.tsx
"use client";

import React, { useState, useEffect } from 'react';
import { useSession, signOut } from 'next-auth/react';
import { useFirebase } from '@/lib/firebase';
import { collection, doc, onSnapshot, query, addDoc, serverTimestamp, Timestamp, deleteDoc } from 'firebase/firestore'; // Import Timestamp, removed getDocs
import { Button } from '@/components/ui/button';
import { uploadVideoFileToSupabase } from '@/lib/supabase';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea'; // Import Textarea
import { Input } from '@/components/ui/input'; // Import Input
import { Label } from '@/components/ui/label'; // Import Label
import { Trash2 } from 'lucide-react';

// Define interfaces for AI analysis response and gameplay log
interface AiAnalysisResult {
  analysis: string;
  suggestions: string[];
  errorsDetected: string[];
  objectives: string[];
}

interface GameplayLog {
  id: string;
  userId: string;
  gameplayText?: string;
  analysis?: AiAnalysisResult;
  timestamp: Timestamp; // Changed from 'any' to 'Timestamp'
  fileUrl?: string;
  fileName?: string;
}

// UserProfile interface (assuming it's defined elsewhere, or can be a placeholder)
interface UserProfile {
  username?: string;
  email?: string;
}

const PerformanceDashboard: React.FC = () => {
  const { data: session } = useSession();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { db, auth, currentUser } = useFirebase(); // Suppress unused var for currentUser
  const [gameplayTextInput, setGameplayTextInput] = useState('');
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // Suppress unused var for userProfile
  const [gameplayLogs, setGameplayLogs] = useState<GameplayLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState<{ title: string; description: React.ReactNode }>({ title: '', description: '' });

  useEffect(() => {
    if (!db || !auth || !auth.currentUser) return;

    const appId = auth.__app_id || 'default-app-id'; // Access __app_id from auth
    const userId = auth.currentUser.uid;
    const userProfileRef = doc(db, `artifacts/${appId}/users/${userId}/profiles/userDoc`);
    const gameplayLogsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/gameplayLogs`);

    const unsubscribeProfile = onSnapshot(userProfileRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        console.warn("User profile not found.");
        setUserProfile(null);
      }
    });

    const unsubscribeLogs = onSnapshot(query(gameplayLogsCollectionRef), (snapshot) => {
      const logs: GameplayLog[] = [];
      snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() } as GameplayLog);
      });
      logs.sort((a, b) => (b.timestamp?.toDate()?.getTime() || 0) - (a.timestamp?.toDate()?.getTime() || 0));
      setGameplayLogs(logs);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeLogs();
    };
  }, [db, auth, auth?.currentUser]);

  const handleAnalyzeText = async () => {
    if (!gameplayTextInput.trim()) {
      setModalContent({ title: 'Input Error', description: 'Please enter gameplay text to analyze.' });
      setIsModalOpen(true);
      return;
    }

    setLoadingAnalysis(true);
    setModalContent({ title: 'AI Analysis', description: 'Analyzing gameplay...' });
    setIsModalOpen(true);

    try {
      const response = await fetch('/api/analyze-gameplay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameplayText: gameplayTextInput }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI analysis.');
      }

      const data: AiAnalysisResult = await response.json();

      console.log('AI Analysis Response received:', data);
      console.log('Objectives in response:', data.objectives);
      console.log('Objectives length:', data.objectives?.length || 0);

      if (db && auth?.currentUser) {
        const userId = auth.currentUser.uid;
        const appId = auth.__app_id || 'default-app-id';
        console.log('PerformanceDashboard: Writing gameplay log...');
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/gameplayLogs`), {
          userId: userId,
          gameplayText: gameplayTextInput,
          analysis: data,
          timestamp: serverTimestamp(),
        });
        console.log('PerformanceDashboard: Gameplay log created successfully');

        // Create objectives from the analysis
        if (data.objectives && data.objectives.length > 0) {
          console.log('Creating objectives for userId:', userId);
          console.log('Number of objectives:', data.objectives.length);
          console.log('Objectives to create:', data.objectives);
          const objectivesCollection = collection(db, `users/${userId}/objectives`);
          const objectivePromises = data.objectives.map((objectiveText: string, index: number) => {
            console.log(`Creating objective ${index + 1}:`, objectiveText);
            return addDoc(objectivesCollection, {
              text: objectiveText,
              status: 'Active',
              createdAt: serverTimestamp(),
            });
          });
          await Promise.all(objectivePromises);
          console.log('All objectives created successfully');
        } else {
          console.warn('No objectives in AI response:', data);
        }
      } else {
        console.error('Missing db or auth.currentUser', { db: !!db, auth: !!auth, currentUser: !!auth?.currentUser });
      }

      setModalContent({
        title: 'AI Analysis Results',
        description: (
          <div className="space-y-4 py-2">
            <div>
              <h3 className="font-semibold text-green-300 mb-1">Analysis:</h3>
              <p className="text-gray-300 whitespace-pre-wrap break-words">{data.analysis}</p>
            </div>
            {data.suggestions && data.suggestions.length > 0 && (
              <div>
                <h3 className="font-semibold text-yellow-300 mb-1">Suggestions:</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {data.suggestions.map((s: string, i: number) => <li key={i} className="break-words">{s}</li>)}
                </ul>
              </div>
            )}
            {data.errorsDetected && data.errorsDetected.length > 0 && (
              <div>
                <h3 className="font-semibold text-red-300 mb-1">Errors Detected:</h3>
                <ul className="list-disc list-inside text-gray-300 space-y-1">
                  {data.errorsDetected.map((e: string, i: number) => <li key={i} className="break-words">{e}</li>)}
                </ul>
              </div>
            )}
          </div>
        ),
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error getting AI analysis:', error);
      setModalContent({ title: 'Error', description: `Failed to get AI analysis: ${errorMessage}` });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => { // Explicitly typed 'event'
    const file = event.target.files?.[0];
    if (!file) {
      setModalContent({ title: 'Upload Error', description: 'No file selected.' });
      setIsModalOpen(true);
      return;
    }
    setUploadFile(file);
  };

  const handleUploadGameplay = async () => {
    if (!uploadFile) {
      setModalContent({ title: 'Upload Error', description: 'Please select a file to upload.' });
      setIsModalOpen(true);
      return;
    }

    if (!auth?.currentUser || !db) {
      setModalContent({ title: 'Upload Error', description: 'Authentication required to upload files.' });
      setIsModalOpen(true);
      return;
    }

    setLoadingUpload(true);
    setModalContent({ title: 'File Upload', description: `Uploading file: ${uploadFile.name}...` });
    setIsModalOpen(true);

    try {
      if (!auth?.currentUser) {
        throw new Error('Authentication required to upload files.');
      }

      const { publicUrl: fileUrl } = await uploadVideoFileToSupabase(auth.currentUser.uid, uploadFile);

      if (!fileUrl) {
        throw new Error('Upload succeeded but no file URL was returned.');
      }

      if (db && auth.currentUser) {
        const userId = auth.currentUser.uid;
        const appId = auth.__app_id || 'default-app-id';
        await addDoc(collection(db, `artifacts/${appId}/users/${userId}/gameplayLogs`), {
          userId: userId,
          fileName: uploadFile.name,
          fileUrl: fileUrl,
          timestamp: serverTimestamp(),
        });
      }

      setModalContent({ title: 'File Upload Success', description: `File "${uploadFile.name}" uploaded successfully!` });
      setUploadFile(null);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error uploading file:', error);
      setModalContent({ title: 'Upload Error', description: `Failed to upload file: ${errorMessage}` });
    } finally {
      setLoadingUpload(false);
    }
  };

  const handleDeleteAnalysis = async (logId: string) => {
    if (!auth?.currentUser || !db) {
      setModalContent({ title: 'Error', description: 'Authentication required.' });
      setIsModalOpen(true);
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const appId = auth.__app_id || 'default-app-id';
      const logRef = doc(db, `artifacts/${appId}/users/${userId}/gameplayLogs/${logId}`);
      await deleteDoc(logRef);
      setModalContent({ title: 'Success', description: 'Analysis entry deleted successfully.' });
      setIsModalOpen(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error deleting analysis:', error);
      setModalContent({ title: 'Error', description: `Failed to delete entry: ${errorMessage}` });
      setIsModalOpen(true);
    }
  };

  const handleClearAllHistory = async () => {
    if (!auth?.currentUser || !db) {
      setModalContent({ title: 'Error', description: 'Authentication required.' });
      setIsModalOpen(true);
      return;
    }

    if (gameplayLogs.length === 0) {
      setModalContent({ title: 'Info', description: 'No history to clear.' });
      setIsModalOpen(true);
      return;
    }

    const confirmClear = window.confirm(
      `Are you sure you want to delete all ${gameplayLogs.length} analysis entries? This action cannot be undone.`
    );

    if (!confirmClear) return;

    try {
      const userId = auth.currentUser.uid;
      const appId = auth.__app_id || 'default-app-id';
      
      // Delete all logs
      const deletePromises = gameplayLogs.map((log) => {
        const logRef = doc(db, `artifacts/${appId}/users/${userId}/gameplayLogs/${log.id}`);
        return deleteDoc(logRef);
      });

      await Promise.all(deletePromises);
      setModalContent({ title: 'Success', description: 'All analysis history has been cleared.' });
      setIsModalOpen(true);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
      console.error('Error clearing history:', error);
      setModalContent({ title: 'Error', description: `Failed to clear history: ${errorMessage}` });
      setIsModalOpen(true);
    }
  };

  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white">
        <p className="text-xl mb-4">Please log in to view the dashboard.</p>
        <Button onClick={() => window.location.href = '/'} className="bg-blue-600 hover:bg-blue-700 text-white">
          Go to Login
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8 font-inter">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl sm:text-4xl font-bold text-blue-400">AI Gaming Assistant Dashboard</h1>
        <Button onClick={() => signOut()} className="bg-red-600 hover:bg-red-700 text-white">
          Logout
        </Button>
      </header>

      <section className="mb-8 p-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-teal-400">Text-Based Gameplay Analysis</h2>
        <Textarea
          placeholder="Enter your gameplay details here for AI analysis (e.g., 'Match on Urzikstan, I landed at...', 'I died because...')"
          value={gameplayTextInput}
          onChange={(e) => setGameplayTextInput(e.target.value)}
          className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white mb-4 min-h-[120px] resize-y"
        />
        <Button
          onClick={handleAnalyzeText}
          disabled={loadingAnalysis || !gameplayTextInput.trim()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200"
        >
          {loadingAnalysis ? 'Analyzing...' : 'Get AI Analysis (Text)'}
        </Button>
      </section>

      <section className="mb-8 p-6 bg-gray-800 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-teal-400">Upload Gameplay File (e.g., Replay Data, Logs)</h2>
        <div className="grid w-full max-w-sm items-center gap-1.5">
          <Label htmlFor="gameplay-file" className="text-gray-300 mb-2">Choose File</Label>
          <Input
            id="gameplay-file"
            type="file"
            onChange={handleFileUpload}
            disabled={loadingUpload}
            className="block w-full text-sm text-gray-400
                       file:mr-4 file:py-2 file:px-4
                       file:rounded-full file:border-0
                       file:text-sm file:font-semibold
                       file:bg-blue-50 file:text-blue-700
                       hover:file:bg-blue-100
                       bg-gray-700 border border-gray-600 rounded-md cursor-pointer"
          />
          {uploadFile && (
            <p className="text-sm text-gray-400 mt-2">Selected: {uploadFile.name}</p>
          )}
          {loadingUpload && (
            <p className="text-sm text-yellow-400 mt-2">Uploading...</p>
          )}
          <Button
            onClick={handleUploadGameplay}
            disabled={loadingUpload || !uploadFile}
            className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200"
          >
            {loadingUpload ? 'Uploading...' : 'Upload Gameplay'}
          </Button>
        </div>
      </section>

      <section className="p-6 bg-gray-800 rounded-lg shadow-lg">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-teal-400">Analysis History</h2>
          {gameplayLogs.length > 0 && (
            <Button
              onClick={handleClearAllHistory}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-md transition duration-200"
            >
              Clear All History
            </Button>
          )}
        </div>
        {gameplayLogs.length === 0 ? (
          <p className="text-gray-400">No analysis history yet. Start by analyzing gameplay or uploading files.</p>
        ) : (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">Total entries: {gameplayLogs.length}</p>
            <ul className="space-y-3">
              {gameplayLogs.map((log) => (
                <li key={log.id} className="bg-gray-700 p-4 rounded-md border border-gray-600 relative">
                  <div className="flex justify-between items-start mb-2">
                    <p className="text-sm text-gray-400">
                      {log.timestamp ? new Date(log.timestamp.toDate()).toLocaleString() : 'No date'}
                    </p>
                    <button
                      onClick={() => handleDeleteAnalysis(log.id)}
                      className="text-red-400 hover:text-red-300 transition duration-150"
                      title="Delete this entry"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  {log.gameplayText && (
                    <p className="text-gray-200 mb-2">
                      <span className="font-semibold text-teal-300">Input:</span> {log.gameplayText}
                    </p>
                  )}
                  {log.analysis && (
                    <div className="space-y-2 mt-2">
                      <p className="text-green-300 font-semibold">Analysis:</p>
                      <p className="text-gray-300 whitespace-pre-wrap break-words">{log.analysis.analysis}</p>

                      {log.analysis.suggestions && log.analysis.suggestions.length > 0 && (
                        <>
                          <p className="text-yellow-300 font-semibold mt-2">Suggestions:</p>
                          <ul className="list-disc list-inside text-gray-300 space-y-1">
                            {log.analysis.suggestions.map((s, i) => (
                              <li key={i} className="break-words">{s}</li>
                            ))}
                          </ul>
                        </>
                      )}

                      {log.analysis.errorsDetected && log.analysis.errorsDetected.length > 0 && (
                        <>
                          <p className="text-red-300 font-semibold mt-2">Errors Detected:</p>
                          <ul className="list-disc list-inside text-gray-300 space-y-1">
                            {log.analysis.errorsDetected.map((e, i) => (
                              <li key={i} className="break-words">{e}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </div>
                  )}
                  {log.fileUrl && (
                    <p className="text-sm text-blue-400 mt-2">
                      <a href={log.fileUrl} target="_blank" rel="noopener noreferrer">
                        View Uploaded File: {log.fileName || 'file'}
                      </a>
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>

      {/* Global Modal for messages */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[600px] bg-gray-800 text-white border-gray-700 max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-blue-400">{modalContent.title}</DialogTitle>
            <DialogDescription className="text-gray-300">
              {modalContent.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-4">
            <Button onClick={() => setIsModalOpen(false)} className="bg-blue-600 hover:bg-blue-700 text-white">
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PerformanceDashboard;