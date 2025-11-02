import { hobbiesConfig } from '../config/hobbiesConfig';
import {
  SubmitSurveyRequest,
  SubmitSurveyResponse,
  GetHobbySuggestionsResponse,
  UpdateProgressRequest,
  UpdateProgressResponse,
  GetUserProfileResponse,
  GetAllHobbiesResponse,
  GetHobbyByIdResponse
} from '../types/HobbiesTypes';

export class HobbiesService {
  /**
   * Submit user survey and create/update hobby profile
   */
  async submitSurvey(data: SubmitSurveyRequest): Promise<SubmitSurveyResponse> {
    try {
      const response = await fetch(hobbiesConfig.api.submitSurvey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error submitting survey:', error);
      return {
        success: false,
        message: 'Failed to submit survey',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get hobby suggestions based on user preferences
   */
  async getHobbySuggestions(userId: string, includeNearby: boolean = true): Promise<GetHobbySuggestionsResponse> {
    try {
      const url = `${hobbiesConfig.api.getSuggestions}?user_id=${userId}&include_nearby=${includeNearby}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting hobby suggestions:', error);
      return {
        success: false,
        suggested: [],
        nearby: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Update user progress after completing a hobby activity
   */
  async updateProgress(data: UpdateProgressRequest): Promise<UpdateProgressResponse> {
    try {
      const response = await fetch(hobbiesConfig.api.updateProgress, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating progress:', error);
      return {
        success: false,
        message: 'Failed to update progress',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get user hobby profile
   */
  async getUserProfile(userId: string): Promise<GetUserProfileResponse> {
    try {
      const url = `${hobbiesConfig.api.getUserProfile}?user_id=${userId}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting user profile:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get all hobbies from catalog
   */
  async getAllHobbies(): Promise<GetAllHobbiesResponse> {
    try {
      const response = await fetch(hobbiesConfig.api.getAllHobbies, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting all hobbies:', error);
      return {
        success: false,
        hobbies: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get hobby by ID
   */
  async getHobbyById(hobbyId: string): Promise<GetHobbyByIdResponse> {
    try {
      const response = await fetch(hobbiesConfig.api.getHobbyById(hobbyId), {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Error getting hobby by ID:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

