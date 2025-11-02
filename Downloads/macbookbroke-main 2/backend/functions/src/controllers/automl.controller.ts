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

      // Enhanced logging
      logger.info('🎯 AUTOML REQUEST RECEIVED:', {
        hasFeatures: !!features,
        hasWellnessData: !!wellnessData,
        inputDataKeys: Object.keys(inputData || {}),
        timestamp: new Date().toISOString()
      });

      if (!inputData) {
        logger.warn('❌ AUTOML: Missing input data');
        res.status(400).json({ 
          success: false,
          error: 'Features or wellnessData are required' 
        });
        return;
      }

      logger.info('🔧 AUTOML: Calling service for recommendation...');
      
      const result = await this.automlService.getRecommendation({
        features: inputData
      });
      
      logger.info('✅ AUTOML RESPONSE SUCCESS:', {
        recommendation: result,
        resultType: typeof result,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('🚨 AUTOML CONTROLLER ERROR:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ 
        success: false,
        error: 'Failed to get AutoML recommendation',
        message: 'An error occurred while getting recommendations'
      });
    }
  }
}
