import * as admin from 'firebase-admin';
import { logger } from '../utils/logger';
import {
  MeditationVideo,
  MeditationSound,
  GetMeditationVideosRequest,
  GetMeditationSoundsRequest,
  GetMeditationVideosResponse,
  GetMeditationSoundsResponse,
  TrackMeditationActivityRequest,
  TrackMeditationActivityResponse,
  MeditationStats,
  GetMeditationStatsRequest,
  GetMeditationStatsResponse
} from '../types/meditation.types';

const POINTS_PER_VIDEO = 5;
const POINTS_PER_SOUND = 3;
const MAX_POINTS_PER_DAY = 16;

export class MeditationService {
  private db = admin.firestore();
  private meditationVideosCollection = 'meditation_videos';
  private meditationSoundsCollection = 'meditation_sounds';
  private meditationStatsCollection = 'meditation_stats';
  private meditationActivitiesCollection = 'meditation_activities';

  /**
   * Get all meditation videos
   */
  async getMeditationVideos(request: GetMeditationVideosRequest): Promise<GetMeditationVideosResponse> {
    try {
      logger.info('Fetching meditation videos', { userId: request.userId });

      const snapshot = await this.db.collection(this.meditationVideosCollection).get();
      const videos: MeditationVideo[] = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        duration: doc.data().duration,
        video_url: doc.data().video_url,
        thumbnail_url: doc.data().thumbnail_url,
        tags: doc.data().tags || [],
        description: doc.data().description,
        created_at: doc.data().created_at,
        updated_at: doc.data().updated_at
      }));

      logger.info('Meditation videos fetched successfully', { count: videos.length });
      return { success: true, data: videos };
    } catch (error) {
      logger.error('Error fetching meditation videos:', error);
      return { success: false, error: 'Failed to fetch meditation videos' };
    }
  }

  /**
   * Get all meditation sounds
   */
  async getMeditationSounds(request: GetMeditationSoundsRequest): Promise<GetMeditationSoundsResponse> {
    try {
      logger.info('Fetching meditation sounds', { userId: request.userId });

      const snapshot = await this.db.collection(this.meditationSoundsCollection).get();
      const sounds: MeditationSound[] = snapshot.docs.map(doc => ({
        id: doc.id,
        title: doc.data().title,
        duration: doc.data().duration,
        sound_url: doc.data().sound_url,
        thumbnail_url: doc.data().thumbnail_url,
        tags: doc.data().tags || [],
        description: doc.data().description,
        created_at: doc.data().created_at,
        updated_at: doc.data().updated_at
      }));

      logger.info('Meditation sounds fetched successfully', { count: sounds.length });
      return { success: true, data: sounds };
    } catch (error) {
      logger.error('Error fetching meditation sounds:', error);
      return { success: false, error: 'Failed to fetch meditation sounds' };
    }
  }

  /**
   * Track meditation activity (video watch or sound listen)
   */
  async trackMeditationActivity(request: TrackMeditationActivityRequest): Promise<TrackMeditationActivityResponse> {
    try {
      logger.info('Tracking meditation activity', { 
        userId: request.userId, 
        activityType: request.activityType,
        itemId: request.itemId
      });

      const today = new Date().toISOString().split('T')[0];
      const statsRef = this.db.collection(this.meditationStatsCollection).doc(request.userId);
      
      // Get or create user stats
      const statsDoc = await statsRef.get();
      let stats: MeditationStats;
      
      if (!statsDoc.exists) {
        stats = {
          userId: request.userId,
          totalVideosWatched: 0,
          totalSoundsListened: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalPoints: 0,
          lastActivityDate: '',
          pointsToday: 0,
          activeDates: []
        };
      } else {
        stats = statsDoc.data() as MeditationStats;
      }

      // Reset points if it's a new day
      if (stats.lastActivityDate !== today) {
        stats.pointsToday = 0;
      }

      // Check if max points reached for today
      if (stats.pointsToday >= MAX_POINTS_PER_DAY) {
        return {
          success: true,
          pointsEarned: 0,
          totalPointsToday: stats.pointsToday,
          currentStreak: stats.currentStreak,
          wriReduction: 0,
          error: 'Maximum daily points reached'
        };
      }

      // Calculate points earned
      const pointsForActivity = request.activityType === 'video' ? POINTS_PER_VIDEO : POINTS_PER_SOUND;
      const pointsEarned = Math.min(pointsForActivity, MAX_POINTS_PER_DAY - stats.pointsToday);

      // Update stats
      if (request.activityType === 'video') {
        stats.totalVideosWatched += 1;
      } else {
        stats.totalSoundsListened += 1;
      }

      stats.totalPoints += pointsEarned;
      stats.pointsToday += pointsEarned;

      // Update streak
      if (stats.lastActivityDate === '') {
        // First activity ever
        stats.currentStreak = 1;
        stats.activeDates = [today];
      } else {
        const lastDate = new Date(stats.lastActivityDate);
        const currentDate = new Date(today);
        const diffTime = currentDate.getTime() - lastDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 0) {
          // Same day, no streak change
        } else if (diffDays === 1) {
          // Consecutive day, increment streak
          stats.currentStreak += 1;
          stats.activeDates.push(today);
        } else {
          // Streak broken, reset to 1
          stats.currentStreak = 1;
          stats.activeDates = [today];
        }
      }

      stats.lastActivityDate = today;
      stats.longestStreak = Math.max(stats.longestStreak, stats.currentStreak);

      // Calculate WRI reduction - SIMPLE: Direct points subtraction (same as journal)
      // WRI reduction = points earned today (no division, no proportional calculation)
      const wriReduction = stats.pointsToday;

      // Save stats
      await statsRef.set(stats);

      // Log activity
      await this.db.collection(this.meditationActivitiesCollection).add({
        userId: request.userId,
        activityType: request.activityType,
        itemId: request.itemId,
        pointsEarned,
        completedAt: request.completedAt,
        date: today
      });

      logger.info('Meditation activity tracked successfully', {
        userId: request.userId,
        pointsEarned,
        totalPointsToday: stats.pointsToday,
        currentStreak: stats.currentStreak,
        wriReduction
      });

      return {
        success: true,
        pointsEarned,
        totalPointsToday: stats.pointsToday,
        currentStreak: stats.currentStreak,
        wriReduction
      };
    } catch (error) {
      logger.error('Error tracking meditation activity:', error);
      return { success: false, error: 'Failed to track meditation activity' };
    }
  }

  /**
   * Get meditation stats for a user
   */
  async getMeditationStats(request: GetMeditationStatsRequest): Promise<GetMeditationStatsResponse> {
    try {
      logger.info('Fetching meditation stats', { userId: request.userId });

      const statsDoc = await this.db.collection(this.meditationStatsCollection).doc(request.userId).get();

      if (!statsDoc.exists) {
        // Return default stats for new users
        const defaultStats: MeditationStats = {
          userId: request.userId,
          totalVideosWatched: 0,
          totalSoundsListened: 0,
          currentStreak: 0,
          longestStreak: 0,
          totalPoints: 0,
          lastActivityDate: '',
          pointsToday: 0,
          activeDates: []
        };
        return { success: true, stats: defaultStats };
      }

      const stats = statsDoc.data() as MeditationStats;

      // Reset pointsToday if it's a new day
      const today = new Date().toISOString().split('T')[0];
      if (stats.lastActivityDate !== today) {
        stats.pointsToday = 0;
      }

      logger.info('Meditation stats fetched successfully', { userId: request.userId });
      return { success: true, stats };
    } catch (error) {
      logger.error('Error fetching meditation stats:', error);
      return { success: false, error: 'Failed to fetch meditation stats' };
    }
  }

  /**
   * Calculate meditation WRI reduction for a user
   * This is called by the WRI calculation service
   * SIMPLE FORMULA: Directly subtract meditation points from WRI (same as journal bonus)
   */
  async getMeditationWRIReduction(userId: string): Promise<number> {
    try {
      const statsDoc = await this.db.collection(this.meditationStatsCollection).doc(userId).get();

      if (!statsDoc.exists) {
        return 0;
      }

      const stats = statsDoc.data() as MeditationStats;
      const today = new Date().toISOString().split('T')[0];

      // Only apply reduction if there's activity today
      if (stats.lastActivityDate !== today) {
        return 0;
      }

      // SIMPLE: WRI reduction = meditation points earned today
      // Just like journal bonus, directly subtract points from WRI
      const wriReduction = stats.pointsToday;

      logger.info('Calculated meditation WRI reduction', {
        userId,
        wriReduction,
        pointsToday: stats.pointsToday,
        currentStreak: stats.currentStreak
      });

      return wriReduction;
    } catch (error) {
      logger.error('Error calculating meditation WRI reduction:', error);
      return 0;
    }
  }
}
