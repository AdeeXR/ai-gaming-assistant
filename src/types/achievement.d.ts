export interface Achievement {
  id: string;
  name: string;
  description: string;
  unlocked: boolean;
  icon: string; // Emoji or URL to an icon
  unlockedAt?: Date;
}
