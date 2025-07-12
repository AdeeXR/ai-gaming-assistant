// src/types/gameplay.d.ts

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
  timestamp: Date;
  gameTitle?: string;
  logContent?: string;
  analysis?: AiAnalysisResult;
  fileUrl?: string;
  fileName?: string;
  fileMimeType?: string;
}
