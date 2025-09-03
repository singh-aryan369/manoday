import { Request, Response } from 'express';
import { SpeechToTextService } from '../services/speech-to-text.service';
import { logger } from '../utils/logger';

export class SpeechToTextController {
  private speechToTextService: SpeechToTextService;

  constructor() {
    this.speechToTextService = new SpeechToTextService();
  }

  /**
   * Transcribe audio to text
   */
  transcribeAudio = async (req: Request, res: Response): Promise<void> => {
    try {
      const { audio, config } = req.body;
      const userId = req.headers['x-user-id'] as string;

      logger.info('Speech-to-text transcription request received', {
        userId: userId ? 'authenticated' : 'anonymous',
        audioSize: audio ? audio.length : 0,
        hasConfig: !!config
      });

      // Validate request
      if (!audio) {
        res.status(400).json({
          success: false,
          error: 'Audio data is required'
        });
        return;
      }

      if (!config) {
        res.status(400).json({
          success: false,
          error: 'Audio configuration is required'
        });
        return;
      }

      // Validate configuration
      const validation = this.speechToTextService.validateConfig(config);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          error: 'Invalid audio configuration',
          details: validation.errors
        });
        return;
      }

      // Validate base64 audio
      if (!this.isValidBase64(audio)) {
        res.status(400).json({
          success: false,
          error: 'Invalid audio data format'
        });
        return;
      }

      // Transcribe audio
      const result = await this.speechToTextService.transcribeAudio({
        audio,
        config
      });

      logger.info('Speech-to-text transcription completed successfully', {
        userId: userId ? 'authenticated' : 'anonymous',
        transcriptLength: result.transcript.length,
        confidence: result.confidence
      });

      res.json({
        success: true,
        data: {
          transcript: result.transcript,
          confidence: result.confidence,
          isFinal: result.isFinal,
          language: config.languageCode,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in speech-to-text transcription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  };

  /**
   * Get supported languages
   */
  getSupportedLanguages = async (req: Request, res: Response): Promise<void> => {
    try {
      const languages = this.speechToTextService.getSupportedLanguages();

      res.json({
        success: true,
        data: {
          languages,
          defaultLanguage: 'en-US',
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error getting supported languages', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Failed to get supported languages'
      });
    }
  };

  /**
   * Health check for speech-to-text service
   */
  healthCheck = async (req: Request, res: Response): Promise<void> => {
    try {
      res.json({
        success: true,
        data: {
          service: 'speech-to-text',
          status: 'healthy',
          supportedLanguages: this.speechToTextService.getSupportedLanguages().length,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      logger.error('Error in speech-to-text health check', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      res.status(500).json({
        success: false,
        error: 'Speech-to-text service unhealthy'
      });
    }
  };

  /**
   * Validate if string is valid base64
   */
  private isValidBase64(str: string): boolean {
    try {
      // Check if string is valid base64
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;
      if (!base64Regex.test(str)) {
        return false;
      }

      // Try to decode
      atob(str);
      return true;
    } catch (error) {
      return false;
    }
  }
}
