import {
  MeditationVideo,
  MeditationSound,
  GetMeditationVideosResponse,
  GetMeditationSoundsResponse,
  TrackMeditationActivityRequest,
  TrackMeditationActivityResponse,
  GetMeditationStatsResponse,
  GetMeditationWRIReductionResponse
} from '../types/MeditationTypes';
import { meditationConfig } from '../config/meditationConfig';

export class MeditationService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = meditationConfig.api.baseUrl;
  }

  /**
   * Get all meditation videos
   */
  async getMeditationVideos(userId: string): Promise<GetMeditationVideosResponse> {
    try {
      console.log('🧘‍♀️ MeditationService: Fetching meditation videos');

      const response = await fetch(`${this.baseUrl}?action=getMeditationVideos`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ MeditationService: Successfully fetched meditation videos', { count: data.data?.length });
        return {
          success: true,
          data: data.data || []
        };
      } else {
        console.error('❌ MeditationService: Failed to fetch meditation videos', data.error);
        return {
          success: false,
          error: data.error || 'Failed to fetch meditation videos'
        };
      }
    } catch (error) {
      console.error('❌ MeditationService: Error fetching meditation videos:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch meditation videos'
      };
    }
  }

  /**
   * Get all meditation sounds
   */
  async getMeditationSounds(userId: string): Promise<GetMeditationSoundsResponse> {
    try {
      console.log('🧘‍♂️ MeditationService: Fetching meditation sounds');

      const response = await fetch(`${this.baseUrl}?action=getMeditationSounds`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ MeditationService: Successfully fetched meditation sounds', { count: data.data?.length });
        return {
          success: true,
          data: data.data || []
        };
      } else {
        console.error('❌ MeditationService: Failed to fetch meditation sounds', data.error);
        return {
          success: false,
          error: data.error || 'Failed to fetch meditation sounds'
        };
      }
    } catch (error) {
      console.error('❌ MeditationService: Error fetching meditation sounds:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch meditation sounds'
      };
    }
  }

  /**
   * Track meditation activity (video watch or sound listen)
   */
  async trackMeditationActivity(request: TrackMeditationActivityRequest): Promise<TrackMeditationActivityResponse> {
    try {
      console.log('📊 MeditationService: Tracking meditation activity', { 
        activityType: request.activityType,
        itemId: request.itemId
      });

      const response = await fetch(`${this.baseUrl}?action=trackActivity`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': request.userId
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ MeditationService: Activity tracked successfully', {
          pointsEarned: data.pointsEarned,
          totalPointsToday: data.totalPointsToday,
          currentStreak: data.currentStreak,
          wriReduction: data.wriReduction
        });
        return data;
      } else {
        console.error('❌ MeditationService: Failed to track activity', data.error);
        return {
          success: false,
          error: data.error || 'Failed to track meditation activity'
        };
      }
    } catch (error) {
      console.error('❌ MeditationService: Error tracking meditation activity:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to track meditation activity'
      };
    }
  }

  /**
   * Get meditation stats for a user
   */
  async getMeditationStats(userId: string): Promise<GetMeditationStatsResponse> {
    try {
      console.log('📈 MeditationService: Fetching meditation stats');

      const response = await fetch(`${this.baseUrl}?action=getStats`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ MeditationService: Stats fetched successfully', data.stats);
        return data;
      } else {
        console.error('❌ MeditationService: Failed to fetch stats', data.error);
        return {
          success: false,
          error: data.error || 'Failed to fetch meditation stats'
        };
      }
    } catch (error) {
      console.error('❌ MeditationService: Error fetching meditation stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch meditation stats'
      };
    }
  }

  /**
   * Get meditation WRI reduction for a user
   */
  async getMeditationWRIReduction(userId: string): Promise<GetMeditationWRIReductionResponse> {
    try {
      console.log('📉 MeditationService: Fetching meditation WRI reduction');

      const response = await fetch(`${this.baseUrl}?action=getWRIReduction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': userId
        },
        body: JSON.stringify({ userId })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.success) {
        console.log('✅ MeditationService: WRI reduction fetched successfully', { wriReduction: data.wriReduction });
        return data;
      } else {
        console.error('❌ MeditationService: Failed to fetch WRI reduction');
        return {
          success: false,
          wriReduction: 0
        };
      }
    } catch (error) {
      console.error('❌ MeditationService: Error fetching WRI reduction:', error);
      return {
        success: false,
        wriReduction: 0
      };
    }
  }
}
