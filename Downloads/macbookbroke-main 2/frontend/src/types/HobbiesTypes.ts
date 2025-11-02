// Frontend Types for Hobbies and Wanderlust Module

export interface HobbyLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  place_id?: string;
  rating?: number;
  phone?: string;
  distance_km?: number;
  distance_category?: 'nearby' | 'city' | 'far';
}

export interface HobbyResource {
  title: string;
  url: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: 'video' | 'article' | 'course' | 'tutorial';
}

export interface OnlineCourse {
  title: string;
  platform: string;
  url: string;
  instructor?: string;
  rating?: number;
  price: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration?: string;
  thumbnail?: string;
  description?: string;
  source?: 'gemini' | 'curated' | 'firestore'; // Track where the course came from
}

export interface HobbyCatalog {
  hobby_id: string;
  name: string;
  category: string;
  mode: ('online' | 'offline')[];
  credits_required: number;
  locations?: HobbyLocation[];
  resources: HobbyResource[];
  description: string;
  popularity_score: number;
  icon?: string;
  tags?: string[];
  created_at?: string;
  updated_at?: string;
}

export interface UserLocation {
  city: string;
  lat: number;
  lng: number;
}

export interface UserHobbyProfile {
  user_id: string;
  preferred_hobbies: string[];
  budget_range: 'low' | 'medium' | 'high';
  time_availability: 'weekdays' | 'weekends' | 'flexible';
  location: UserLocation;
  completed_activities: string[];
  created_at?: string;
  updated_at?: string;
  // Note: Credits earned from journaling, meditation, yoga, goal tracker
}

export interface HobbyActivity {
  activity_id: string;
  user_id: string;
  hobby_id: string;
  activity_type: 'session' | 'offline_class' | 'online_course';
  wri_reduction: number;
  credits_spent: number;
  completed_at: string;
  location?: HobbyLocation;
}

// Request/Response Types
export interface SubmitSurveyRequest {
  user_id: string;
  preferred_hobbies: string[];
  budget_range: 'low' | 'medium' | 'high';
  time_availability: 'weekdays' | 'weekends' | 'flexible';
  location: UserLocation;
}

export interface SubmitSurveyResponse {
  success: boolean;
  message: string;
  profile?: UserHobbyProfile;
  error?: string;
}

export interface GetHobbySuggestionsRequest {
  user_id: string;
  include_nearby?: boolean;
}

export interface GetHobbySuggestionsResponse {
  success: boolean;
  suggested: HobbyCatalog[];
  nearby?: HobbyLocation[];
  online_courses?: OnlineCourse[]; // Online course recommendations
  user_profile?: UserHobbyProfile;
  error?: string;
}

export interface UpdateProgressRequest {
  user_id: string;
  hobby_id: string;
  activity_type: 'session' | 'offline_class' | 'online_course';
  location?: HobbyLocation;
}

export interface UpdateProgressResponse {
  success: boolean;
  message: string;
  error?: string;
}

export interface GetUserProfileRequest {
  user_id: string;
}

export interface GetUserProfileResponse {
  success: boolean;
  profile?: UserHobbyProfile;
  error?: string;
}

export interface GetAllHobbiesResponse {
  success: boolean;
  hobbies: HobbyCatalog[];
  error?: string;
}

export interface GetHobbyByIdResponse {
  success: boolean;
  hobby?: HobbyCatalog;
  error?: string;
}

// Hobby Categories
export const HOBBY_CATEGORIES = [
  'Arts & Crafts',
  'Music',
  'Sports & Fitness',
  'Reading & Writing',
  'Cooking & Baking',
  'Photography',
  'Gaming',
  'Gardening',
  'Dance',
  'Travel & Exploration',
  'Technology & Coding',
  'Languages',
  'Volunteering'
] as const;

export type HobbyCategory = typeof HOBBY_CATEGORIES[number];

// Budget Ranges
export const BUDGET_RANGES = [
  { value: 'low', label: 'Low (₹0 - ₹500/month)', icon: '💰' },
  { value: 'medium', label: 'Medium (₹500 - ₹2000/month)', icon: '💵' },
  { value: 'high', label: 'High (₹2000+/month)', icon: '💸' }
] as const;

// Time Availability
export const TIME_AVAILABILITY = [
  { value: 'weekdays', label: 'Weekdays', icon: '📅' },
  { value: 'weekends', label: 'Weekends', icon: '🎉' },
  { value: 'flexible', label: 'Flexible', icon: '⏰' }
] as const;

// Activity Types
export const ACTIVITY_TYPES = [
  { value: 'session', label: 'Hobby Session', wri: 3, credits: 20, icon: '🎯' },
  { value: 'offline_class', label: 'Offline Class', wri: 5, credits: 25, icon: '🏫' },
  { value: 'online_course', label: 'Online Course', wri: 2, credits: 15, icon: '💻' }
] as const;

