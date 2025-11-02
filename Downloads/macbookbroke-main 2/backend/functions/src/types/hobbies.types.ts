// Types for Hobbies and Wanderlust Module

export interface HobbyLocation {
  name: string;
  address: string;
  lat: number;
  lng: number;
  place_id?: string;
  rating?: number;
  phone?: string;
  distance_km?: number; // Distance from user in kilometers
  distance_category?: 'nearby' | 'city' | 'far'; // Categorized distance
}

export interface HobbyResource {
  title: string;
  url: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  type: 'video' | 'article' | 'course' | 'tutorial';
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
  // Note: Credits are earned from journaling, meditation, yoga, goal tracker
  // and displayed here but not stored in this collection
}

export interface HobbyActivity {
  activity_id: string;
  user_id: string;
  hobby_id: string;
  activity_type: 'session' | 'offline_class' | 'online_course';
  completed_at: string;
  location?: HobbyLocation;
  // Note: No credits/WRI tracking - just activity logging
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
  message?: string;
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
  online_courses?: any[]; // OnlineCourse type from online-courses.service
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
  new_wri: number;
  new_credits: number;
  wri_reduction: number;
  credits_spent: number;
}

export interface GetUserProfileRequest {
  user_id: string;
}

export interface GetUserProfileResponse {
  success: boolean;
  profile?: UserHobbyProfile;
  error?: string;
}

// Google Places API Types
export interface GooglePlacesResult {
  name: string;
  vicinity: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  place_id: string;
  rating?: number;
  formatted_phone_number?: string;
}

export interface GooglePlacesResponse {
  results: GooglePlacesResult[];
  status: string;
}

// Note: Credits are earned from other activities (journaling, meditation, yoga, goal tracker)
// No WRI/credits rules needed for hobbies module

