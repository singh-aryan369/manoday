import { Request, Response } from 'express';
import { MeditationService } from '../services/meditation.service';
import { logger } from '../utils/logger';
import {
  GetMeditationVideosRequest,
  GetMeditationSoundsRequest,
  TrackMeditationActivityRequest,
  GetMeditationStatsRequest
} from '../types/meditation.types';

export class MeditationController {
  private meditationService: MeditationService;

  constructor() {
    this.meditationService = new MeditationService();
  }

  /**
   * Handle meditation API requests
   */
  async handleRequest(req: Request, res: Response): Promise<void> {
    try {
      const { action } = req.query;
      logger.info('Meditation API request', { action });

      switch (action) {
        case 'getMeditationVideos':
          await this.getMeditationVideos(req, res);
          break;
        case 'getMeditationSounds':
          await this.getMeditationSounds(req, res);
          break;
        case 'trackActivity':
          await this.trackMeditationActivity(req, res);
          break;
        case 'getStats':
          await this.getMeditationStats(req, res);
          break;
        case 'getWRIReduction':
          await this.getMeditationWRIReduction(req, res);
          break;
        default:
          res.status(400).json({
            success: false,
            error: 'Invalid action. Supported actions: getMeditationVideos, getMeditationSounds, trackActivity, getStats, getWRIReduction'
          });
      }
    } catch (error) {
      logger.error('Error in meditation controller:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error'
      });
    }
  }

  private async getMeditationVideos(req: Request, res: Response): Promise<void> {
    const { userId } = req.body;
    
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }

    const request: GetMeditationVideosRequest = { userId };
    const result = await this.meditationService.getMeditationVideos(request);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }

  private async getMeditationSounds(req: Request, res: Response): Promise<void> {
    const { userId } = req.body;
    
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }

    const request: GetMeditationSoundsRequest = { userId };
    const result = await this.meditationService.getMeditationSounds(request);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }

  private async trackMeditationActivity(req: Request, res: Response): Promise<void> {
    const { userId, activityType, itemId, completedAt } = req.body;
    
    if (!userId || !activityType || !itemId) {
      res.status(400).json({ 
        success: false, 
        error: 'userId, activityType, and itemId are required' 
      });
      return;
    }

    if (activityType !== 'video' && activityType !== 'sound') {
      res.status(400).json({ 
        success: false, 
        error: 'activityType must be either "video" or "sound"' 
      });
      return;
    }

    const request: TrackMeditationActivityRequest = {
      userId,
      activityType,
      itemId,
      completedAt: completedAt || new Date().toISOString()
    };
    
    const result = await this.meditationService.trackMeditationActivity(request);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }

  private async getMeditationStats(req: Request, res: Response): Promise<void> {
    const { userId } = req.body;
    
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }

    const request: GetMeditationStatsRequest = { userId };
    const result = await this.meditationService.getMeditationStats(request);
    
    if (result.success) {
      res.status(200).json(result);
    } else {
      res.status(500).json(result);
    }
  }

  private async getMeditationWRIReduction(req: Request, res: Response): Promise<void> {
    const { userId } = req.body;
    
    if (!userId) {
      res.status(400).json({ success: false, error: 'userId is required' });
      return;
    }

    const wriReduction = await this.meditationService.getMeditationWRIReduction(userId);
    
    res.status(200).json({
      success: true,
      wriReduction
    });
  }
}
