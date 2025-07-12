// src/components/PerformanceDashboard.tsx
"use client"; // This directive is essential for client-side functionality (hooks, event handlers)

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useFirebase } from '@/lib/firebase'; // <--- REMOVED .tsx EXTENSION HERE
import { collection, doc, onSnapshot, query, Timestamp } from 'firebase/firestore'; // Import Timestamp
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UserProfile } from '@/types/user';
import { GameplayLog, AiAnalysisResult } from '@/types/gameplay'; // Import AiAnalysisResult

const PerformanceDashboard: React.FC = () => {
  const { data: session } = useSession();
  const { db, currentUser } = useFirebase();
  const [gameplayText, setGameplayText] = useState('');
  // Use AiAnalysisResult type for analysisResult
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);
  const [loadingUpload, setLoadingUpload] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null); // ESLint: no-unused-vars
  const [gameplayLogs, setGameplayLogs] = useState<GameplayLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  // Type for modalContent.description is React.ReactNode to allow JSX elements
  const [modalContent, setModalContent] = useState<{ title: string; description: React.ReactNode }>({ title: '', description: '' });


  useEffect(() => {
    if (!db || !currentUser?.uid) return;

    const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id';
    const userProfileRef = doc(db, `artifacts/${appId}/users/${currentUser.uid}/profiles/userDoc`);
    const gameplayLogsCollectionRef = collection(db, `artifacts/${appId}/users/${currentUser.uid}/gameplay_logs`);

    // Fetch user profile
    const unsubscribeProfile = onSnapshot(userProfileRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data() as UserProfile);
      } else {
        // Handle case where profile doesn't exist (should be created on first login)
        console.warn("User profile not found.");
      }
    });

    // Fetch gameplay logs
    const q = query(gameplayLogsCollectionRef);
    const unsubscribeLogs = onSnapshot(q, (snapshot) => {
      const logs: GameplayLog[] = [];
      snapshot.forEach(doc => {
        // Ensure that the data pushed is correctly typed as GameplayLog
        logs.push({ id: doc.id, ...doc.data() } as GameplayLog);
      });
      // Sort in memory by timestamp (which is now correctly Timestamp type)
      logs.sort((a, b) => (b.timestamp?.toDate()?.getTime() || 0) - (a.timestamp?.toDate()?.getTime() || 0));
      setGameplayLogs(logs);
    });

    return () => {
      unsubscribeProfile();
      unsubscribeLogs();
    };
  }, [db, currentUser?.uid]);

  const handleAnalyzeText = async () => {
    setLoadingAnalysis(true);
    setAnalysisResult(null);
    setModalContent({ title: 'AI Analysis', description: 'Analyzing gameplay...' });
    setIsModalOpen(true);

    try {
      const response = await fetch('/api/analyze-gameplay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ gameplayText }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to get AI analysis.');
      }

      const data: AiAnalysisResult = await response.json(); // Explicitly type data as AiAnalysisResult
      setAnalysisResult(data);
      setModalContent({
        title: 'AI Analysis Results',
        description: ( // description is now React.ReactNode, so JSX is allowed
          <div>
            <h3 className="font-bold text-lg mb-2 text-blue-400">Analysis:</h3>
            <p className="mb-4 text-gray-300">{data.analysis}</p>
            <h3 className="font-bold text-lg mb-2 text-blue-400">Suggestions:</h3>
            <ul className="list-disc list-inside mb-4 text-gray-300">
              {data.suggestions.map((s: string, i: number) => <li key={i}>{s}</li>)}
            </ul>
            <h3 className="font-bold text-lg mb-2 text-blue-400">Errors Detected:</h3>
            <ul className="list-disc list-inside text-gray-300">
              {data.errorsDetected.map((e: string, i: number) => <li key={i}>{e}</li>)}
            </ul>
          </div>
        ),
      });
    } catch (error: any) { // ESLint: no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error('Error getting AI analysis:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setModalContent({ title: 'Error', description: `Failed to get AI analysis: ${(error as any).message}` });
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setUploadFile(e.target.files[0]);
    }
  };

  const handleUploadGameplay = async () => {
    if (!uploadFile) {
      setModalContent({ title: 'Upload Error', description: 'Please select a file to upload.' });
      setIsModalOpen(true);
      return;
    }

    setLoadingUpload(true);
    setUploadMessage(null);
    setModalContent({ title: 'File Upload', description: 'Uploading file...' });
    setIsModalOpen(true);

    const formData = new FormData();
    formData.append('gameplayFile', uploadFile);

    try {
      const response = await fetch('/api/upload-gameplay', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to upload file.');
      }

      const data = await response.json();
      setUploadMessage(data.message);
      setModalContent({ title: 'File Upload Success', description: `File uploaded: ${uploadFile.name}` });
      setUploadFile(null); // Clear the selected file
    } catch (error: any) { // ESLint: no-explicit-any
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      console.error('Error uploading file:', error);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setModalContent({ title: 'Upload Error', description: `Failed to upload file: ${(error as any).message}` });
    } finally {
      setLoadingUpload(false);
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
        <p>Please log in to access the Performance Dashboard.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 md:p-10">
      <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center text-blue-400">
        AI Gaming Assistant Dashboard
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
        {/* Text Analysis Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-blue-300">Text-Based Gameplay Analysis</h2>
          <textarea
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={8}
            placeholder="Paste your gameplay log or describe your recent match here (e.g., 'Lost lane phase as ADC, missed 3 last hits, died to gank twice, team fight positioning was bad')."
            value={gameplayText}
            onChange={(e) => setGameplayText(e.target.value)}
          ></textarea>
          <Button
            onClick={handleAnalyzeText}
            disabled={loadingAnalysis || !gameplayText.trim()}
            className="mt-4 w-full bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200"
          >
            {loadingAnalysis ? 'Analyzing...' : 'Get AI Analysis (Text)'}
          </Button>
        </div>

        {/* File Upload Section */}
        <div className="bg-gray-800 p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-semibold mb-4 text-blue-300">Upload Gameplay File (e.g., Replay Data, Logs)</h2>
          <input
            type="file"
            onChange={handleFileUpload}
            className="w-full p-3 rounded-md bg-gray-700 border border-gray-600 text-white file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-500 file:text-white hover:file:bg-blue-600 cursor-pointer"
          />
          <Button
            onClick={handleUploadGameplay}
            disabled={loadingUpload || !uploadFile}
            className="mt-4 w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:shadow-outline transition duration-200"
          >
            {loadingUpload ? 'Uploading...' : 'Upload Gameplay'}
          </Button>
        </div>
      </div>

      {/* Gameplay History Section */}
      <div className="mt-10 max-w-6xl mx-auto bg-gray-800 p-6 rounded-lg shadow-lg">
        <h2 className="text-2xl font-semibold mb-4 text-blue-300">Your Gameplay History</h2>
        {gameplayLogs.length === 0 ? (
          <p className="text-gray-400">No gameplay logs uploaded yet.</p>
        ) : (
          <ul className="space-y-3">
            {gameplayLogs.map((log) => (
              <li key={log.id} className="bg-gray-700 p-4 rounded-md flex justify-between items-center">
                <div>
                  <p className="text-lg font-medium text-blue-200">{log.fileName}</p>
                  <p className="text-sm text-gray-400">
                    Uploaded on: {log.timestamp?.toDate().toLocaleString()}
                  </p>
                  <a
                    href={log.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline text-sm"
                  >
                    View File
                  </a>
                </div>
                {/* Potentially add a button to trigger analysis from history here */}
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Global Modal for messages */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px] bg-gray-800 text-white border-gray-700">
          <DialogHeader>
            <DialogTitle className="text-blue-400">{modalContent.title}</DialogTitle>
            <DialogDescription className="text-gray-300">
              {modalContent.description}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end">
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