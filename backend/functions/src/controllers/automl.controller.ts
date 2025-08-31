import { AutoMLService } from '../services/automl.service';
import * as logger from 'firebase-functions/logger';

export class AutoMLController {
  private automlService: AutoMLService;

  constructor() {
    this.automlService = new AutoMLService();
  }

  async handleRequest(req: any, res: any): Promise<void> {
    try {
      const { features, wellnessData } = req.body;
      
      // Accept either 'features' or 'wellnessData' for backwards compatibility
      const inputData = features || wellnessData;

      if (!inputData) {
        res.status(400).json({ 
          success: false,
          error: 'Features or wellnessData are required' 
        });
        return;
      }

      const result = await this.automlService.getRecommendation({
        features: inputData
      });
      
      logger.info('AutoML endpoint response:', { result, type: typeof result });
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('AutoML API error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get AutoML recommendation',
        message: 'An error occurred while getting recommendations'
      });
    }
  }
}
