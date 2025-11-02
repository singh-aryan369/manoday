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
      const { message, conversationHistory, wellnessData, language = 'en' } = req.body as GeminiRequest & { language?: string };

      // Enhanced logging
      logger.info('🤖 GEMINI REQUEST RECEIVED:', {
        message: message?.substring(0, 100) + '...',
        language,
        hasConversationHistory: !!conversationHistory,
        hasWellnessData: !!wellnessData,
        timestamp: new Date().toISOString()
      });

      if (!message) {
        logger.warn('❌ GEMINI: Missing message in request');
        res.status(400).json({ 
          success: false,
          error: 'Message is required' 
        });
        return;
      }

      logger.info('🔧 GEMINI: Calling service with config validation...');
      
      const result = await this.geminiService.generateResponse({
        message,
        conversationHistory,
        wellnessData,
        language
      });
      
      logger.info('✅ GEMINI RESPONSE SUCCESS:', {
        responseLength: result?.response?.length || 0,
        timestamp: new Date().toISOString()
      });
      
      res.json({
        success: true,
        data: result
      });

    } catch (error) {
      logger.error('🚨 GEMINI CONTROLLER ERROR:', {
        error: (error as Error).message,
        stack: (error as Error).stack,
        timestamp: new Date().toISOString()
      });
      res.status(500).json({ 
        success: false,
        error: 'Failed to get Gemini response',
        message: 'An error occurred while processing your request'
      });
    }
  }
}
