// src/components/PerformanceDashboard.tsx
'use client';

import React, { useState, useEffect } from 'react';
import * as Separator from '@radix-ui/react-separator';
import { useFirebase } from '@/lib/firebase';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { useSession } from 'next-auth/react';
import { AiAnalysisResult, ApiErrorResponse } from '@/types/gameplay'; // Import ApiErrorResponse
import { Button } from './ui/button';

const PerformanceDashboard: React.FC = () => {
  const { data: session } = useSession();
  const userId = session?.user?.id;
  const { db } = useFirebase();

  const [gameplayInput, setGameplayInput] = useState('');
  const [gameplayFile, setGameplayFile] = useState<File | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AiAnalysisResult | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);
  const [loadingUpload, setLoadingUpload] = useState(false);
  const [error, setError] = useState('');
  const [uploadMessage, setUploadMessage] = useState('');
  const [userProfile, setUserProfile] = useState<any>(null);

  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID || 'default-app-id';

  useEffect(() => {
    if (!userId || !db) return;

    const userDocRef = doc(db, `artifacts/${appId}/users/${userId}/profiles/userDoc`);
    const unsubscribe = onSnapshot(userDocRef, (docSnap) => {
      if (docSnap.exists()) {
        setUserProfile(docSnap.data());
      } else {
        setDoc(userDocRef, { username: `Player_${userId.substring(0, 8)}`, bio: 'New player' }, { merge: true });
        setUserProfile({ username: `Player_${userId.substring(0, 8)}`, bio: 'New player' });
      }
    }, (err) => {
      console.error("Error fetching user profile:", err);
    });

    return () => unsubscribe();
  }, [userId, db, appId]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setGameplayFile(event.target.files[0]);
      setGameplayInput('');
    } else {
      setGameplayFile(null);
    }
  };

  const handleUploadGameplay = async () => {
    if (!gameplayFile) {
      setUploadMessage('Please select a file to upload.');
      return;
    }

    setLoadingUpload(true);
    setUploadMessage('');
    setError('');

    const formData = new FormData();
    formData.append('gameplayFile', gameplayFile);

    try {
      const response = await fetch('/api/upload-gameplay', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        setUploadMessage(`Upload successful: ${data.fileUrl}`);
      } else {
        setError(`Upload failed: ${data.error || 'Unknown error'}`);
      }
    } catch (err: any) {
      console.error("Error uploading gameplay:", err);
      setError(`Failed to upload gameplay. Error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingUpload(false);
      setGameplayFile(null);
      if (document.getElementById('file-upload-input')) {
        (document.getElementById('file-upload-input') as HTMLInputElement).value = '';
      }
    }
  };


  const handleAnalyzeGameplay = async () => {
    if (!gameplayInput.trim()) {
      setError("Please enter some gameplay text to analyze.");
      return;
    }
    setLoadingAnalysis(true);
    setAnalysisResult(null);
    setError('');

    try {
      const response = await fetch('/api/analyze-gameplay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        // Fix for Error 1: Use gameplayInput instead of gameplayText
        body: JSON.stringify({ gameplayText: gameplayInput }), // Pass gameplayInput
      });

      const data = await response.json();

      if (response.ok) {
        // Cast data to AiAnalysisResult on success
        setAnalysisResult(data as AiAnalysisResult);
        setError('');
      } else {
        // Fix for Error 2: Handle error response using ApiErrorResponse type
        const errorData = data as ApiErrorResponse;
        setError(errorData.error || errorData.details || 'Failed to get AI analysis. Unknown error from server.');
      }
    } catch (err: any) {
      console.error("Error analyzing gameplay:", err);
      setError(`Failed to analyze gameplay. Error: ${err.message || 'Unknown error'}`);
    } finally {
      setLoadingAnalysis(false);
    }
  };

  const mockHeatmapData = [
    { label: 'Map Area A', value: 85, color: 'bg-red-500' },
    { label: 'Map Area B', value: 60, color: 'bg-orange-500' },
    { label: 'Map Area C', value: 40, color: 'bg-yellow-500' },
    { label: 'Map Area D', value: 20, color: 'bg-green-500' },
  ];

  const mockReactionTimeData = [
    { label: 'Avg. Reaction (ms)', value: 180 },
    { label: 'Best Reaction (ms)', value: 120 },
    { label: 'Worst Reaction (ms)', value: 250 },
  ];

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p className="text-xl text-gray-400">Please sign in to view the dashboard.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 pt-24 bg-gray-900 min-h-screen text-white">
      <h2 className="text-4xl font-extrabold text-teal-400 mb-8 text-center animate-fade-in-down">Performance Dashboard</h2>

      <section className="bg-gray-800 p-8 rounded-xl shadow-2xl mb-12 transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <h3 className="text-3xl font-bold text-gray-200 mb-6 flex items-center">
          <svg className="w-8 h-8 mr-3 text-purple-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0113 3.414L16.586 7A2 2 0 0118 8.414V16a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm5 2a1 1 0 00-1 1v3.586l1.293-1.293a1 1 0 011.414 0l.707.707A1 1 0 0112 11.586V7a1 1 0 00-1-1H9z" clipRule="evenodd"></path></svg>
          Gameplay Analysis
        </h3>
        <p className="text-gray-400 mb-6">Upload your gameplay video clips or paste logs below for AI-powered analysis. For this demo, you can paste text logs or upload a small file (e.g., a text file).</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <label htmlFor="gameplay-log" className="block text-gray-300 text-lg font-medium mb-2">Paste Gameplay Log/Description:</label>
              <textarea
                id="gameplay-log"
                className="w-full min-h-[150px] p-4 rounded-lg bg-gray-700 border border-gray-600 focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-colors text-white text-sm"
                placeholder="Describe your gameplay, e.g., 'In round 3 of CS:GO, I rushed B site, missed two easy shots, then got flanked from connector. My positioning felt off.'"
                value={gameplayInput}
                onChange={(e) => setGameplayInput(e.target.value)}
                disabled={!!gameplayFile}
              ></textarea>
            </div>
            <p className="text-center text-gray-400">OR</p>
            <div>
              <label htmlFor="file-upload-input" className="block text-gray-300 text-lg font-medium mb-2">Upload Gameplay File:</label>
              <input
                id="file-upload-input"
                type="file"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-300 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-violet-50 file:text-violet-700 hover:file:bg-violet-100 cursor-pointer"
                disabled={!!gameplayInput.trim()}
              />
              <div className="mt-2 text-gray-400 text-sm">
                {gameplayFile ? `Selected: ${gameplayFile.name}` : 'No file selected.'}
              </div>
            </div>
            <Button
              onClick={handleUploadGameplay}
              disabled={loadingUpload || !gameplayFile}
              className="w-full"
            >
              {loadingUpload ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Uploading...
                </>
              ) : (
                'Upload Gameplay'
              )}
            </Button>
            {uploadMessage && <p className="text-green-400 text-sm mt-2 text-center">{uploadMessage}</p>}


            <Button
              onClick={handleAnalyzeGameplay}
              disabled={loadingAnalysis || !gameplayInput.trim()}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loadingAnalysis ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                  Analyzing...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M10 2a6 6 0 00-6 6v3.586l-.707.707A1 1 0 012 14v1a1 1 0 01-1 1H1v1h16v-1h-2a1 1 0 01-1-1v-1a1 1 0 01-.707-.293L10 10.414V8a6 6 0 00-6-6zM6 8a4 4 001-4 4h8a4 4 001-4 4V8a4 4 001-4-4z"></path></svg>
                  Get AI Analysis (Text)
                </>
              )}
            </Button>
            {error && <p className="text-red-400 text-sm mt-2 text-center">{error}</p>}
          </div>

          {analysisResult && (
            <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 shadow-inner">
              <h4 className="text-xl font-bold text-teal-300 mb-4">AI Feedback:</h4>
              <div className="space-y-4 text-gray-300">
                <div>
                  <p className="font-semibold text-teal-200">Analysis:</p>
                  <p className="text-sm">{analysisResult.analysis}</p>
                </div>
                <div>
                  <p className="font-semibold text-teal-200">Suggestions:</p>
                  <ul className="list-disc list-inside text-sm pl-4">
                    {analysisResult.suggestions.map((s: string, i: number) => (
                      <li key={i}>{s}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="font-semibold text-teal-200">Errors Detected:</p>
                  <ul className="list-disc list-inside text-sm pl-4">
                    {analysisResult.errorsDetected.map((e: string, i: number) => (
                      <li key={i} className="text-red-300">{e}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <Separator.Root className="bg-gray-700 h-px my-12 w-3/4 mx-auto" decorative />

      <section className="bg-gray-800 p-8 rounded-xl shadow-2xl mb-12 transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <h3 className="text-3xl font-bold text-gray-200 mb-6 flex items-center">
          <svg className="w-8 h-8 mr-3 text-green-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l3 3a1 1 0 001.414-1.414L11 9.586V6z" clipRule="evenodd"></path></svg>
          Key Performance Metrics
        </h3>
        <p className="text-gray-400 mb-6">Visual summaries of your recent gameplay, including heatmaps and reaction times.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 shadow-inner">
            <h4 className="text-xl font-bold text-teal-300 mb-4">Map Activity Heatmap (Simulated)</h4>
            <div className="space-y-3">
              {mockHeatmapData.map((data, index) => (
                <div key={index} className="flex items-center">
                  <span className="w-32 text-gray-300 text-sm">{data.label}:</span>
                  <div className="flex-1 bg-gray-600 rounded-full h-4 relative">
                    <div
                      className={`${data.color} h-4 rounded-full transition-all duration-700 ease-out`}
                      style={{ width: `${data.value}%` }}
                    ></div>
                    <span className="absolute right-2 top-0 text-xs font-semibold text-white leading-4">{data.value}%</span>
                  </div>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">Simulated data showing activity intensity across different map areas.</p>
          </div>

          <div className="bg-gray-700 p-6 rounded-lg border border-gray-600 shadow-inner">
            <h4 className="text-xl font-bold text-teal-300 mb-4">Reaction Time (Simulated)</h4>
            <div className="space-y-3">
              {mockReactionTimeData.map((data, index) => (
                <div key={index} className="flex justify-between items-center text-gray-300 text-lg font-medium">
                  <span>{data.label}:</span>
                  <span className="text-teal-400 text-2xl font-bold">{data.value} ms</span>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-4">Simulated data reflecting your in-game reaction speeds.</p>
          </div>
        </div>
      </section>

      <section className="bg-gray-800 p-8 rounded-xl shadow-2xl transform hover:scale-105 transition-transform duration-300 ease-in-out">
        <h3 className="text-3xl font-bold text-gray-200 mb-6 flex items-center">
          <svg className="w-8 h-8 mr-3 text-orange-400" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"><path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z"></path><path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd"></path></svg>
          Strategy Suggestions
        </h3>
        <p className="text-gray-400 mb-6">AI-generated strategies based on your analyzed gameplay history.</p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { title: 'Improved Map Control', desc: 'Focus on securing key areas like mid and high-ground positions early in the round.' },
            { title: 'Better Economy Management', desc: 'Optimize your buys based on team economy and enemy weapon disparities.' },
            { title: 'Advanced Flank Routes', desc: 'Identify and utilize less common flank paths to catch enemies off guard.' },
            { title: 'Effective Utility Usage', desc: 'Learn optimal smoke, flash, and molotov placements for various scenarios.' },
            { title: 'Crosshair Placement Mastery', desc: 'Practice keeping your crosshair at head height and around corners for quicker kills.' },
            { title: 'Team Communication Enhancement', desc: 'Work on concise and clear comms, especially during critical moments.' },
          ].map((suggestion, index) => (
            <div key={index} className="bg-gray-700 p-5 rounded-lg border border-gray-600 shadow-inner flex flex-col items-start hover:bg-gray-600 transition-colors duration-200">
              <h5 className="text-xl font-semibold text-teal-300 mb-2">{suggestion.title}</h5>
              <p className="text-gray-300 text-sm">{suggestion.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

export default PerformanceDashboard;