import { GeminiService } from '../services/gemini.service';
import { GeminiRequest } from '../types';
import * as logger from 'firebase-functions/logger';

export class GeminiController {
  private geminiService: GeminiService;

  constructor() {
    this.geminiService = new GeminiService();
  }

  async handleRequest(req: any, res: any): Promise<void> {
    try {
      const { message, conversationHistory, wellnessData } = req.body as GeminiRequest;

      if (!message) {
        res.status(400).json({ 
          success: false,
          error: 'Message is required' 
        });
        return;
      }

      logger.info('Gemini endpoint - Config validation:');
      
      const result = await this.geminiService.generateResponse({
        message,
        conversationHistory,
        wellnessData
      });
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      console.log('🚨 GEMINI CONTROLLER ERROR 🚨');
      console.log('❌ Error details:', error);
      logger.error('Gemini API error:', error);
      res.status(500).json({ 
        success: false,
        error: 'Failed to get Gemini response',
        message: 'An error occurred while processing your request'
      });
    }
  }
}
