export interface UserProfile {
  username: string;
  bio: string;
  favoriteGame: string;
  avatarUrl?: string; // Optional URL for avatar image
  lastUpdated?: Date;
  // Add other user profile fields as needed
}
