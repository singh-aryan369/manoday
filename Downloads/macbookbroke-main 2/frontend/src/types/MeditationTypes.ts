export interface MeditationVideo {
  id: string;
  title: string;
  duration: string;
  video_url: string;
  thumbnail_url: string;
  tags: string[];
  description?: string;
  created_at?: string;
  updated_at?: string;
}

export interface MeditationSound {
  id: string;
  title: string;
  duration: string;
  sound_url: string;
  thumbnail_url: string;
  tags: string[];
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// Request types
export interface GetMeditationVideosRequest {
  userId: string;
}

export interface GetMeditationSoundsRequest {
  userId: string;
}

export interface TrackMeditationActivityRequest {
  userId: string;
  activityType: 'video' | 'sound';
  itemId: string;
  completedAt: string;
}

export interface GetMeditationStatsRequest {
  userId: string;
}

// Response types
export interface GetMeditationVideosResponse {
  success: boolean;
  data?: MeditationVideo[];
  error?: string;
}

export interface GetMeditationSoundsResponse {
  success: boolean;
  data?: MeditationSound[];
  error?: string;
}

export interface TrackMeditationActivityResponse {
  success: boolean;
  pointsEarned?: number;
  totalPointsToday?: number;
  currentStreak?: number;
  wriReduction?: number;
  error?: string;
}

export interface MeditationStats {
  userId: string;
  totalVideosWatched: number;
  totalSoundsListened: number;
  currentStreak: number;
  longestStreak: number;
  totalPoints: number;
  lastActivityDate: string;
  pointsToday: number;
  activeDates: string[];
}

export interface GetMeditationStatsResponse {
  success: boolean;
  stats?: MeditationStats;
  error?: string;
}

export interface GetMeditationWRIReductionResponse {
  success: boolean;
  wriReduction: number;
}
