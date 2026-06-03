"use client";

import React, { useState, useRef, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Upload, Loader2, Zap, Eye, HeartHandshake, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useFirebase } from '@/lib/firebase';
import { gameMetadata, gameTitles } from '@/lib/gameMetadata';
import { collection, onSnapshot, query, doc, deleteDoc, addDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface AnalysisResult {
  analysis: string;
  suggestions: string[];
  errorsDetected: string[];
  verifiedPreviousObjectives: Array<{
    id: string;
    status: 'Improved' | 'Still Failing';
    reason: string;
  }>;
  newActiveObjectives: string[];
}

interface AnalysisHistory {
  id: string;
  userId: string;
  gameplayText?: string;
  gameTitle?: string;
  gameRole?: string;
  analysis?: AnalysisResult;
  timestamp: Timestamp;
  fileUrl?: string;
  fileName?: string;
}

const Dashboard: React.FC = () => {
  const { data: session } = useSession();
  const router = useRouter();
  const { db, auth } = useFirebase();
  const [gameTitle, setGameTitle] = useState('');
  const [gameRole, setGameRole] = useState('');
  const [textInput, setTextInput] = useState('');
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [telemetryPhase, setTelemetryPhase] = useState<string>('');
  const [analysisHistory, setAnalysisHistory] = useState<AnalysisHistory[]>([]);
  const [expandedHistoryIds, setExpandedHistoryIds] = useState<string[]>([]);
  const selectedGameMetadata = gameTitle ? gameMetadata[gameTitle] : undefined;
  const [showObjectivesModal, setShowObjectivesModal] = useState(false);

  useEffect(() => {
    if (!db || !auth || !auth.currentUser) return;

    const appId = auth.__app_id || 'default-app-id';
    const userId = auth.currentUser.uid;
    const gameplayLogsCollectionRef = collection(db, `artifacts/${appId}/users/${userId}/gameplayLogs`);

    const unsubscribe = onSnapshot(query(gameplayLogsCollectionRef), (snapshot) => {
      const logs: AnalysisHistory[] = [];
      snapshot.forEach(doc => {
        logs.push({ id: doc.id, ...doc.data() } as AnalysisHistory);
      });
      logs.sort((a, b) => (b.timestamp?.toDate()?.getTime() || 0) - (a.timestamp?.toDate()?.getTime() || 0));
      setAnalysisHistory(logs);
    });

    return () => unsubscribe();
  }, [db, auth, auth?.currentUser]);

  if (!session) {
    router.push('/');
    return null;
  }

  const toggleHistoryExpansion = (logId: string) => {
    setExpandedHistoryIds((prev) =>
      prev.includes(logId) ? prev.filter((id) => id !== logId) : [...prev, logId]
    );
  };

  const handleDeleteAnalysis = async (logId: string) => {
    if (!auth?.currentUser || !db) {
      setError('Authentication required.');
      return;
    }

    try {
      const userId = auth.currentUser.uid;
      const appId = auth.__app_id || 'default-app-id';
      const logRef = doc(db, `artifacts/${appId}/users/${userId}/gameplayLogs/${logId}`);
      await deleteDoc(logRef);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to delete entry: ${errorMessage}`);
    }
  };

  const handleClearAllHistory = async () => {
    if (!auth?.currentUser || !db) {
      setError('Authentication required.');
      return;
    }

    if (analysisHistory.length === 0) {
      setError('No history to clear.');
      return;
    }

    const confirmClear = window.confirm(
      `Are you sure you want to delete all ${analysisHistory.length} analysis entries? This action cannot be undone.`
    );

    if (!confirmClear) return;

    try {
      const userId = auth.currentUser.uid;
      const appId = auth.__app_id || 'default-app-id';
      
      const deletePromises = analysisHistory.map((log) => {
        const logRef = doc(db, `artifacts/${appId}/users/${userId}/gameplayLogs/${log.id}`);
        return deleteDoc(logRef);
      });

      await Promise.all(deletePromises);
      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      setError(`Failed to clear history: ${errorMessage}`);
    }
  };

  const handleVideoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setError(null);
    } else if (file) {
      setError('Please select a valid video file (MP4, WebM, etc.)');
    }
  };

  const handleRemoveVideo = () => {
    setVideoFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textInput.trim() && !videoFile) {
      setError('Please provide either text input or upload a video');
      return;
    }

    setLoading(true);
    setError(null);
    setTelemetryPhase('Initializing causal handshake...');

    try {
      let gameplayVideoUrl: string | undefined;

      if (videoFile) {
        setTelemetryPhase('Uploading gameplay video...');
        const uploadForm = new FormData();
        uploadForm.append('gameplayFile', videoFile);

        const uploadResponse = await fetch('/api/upload-gameplay', {
          method: 'POST',
          body: uploadForm,
        });

        if (!uploadResponse.ok) {
          const uploadErrorData = await uploadResponse.json().catch(() => ({ error: 'Unknown upload error' }));
          throw new Error(uploadErrorData.error || 'Upload failed');
        }

        const uploadResult = await uploadResponse.json();
        gameplayVideoUrl = uploadResult.fileUrl;

        if (!gameplayVideoUrl) {
          throw new Error('Video upload succeeded but no URL returned.');
        }
      }

      setTelemetryPhase('Analyzing gameplay...');

      const analysisRequestBody: { gameplayText?: string; gameplayVideoUrl?: string; gameTitle?: string; gameRole?: string } = {};

      if (gameTitle) {
        analysisRequestBody.gameTitle = gameTitle;
      }
      if (gameRole) {
        analysisRequestBody.gameRole = gameRole;
      }
      if (textInput.trim()) {
        analysisRequestBody.gameplayText = textInput.trim();
      }
      if (gameplayVideoUrl) {
        analysisRequestBody.gameplayVideoUrl = gameplayVideoUrl;
      }

      const response = await fetch('/api/analyze-gameplay', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analysisRequestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      setTelemetryPhase('Verifying expertise alignment...');
      const result = await response.json();
      const analysisData = {
        analysis: result.analysis || '',
        suggestions: Array.isArray(result.suggestions) ? result.suggestions : [],
        errorsDetected: Array.isArray(result.errorsDetected) ? result.errorsDetected : [],
        verifiedPreviousObjectives: Array.isArray(result.verifiedPreviousObjectives)
          ? result.verifiedPreviousObjectives
          : [],
        newActiveObjectives: Array.isArray(result.objectives) ? result.objectives : [],
      };

      setAnalysisResult(analysisData);

      if (db && auth?.currentUser) {
        try {
          const userId = auth.currentUser.uid;
          const appId = auth.__app_id || 'default-app-id';
          const historyEntry: Record<string, unknown> = {
            userId,
            analysis: analysisData,
            timestamp: serverTimestamp(),
          };

          if (gameTitle) {
            historyEntry.gameTitle = gameTitle;
          }
          if (gameRole) {
            historyEntry.gameRole = gameRole;
          }
          if (textInput.trim()) {
            historyEntry.gameplayText = textInput.trim();
          }
          if (gameplayVideoUrl) {
            historyEntry.fileUrl = gameplayVideoUrl;
          }

          await addDoc(collection(db, `artifacts/${appId}/users/${userId}/gameplayLogs`), historyEntry);

          // Create objectives from the analysis
          if (analysisData.newActiveObjectives && analysisData.newActiveObjectives.length > 0) {
            console.log('Creating objectives for userId:', userId);
            const objectivesCollection = collection(db, `users/${userId}/objectives`);
            const objectivePromises = analysisData.newActiveObjectives.map((objectiveText: string) => {
              return addDoc(objectivesCollection, {
                text: objectiveText,
                status: 'Active',
                createdAt: serverTimestamp(),
              });
            });
            await Promise.all(objectivePromises);
            console.log('All objectives created successfully');
            // Show objectives modal
            setShowObjectivesModal(true);
          }
        } catch (logError) {
          console.error('Failed to record gameplay analysis history:', logError);
        }
      }

      setGameTitle('');
      setTextInput('');
      setGameRole('');
      handleRemoveVideo();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Error: ${errorMessage}`);
    } finally {
      setLoading(false);
      setTelemetryPhase('');
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
              Smart Detective
            </h1>
          </div>
          <p className="text-cyan-400/60 uppercase tracking-widest text-sm">Tactical Analysis • Causal Reasoning • Mastery Verification</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form Section */}
          <div className="lg:col-span-2">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8 space-y-6 hover:border-white/20 transition-all duration-300">
              <div className="flex items-center gap-2 mb-6">
                <HeartHandshake className="w-5 h-5 text-fuchsia-500" />
                <h2 className="text-2xl font-bold uppercase tracking-tighter">Diagnostic Form</h2>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Game Title */}
                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-3">
                    Game Title (Optional)
                  </label>
                  <select
                    value={gameTitle}
                    onChange={(e) => {
                      setGameTitle(e.target.value);
                      setGameRole('');
                    }}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200 text-sm"
                    disabled={loading}
                  >
                    <option className="text-black" value="">Select a game</option>
                    {gameTitles.map((title) => (
                      <option key={title} className="text-black" value={title}>{title}</option>
                    ))}
                  </select>
                </div>

                {selectedGameMetadata?.roleGuidance && (
                  <div>
                    <label className="block text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-3">
                      Role / Position
                    </label>
                    <select
                      value={gameRole}
                      onChange={(e) => setGameRole(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200 text-sm"
                      disabled={loading}
                    >
                      <option className="text-black" value="">Select role</option>
                      {Object.keys(selectedGameMetadata.roleGuidance).map((role) => (
                        <option key={role} className="text-black" value={role}>{role}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Text Input */}
                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-3">
                    Gameplay Context (Optional)
                  </label>
                  <textarea
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Describe what happened in your game round. Example: 'I died pushing site without backup, lost utility economy...'"
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-cyan-400/50 focus:ring-2 focus:ring-cyan-400/20 transition-all duration-200 font-mono text-sm"
                    rows={4}
                    disabled={loading}
                  />
                </div>

                {/* Video Upload */}
                <div>
                  <label className="block text-sm font-semibold uppercase tracking-wider text-cyan-400 mb-3">
                    Gameplay Video (Optional)
                  </label>

                  {!videoFile ? (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-white/20 rounded-lg p-8 cursor-pointer hover:border-cyan-400/50 hover:bg-cyan-500/5 transition-all duration-200 text-center"
                    >
                      <Upload className="w-8 h-8 text-cyan-400 mx-auto mb-3" />
                      <p className="text-white font-semibold mb-1">Drop your gameplay clip here</p>
                      <p className="text-white/50 text-sm">or click to browse (MP4, WebM)</p>
                    </div>
                  ) : (
                    <div className="bg-white/[0.03] border border-cyan-400/30 rounded-lg p-4 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                          <Upload className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                          <p className="text-white font-semibold text-sm truncate max-w-xs">{videoFile.name}</p>
                          <p className="text-white/50 text-xs">{(videoFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleRemoveVideo}
                        disabled={loading}
                        className="px-3 py-1 bg-red-500/20 border border-red-500/50 text-red-400 rounded text-xs font-semibold hover:bg-red-500/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Remove
                      </button>
                    </div>
                  )}

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="video/*"
                    onChange={handleVideoSelect}
                    className="hidden"
                    disabled={loading}
                  />
                </div>

                {/* Error Display */}
                {error && (
                  <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                    <p className="text-red-400 text-sm font-mono">{error}</p>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-400 hover:to-cyan-300 text-black font-bold uppercase tracking-wider py-3 rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      {telemetryPhase || 'Analyzing...'}
                    </>
                  ) : (
                    <>
                      <Zap className="w-5 h-5" />
                      Analyze Gameplay
                    </>
                  )}
                </Button>
              </form>
            </div>
          </div>

          {/* Sidebar Info */}
          <div className="space-y-4">
            <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-400/30 rounded-2xl p-6">
              <h3 className="text-cyan-400 font-bold uppercase tracking-wider text-sm mb-3">How It Works</h3>
              <div className="space-y-2 text-sm text-white/70">
                <p>✓ Submit gameplay text or video</p>
                <p>✓ AI verifies past objectives</p>
                <p>✓ Identifies causal errors</p>
                <p>✓ Generates new goals</p>
              </div>
            </div>
          </div>
        </div>

        {/* Analysis Results */}
        {analysisResult && (
          <div className="mt-12 space-y-8">
            <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
              <h2 className="text-2xl font-bold uppercase tracking-tighter mb-6 flex items-center gap-2">
                <Eye className="w-6 h-6 text-fuchsia-500" />
                Causal Analysis
              </h2>

              <div className="bg-white/5 border border-white/10 rounded-lg p-6 mb-6">
                <p className="text-white leading-relaxed font-mono text-sm">{analysisResult.analysis}</p>
              </div>

              {/* Errors Detected */}
              {analysisResult.errorsDetected?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-cyan-400 font-bold uppercase tracking-wider text-sm mb-3">Errors Detected</h3>
                  <div className="space-y-2">
                    {analysisResult.errorsDetected.map((error, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-red-500 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-red-400/80 text-sm">{error}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {analysisResult.suggestions?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-green-400 font-bold uppercase tracking-wider text-sm mb-3">Suggestions</h3>
                  <div className="space-y-2">
                    {analysisResult.suggestions.map((suggestion, idx) => (
                      <div key={idx} className="flex items-start gap-3">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                        <p className="text-green-400/80 text-sm">{suggestion}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Verified Objectives */}
              {analysisResult.verifiedPreviousObjectives?.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-cyan-400 font-bold uppercase tracking-wider text-sm mb-3">Verification Results</h3>
                  <div className="space-y-3">
                    {analysisResult.verifiedPreviousObjectives.map((obj, idx) => (
                      <div
                        key={idx}
                        className={`px-4 py-3 rounded-lg border ${
                          obj.status === 'Improved'
                            ? 'bg-green-500/10 border-green-500/30 text-green-400'
                            : 'bg-yellow-500/10 border-yellow-500/30 text-yellow-400'
                        }`}
                      >
                        <p className="font-semibold text-sm mb-1">{obj.status}</p>
                        <p className="text-xs opacity-80">{obj.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* New Objectives */}
              {analysisResult.newActiveObjectives?.length > 0 && (
                <div>
                  <h3 className="text-fuchsia-400 font-bold uppercase tracking-wider text-sm mb-3">New Objectives</h3>
                  <div className="space-y-2">
                    {analysisResult.newActiveObjectives.map((obj, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg">
                        <div className="w-2 h-2 bg-fuchsia-500 rounded-full mt-1.5 flex-shrink-0" />
                        <p className="text-fuchsia-200 text-sm">{obj}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Analysis History Section */}
        <div className="mt-12">
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-2xl p-8">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold uppercase tracking-tighter flex items-center gap-2">
                <Zap className="w-6 h-6 text-cyan-500" />
                Analysis History
              </h2>
              {analysisHistory.length > 0 && (
                <Button
                  onClick={handleClearAllHistory}
                  className="bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-4 rounded-lg transition duration-200"
                >
                  Clear All History
                </Button>
              )}
            </div>

            {analysisHistory.length === 0 ? (
              <p className="text-white/60 text-sm">No analysis history yet. Start by analyzing gameplay above.</p>
            ) : (
              <div className="space-y-4">
                <p className="text-white/60 text-sm">Total entries: {analysisHistory.length}</p>
                <div className="space-y-3 max-h-[600px] overflow-y-auto">
                  {analysisHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white/5 border border-white/10 rounded-lg p-4 hover:border-white/20 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3 gap-3">
                        <div>
                          <p className="text-white/50 text-xs font-mono">
                            {entry.timestamp ? new Date(entry.timestamp.toDate()).toLocaleString() : 'No date'}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleHistoryExpansion(entry.id)}
                            className="text-cyan-300 hover:text-cyan-100 text-xs font-semibold uppercase tracking-wider transition-colors"
                          >
                            {expandedHistoryIds.includes(entry.id) ? 'Minimize' : 'Expand'}
                          </button>
                          <button
                            onClick={() => handleDeleteAnalysis(entry.id)}
                            className="text-red-400 hover:text-red-300 transition duration-150"
                            title="Delete this entry"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>

                      {(entry.gameTitle || entry.gameRole) && (
                        <p className={`text-white/80 text-sm mb-2 ${expandedHistoryIds.includes(entry.id) ? '' : 'line-clamp-2'} whitespace-pre-wrap break-words`}>
                          <span className="text-cyan-400 font-semibold">Context:</span>{' '}
                          {entry.gameTitle ? entry.gameTitle : 'Unspecified game'}
                          {entry.gameRole ? ` • ${entry.gameRole}` : ''}
                        </p>
                      )}
                      {entry.gameplayText && (
                        <p className={`text-white/80 text-sm mb-2 ${expandedHistoryIds.includes(entry.id) ? '' : 'line-clamp-2'} whitespace-pre-wrap break-words`}>
                          <span className="text-cyan-400 font-semibold">Input:</span> {entry.gameplayText}
                        </p>
                      )}

                      {entry.analysis && (
                        <div className="text-sm space-y-2">
                          <p className="text-white/70">
                            <span className="text-green-400 font-semibold">Analysis:</span>
                          </p>
                          <p className={`text-white/60 ${expandedHistoryIds.includes(entry.id) ? '' : 'line-clamp-3'} whitespace-pre-wrap break-words`}>
                            {entry.analysis.analysis}
                          </p>

                          {entry.analysis.suggestions && entry.analysis.suggestions.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-yellow-400 font-semibold text-xs">Suggestions ({entry.analysis.suggestions.length})</p>
                              {expandedHistoryIds.includes(entry.id) ? (
                                <ul className="list-disc list-inside text-white/70 text-xs space-y-1">
                                  {entry.analysis.suggestions.map((suggestion, idx) => (
                                    <li key={idx}>{suggestion}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          )}

                          {entry.analysis.errorsDetected && entry.analysis.errorsDetected.length > 0 && (
                            <div className="space-y-1">
                              <p className="text-red-400 font-semibold text-xs">Errors Detected ({entry.analysis.errorsDetected.length})</p>
                              {expandedHistoryIds.includes(entry.id) ? (
                                <ul className="list-disc list-inside text-white/70 text-xs space-y-1">
                                  {entry.analysis.errorsDetected.map((errorText, idx) => (
                                    <li key={idx}>{errorText}</li>
                                  ))}
                                </ul>
                              ) : null}
                            </div>
                          )}
                        </div>
                      )}

                      {entry.fileUrl && (
                        <p className="text-xs text-blue-400 mt-2">
                          <a href={entry.fileUrl} target="_blank" rel="noopener noreferrer">
                            View File: {entry.fileName || 'uploaded file'}
                          </a>
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Objectives Modal */}
      <Dialog open={showObjectivesModal} onOpenChange={setShowObjectivesModal}>
        <DialogContent className="bg-gray-900 border-gray-700 text-white">
          <DialogHeader>
            <DialogTitle className="text-fuchsia-400 text-xl font-bold">New Objectives Added!</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-gray-300">
              Based on your gameplay analysis, here are your new active objectives:
            </p>
            {analysisResult?.newActiveObjectives && analysisResult.newActiveObjectives.length > 0 ? (
              <div className="space-y-3">
                {analysisResult.newActiveObjectives.map((objective, idx) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-lg">
                    <div className="w-2 h-2 bg-fuchsia-500 rounded-full mt-1.5 flex-shrink-0" />
                    <p className="text-fuchsia-200 text-sm">{objective}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400">No new objectives were generated.</p>
            )}
            <div className="flex justify-between items-center pt-4">
              <p className="text-sm text-gray-400">
                Check your Progression Dashboard to track these objectives.
              </p>
              <Button
                onClick={() => setShowObjectivesModal(false)}
                className="bg-fuchsia-600 hover:bg-fuchsia-700 text-white"
              >
                Got it!
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
