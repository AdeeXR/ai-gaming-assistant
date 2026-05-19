export interface UserProfile {
  username: string;
  bio: string;
  favoriteGame: string;
  avatarUrl?: string; // Optional URL for avatar image
  lastUpdated?: Date;
  // Add other user profile fields as needed
}

export interface Objective {
  id: string;
  text: string;
  status: 'Active' | 'Improved' | 'Still Failing';
  createdAt?: Date;
  completedAt?: Date;
  lastVerified?: Date;
  verificationReason?: string;
}

export interface Analysis {
  id: string;
  userId: string;
  textInput: string | null;
  videoUri: string | null;
  analysis: string;
  errorsDetected: string[];
  verifiedObjectives: Array<{
    id: string;
    status: 'Improved' | 'Still Failing';
    reason: string;
  }>;
  newObjectives: string[];
  createdAt?: Date;
}
