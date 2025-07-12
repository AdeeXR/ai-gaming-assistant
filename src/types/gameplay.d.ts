// src/types/gameplay.d.ts

import { Timestamp } from 'firebase/firestore'; // <--- ADD THIS IMPORT

export interface AiAnalysisResult {
  analysis: string;
  suggestions: string[];
  errorsDetected: string[];
}

// Define a type for API error responses
export interface ApiErrorResponse {
  error: string;
  details?: string; // The optional 'details' property
}

export interface GameplayLog {
  id: string;
  userId: string;
  timestamp: Timestamp; // <--- CHANGE THIS FROM Date to Timestamp
  gameTitle?: string;
  logContent?: string;
  analysis?: AiAnalysisResult;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
}
