import { Request, Response } from 'express';
import { HobbiesService } from '../services/hobbies.service';
import {
  SubmitSurveyRequest,
  SubmitSurveyResponse,
  GetHobbySuggestionsRequest,
  GetHobbySuggestionsResponse,
  UpdateProgressRequest,
  GetUserProfileResponse
} from '../types/hobbies.types';
import { logger } from '../utils/logger';

export class HobbiesController {
  private hobbiesService: HobbiesService;

  constructor() {
    this.hobbiesService = new HobbiesService();
  }

  /**
   * POST /api/hobbies/survey/submit
   * Submit user survey and create/update hobby profile
   */
  submitSurvey = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: SubmitSurveyRequest = req.body;

      // Validation
      if (!data.user_id || !data.preferred_hobbies || !data.budget_range || !data.time_availability || !data.location) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
        return;
      }

      const profile = await this.hobbiesService.submitSurvey(data);

      const response: SubmitSurveyResponse = {
        success: true,
        message: 'Survey submitted successfully',
        profile
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error in submitSurvey controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to submit survey'
      });
    }
  };

  /**
   * GET /api/hobbies/suggest
   * Get hobby suggestions based on user preferences
   */
  getHobbySuggestions = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id, include_nearby } = req.query;

      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id is required'
        });
        return;
      }

      const data: GetHobbySuggestionsRequest = {
        user_id: user_id as string,
        include_nearby: include_nearby === 'true'
      };

      const result = await this.hobbiesService.getHobbySuggestions(data);

      const response: GetHobbySuggestionsResponse = {
        success: true,
        suggested: result.suggested,
        nearby: result.nearby,
        online_courses: result.online_courses, // Include online courses!
        user_profile: result.user_profile || undefined
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error in getHobbySuggestions controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get hobby suggestions'
      });
    }
  };

  /**
   * POST /api/hobbies/update_progress
   * Update user progress after completing a hobby activity
   */
  updateProgress = async (req: Request, res: Response): Promise<void> => {
    try {
      const data: UpdateProgressRequest = req.body;

      // Validation
      if (!data.user_id || !data.hobby_id || !data.activity_type) {
        res.status(400).json({
          success: false,
          error: 'Missing required fields'
        });
        return;
      }

      const result = await this.hobbiesService.updateProgress(data);

      res.status(200).json({
        success: true,
        message: result.message
      });
    } catch (error: any) {
      logger.error('Error in updateProgress controller:', error);
      
      if (error.message === 'User profile not found') {
        res.status(404).json({
          success: false,
          error: 'User profile not found'
        });
        return;
      }

      if (error.message === 'Insufficient credits') {
        res.status(400).json({
          success: false,
          error: 'Insufficient credits'
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to update progress'
      });
    }
  };

  /**
   * GET /api/hobbies/profile
   * Get user hobby profile
   */
  getUserProfile = async (req: Request, res: Response): Promise<void> => {
    try {
      const { user_id } = req.query;

      if (!user_id) {
        res.status(400).json({
          success: false,
          error: 'user_id is required'
        });
        return;
      }

      const profile = await this.hobbiesService.getUserProfile(user_id as string);

      if (!profile) {
        const response: GetUserProfileResponse = {
          success: false,
          error: 'Profile not found'
        };
        res.status(404).json(response);
        return;
      }

      const response: GetUserProfileResponse = {
        success: true,
        profile
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error('Error in getUserProfile controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user profile'
      });
    }
  };

  /**
   * GET /api/hobbies/all
   * Get all hobbies from catalog
   */
  getAllHobbies = async (req: Request, res: Response): Promise<void> => {
    try {
      const hobbies = await this.hobbiesService.getAllHobbies();

      res.status(200).json({
        success: true,
        hobbies
      });
    } catch (error) {
      logger.error('Error in getAllHobbies controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get hobbies'
      });
    }
  };

  /**
   * GET /api/hobbies/:hobbyId
   * Get hobby by ID
   */
  getHobbyById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { hobbyId } = req.params;

      if (!hobbyId) {
        res.status(400).json({
          success: false,
          error: 'hobbyId is required'
        });
        return;
      }

      const hobby = await this.hobbiesService.getHobbyById(hobbyId);

      if (!hobby) {
        res.status(404).json({
          success: false,
          error: 'Hobby not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        hobby
      });
    } catch (error) {
      logger.error('Error in getHobbyById controller:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get hobby'
      });
    }
  };
}

