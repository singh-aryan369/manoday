import { firestore } from 'firebase-admin';
import * as functions from 'firebase-functions';
import axios from 'axios';
import {
  HobbyCatalog,
  UserHobbyProfile,
  HobbyActivity,
  SubmitSurveyRequest,
  GetHobbySuggestionsRequest,
  UpdateProgressRequest,
  GooglePlacesResponse,
  HobbyLocation
} from '../types/hobbies.types';
import { logger } from '../utils/logger';
import { OnlineCoursesService, OnlineCourse } from './online-courses.service';
import { config } from '../config';

export class HobbiesService {
  private db: firestore.Firestore;
  private hobbiesCatalogCollection = 'hobbies_catalog';
  private userHobbyProfilesCollection = 'user_hobby_profiles';
  private hobbyActivitiesCollection = 'hobby_activities';
  private onlineCoursesService: OnlineCoursesService;

  constructor() {
    this.db = firestore();
    this.onlineCoursesService = new OnlineCoursesService();
  }

  /**
   * Submit user survey and create/update hobby profile
   */
  async submitSurvey(data: SubmitSurveyRequest): Promise<UserHobbyProfile> {
    try {
      const profileRef = this.db.collection(this.userHobbyProfilesCollection).doc(data.user_id);
      const existingProfile = await profileRef.get();

      const profile: UserHobbyProfile = {
        user_id: data.user_id,
        preferred_hobbies: data.preferred_hobbies,
        budget_range: data.budget_range,
        time_availability: data.time_availability,
        location: data.location,
        completed_activities: existingProfile.exists ? (existingProfile.data() as UserHobbyProfile).completed_activities : [],
        updated_at: new Date().toISOString()
      };

      if (!existingProfile.exists) {
        profile.created_at = new Date().toISOString();
      }

      await profileRef.set(profile, { merge: true });
      logger.info('User hobby profile saved', { user_id: data.user_id });

      return profile;
    } catch (error) {
      logger.error('Error submitting survey:', error);
      throw new functions.https.HttpsError('internal', 'Failed to save user profile');
    }
  }

  /**
   * Get hobby suggestions based on user preferences
   */
  async getHobbySuggestions(data: GetHobbySuggestionsRequest): Promise<{ 
    suggested: HobbyCatalog[]; 
    nearby: HobbyLocation[]; 
    online_courses: OnlineCourse[];
    user_profile: UserHobbyProfile | null 
  }> {
    try {
      // Get user profile
      const profileDoc = await this.db.collection(this.userHobbyProfilesCollection).doc(data.user_id).get();
      
      if (!profileDoc.exists) {
        logger.warn('User profile not found', { user_id: data.user_id });
        return { suggested: [], nearby: [], online_courses: [], user_profile: null };
      }

      const userProfile = profileDoc.data() as UserHobbyProfile;

      // Get all hobbies from catalog
      const hobbiesSnapshot = await this.db.collection(this.hobbiesCatalogCollection).get();
      const allHobbies = hobbiesSnapshot.docs.map(doc => doc.data() as HobbyCatalog);

      // Filter hobbies based on user preferences
      const matchedHobbies = allHobbies.filter(hobby => {
        return userProfile.preferred_hobbies.some(pref => 
          hobby.category.toLowerCase().includes(pref.toLowerCase()) ||
          hobby.name.toLowerCase().includes(pref.toLowerCase())
        );
      });

      // Sort by popularity score
      matchedHobbies.sort((a, b) => b.popularity_score - a.popularity_score);

      // Get nearby places if requested
      let nearbyPlaces: HobbyLocation[] = [];
      if (data.include_nearby && userProfile.location) {
        nearbyPlaces = await this.fetchNearbyPlaces(
          userProfile.location.lat,
          userProfile.location.lng,
          userProfile.preferred_hobbies
        );
      }

      // Get online course recommendations
      const onlineCourses = await this.onlineCoursesService.getCourseRecommendations(
        userProfile.preferred_hobbies,
        'beginner' // Can be made dynamic based on user level
      );

      logger.info('Hobby suggestions generated', { 
        user_id: data.user_id, 
        suggested_count: matchedHobbies.length,
        nearby_count: nearbyPlaces.length,
        online_courses_count: onlineCourses.length
      });

      return {
        suggested: matchedHobbies,
        nearby: nearbyPlaces,
        online_courses: onlineCourses,
        user_profile: userProfile
      };
    } catch (error) {
      logger.error('Error getting hobby suggestions:', error);
      throw new functions.https.HttpsError('internal', 'Failed to get hobby suggestions');
    }
  }

  /**
   * Fetch nearby places using Google Places API
   * Searches in multiple radii: 5km (nearby), 25km (city), 50km (far)
   */
  private async fetchNearbyPlaces(lat: number, lng: number, keywords: string[]): Promise<HobbyLocation[]> {
    try {
      // Use the same Google Maps API key as Professional Help
      const apiKey = config.googleMaps.apiKey;
      
      if (!apiKey || apiKey === 'YOUR_GOOGLE_MAPS_API_KEY') {
        logger.warn('Google Maps API key not configured');
        return [];
      }

      const allPlaces: HobbyLocation[] = [];
      const searchRadii = [5000, 25000, 50000]; // 5km, 25km, 50km
      const seenPlaceIds = new Set<string>();

      for (const keyword of keywords) {
        for (const radius of searchRadii) {
          try {
            const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json`;
            const response = await axios.get<GooglePlacesResponse>(url, {
              params: {
                location: `${lat},${lng}`,
                radius: radius,
                keyword: keyword,
                key: apiKey,
                type: 'point_of_interest' // Filter for relevant locations
              }
            });

            if (response.data.status === 'OK' && response.data.results) {
              const places = response.data.results
                .filter((place: any) => !seenPlaceIds.has(place.place_id)) // Avoid duplicates
                .slice(0, 3) // Top 3 per radius
                .map((place: any) => {
                  seenPlaceIds.add(place.place_id);
                  // Calculate distance from user
                  const distance = this.calculateDistance(lat, lng, place.geometry.location.lat, place.geometry.location.lng);
                  
                  return {
                    name: place.name,
                    address: place.vicinity,
                    lat: place.geometry.location.lat,
                    lng: place.geometry.location.lng,
                    place_id: place.place_id,
                    rating: place.rating,
                    distance_km: Math.round(distance * 10) / 10, // Round to 1 decimal
                    distance_category: distance < 5 ? 'nearby' as const : distance < 25 ? 'city' as const : 'far' as const
                  };
                });

              allPlaces.push(...places);
            }
          } catch (err) {
            logger.error(`Error fetching places for keyword ${keyword} at radius ${radius}:`, err);
          }
        }
      }

      // Sort by rating and distance
      allPlaces.sort((a, b) => {
        const ratingDiff = (b.rating || 0) - (a.rating || 0);
        if (Math.abs(ratingDiff) > 0.5) return ratingDiff;
        return (a.distance_km || 0) - (b.distance_km || 0);
      });

      return allPlaces.slice(0, 15); // Return top 15 results
    } catch (error) {
      logger.error('Error in fetchNearbyPlaces:', error);
      return [];
    }
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLng / 2) * Math.sin(dLng / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Update user progress after completing a hobby activity
   * Note: Just logs activity, no WRI/credits tracking
   */
  async updateProgress(data: UpdateProgressRequest): Promise<{ message: string }> {
    try {
      const profileRef = this.db.collection(this.userHobbyProfilesCollection).doc(data.user_id);
      const profileDoc = await profileRef.get();

      if (!profileDoc.exists) {
        throw new functions.https.HttpsError('not-found', 'User profile not found');
      }

      // Update completed activities
      await profileRef.update({
        completed_activities: firestore.FieldValue.arrayUnion(data.hobby_id),
        updated_at: new Date().toISOString()
      });

      // Log activity
      const activity: HobbyActivity = {
        activity_id: `${data.user_id}_${data.hobby_id}_${Date.now()}`,
        user_id: data.user_id,
        hobby_id: data.hobby_id,
        activity_type: data.activity_type,
        completed_at: new Date().toISOString(),
        location: data.location
      };

      await this.db.collection(this.hobbyActivitiesCollection).doc(activity.activity_id).set(activity);

      logger.info('Hobby activity logged', {
        user_id: data.user_id,
        hobby_id: data.hobby_id,
        activity_type: data.activity_type
      });

      return {
        message: 'Activity completed successfully!'
      };
    } catch (error) {
      logger.error('Error updating progress:', error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError('internal', 'Failed to update progress');
    }
  }

  /**
   * Get user hobby profile
   */
  async getUserProfile(userId: string): Promise<UserHobbyProfile | null> {
    try {
      const profileDoc = await this.db.collection(this.userHobbyProfilesCollection).doc(userId).get();
      
      if (!profileDoc.exists) {
        return null;
      }

      return profileDoc.data() as UserHobbyProfile;
    } catch (error) {
      logger.error('Error getting user profile:', error);
      throw new functions.https.HttpsError('internal', 'Failed to get user profile');
    }
  }

  /**
   * Get all hobbies from catalog
   */
  async getAllHobbies(): Promise<HobbyCatalog[]> {
    try {
      const snapshot = await this.db.collection(this.hobbiesCatalogCollection).get();
      return snapshot.docs.map(doc => doc.data() as HobbyCatalog);
    } catch (error) {
      logger.error('Error getting all hobbies:', error);
      throw new functions.https.HttpsError('internal', 'Failed to get hobbies');
    }
  }

  /**
   * Get hobby by ID
   */
  async getHobbyById(hobbyId: string): Promise<HobbyCatalog | null> {
    try {
      const hobbyDoc = await this.db.collection(this.hobbiesCatalogCollection).doc(hobbyId).get();
      
      if (!hobbyDoc.exists) {
        return null;
      }

      return hobbyDoc.data() as HobbyCatalog;
    } catch (error) {
      logger.error('Error getting hobby by ID:', error);
      throw new functions.https.HttpsError('internal', 'Failed to get hobby');
    }
  }
}

