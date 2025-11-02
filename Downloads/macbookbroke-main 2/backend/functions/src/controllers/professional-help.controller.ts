import { Request, Response } from 'express';
import { ProfessionalHelpService } from '../services/professional-help.service';
import { HelplineSearchRequest, HelplineSearchResponse } from '../types/professional-help.types';
import { logger } from '../utils/logger';

export class ProfessionalHelpController {
  private professionalHelpService: ProfessionalHelpService;

  constructor() {
    this.professionalHelpService = new ProfessionalHelpService();
  }

  /**
   * Get nearby helpline centers based on user location
   */
  public getNearbyHelplines = async (req: Request, res: Response): Promise<void> => {
    try {
      const searchRequest: HelplineSearchRequest = req.body;

      // Validate request
      if (!searchRequest.latitude || !searchRequest.longitude) {
        res.status(400).json({
          error: 'Missing required fields: latitude and longitude are required'
        });
        return;
      }

      // Validate coordinates
      if (searchRequest.latitude < -90 || searchRequest.latitude > 90 ||
          searchRequest.longitude < -180 || searchRequest.longitude > 180) {
        res.status(400).json({
          error: 'Invalid coordinates: latitude must be between -90 and 90, longitude between -180 and 180'
        });
        return;
      }

      logger.info('Searching for nearby helplines', {
        latitude: searchRequest.latitude,
        longitude: searchRequest.longitude,
        radius: searchRequest.radius || 50
      });

      const result = await this.professionalHelpService.getNearbyHelplines(searchRequest);

      const response: HelplineSearchResponse = {
        centers: result,
        totalFound: result.length,
        searchRadius: searchRequest.radius || 50,
        userLocation: {
          latitude: searchRequest.latitude,
          longitude: searchRequest.longitude,
          accuracy: 0 // We don't have accuracy info from the request
        }
      };

      logger.info('Successfully found helplines', {
        count: result.length,
        radius: searchRequest.radius || 50
      });

      res.json(response);

    } catch (error) {
      logger.error('Error in getNearbyHelplines:', error);
      res.status(500).json({
        error: 'Internal server error while searching for helplines'
      });
    }
  };

  /**
   * Get helpline centers by city
   */
  public getHelplinesByCity = async (req: Request, res: Response): Promise<void> => {
    try {
      const { city, state } = req.body;

      if (!city) {
        res.status(400).json({
          error: 'Missing required field: city is required'
        });
        return;
      }

      logger.info('Searching for helplines by city', { city, state });

      const result = await this.professionalHelpService.getHelplinesByCity(city, state);

      const response: HelplineSearchResponse = {
        centers: result,
        totalFound: result.length,
        searchRadius: 0, // Not applicable for city search
        userLocation: {
          latitude: 0,
          longitude: 0,
          accuracy: 0
        }
      };

      logger.info('Successfully found helplines by city', {
        city,
        state,
        count: result.length
      });

      res.json(response);

    } catch (error) {
      logger.error('Error in getHelplinesByCity:', error);
      res.status(500).json({
        error: 'Internal server error while searching for helplines by city'
      });
    }
  };

  /**
   * Get national helpline numbers
   */
  public getNationalHelplines = async (req: Request, res: Response): Promise<void> => {
    try {
      logger.info('Fetching national helplines');

      const result = await this.professionalHelpService.getNationalHelplines();

      const response: HelplineSearchResponse = {
        centers: result,
        totalFound: result.length,
        searchRadius: 0, // Not applicable for national helplines
        userLocation: {
          latitude: 0,
          longitude: 0,
          accuracy: 0
        }
      };

      logger.info('Successfully fetched national helplines', {
        count: result.length
      });

      res.json(response);

    } catch (error) {
      logger.error('Error in getNationalHelplines:', error);
      res.status(500).json({
        error: 'Internal server error while fetching national helplines'
      });
    }
  };

  /**
   * Health check endpoint for professional help service
   */
  public healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      const healthStatus = await this.professionalHelpService.healthCheck();
      
      res.json({
        status: 'healthy',
        service: 'professional-help',
        timestamp: new Date().toISOString(),
        details: healthStatus
      });

    } catch (error) {
      logger.error('Error in professional help health check:', error);
      res.status(500).json({
        status: 'unhealthy',
        service: 'professional-help',
        timestamp: new Date().toISOString(),
        error: 'Health check failed'
      });
    }
  };
}
