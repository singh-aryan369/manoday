import { SpeechClient } from '@google-cloud/speech';
import { logger } from '../utils/logger';

export interface SpeechToTextConfig {
  languageCode: string;
  sampleRateHertz: number;
  encoding: string;
  enableAutomaticPunctuation: boolean;
  model: string;
}

export interface SpeechToTextRequest {
  audio: string; // Base64 encoded audio
  config: SpeechToTextConfig;
}

export interface SpeechToTextResponse {
  transcript: string;
  confidence: number;
  isFinal: boolean;
}

export class SpeechToTextService {
  private speechClient: SpeechClient;

  constructor() {
    // Initialize Google Speech-to-Text client
    this.speechClient = new SpeechClient({
      // Use service account key file
      keyFilename: './service-account-key.json',
      projectId: process.env.FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID_HERE'
    });
  }

  /**
   * Transcribe audio using Google Speech-to-Text API
   */
  async transcribeAudio(request: SpeechToTextRequest): Promise<SpeechToTextResponse> {
    try {
      logger.info('Starting speech-to-text transcription', {
        audioSize: request.audio.length,
        config: request.config
      });

      // Prepare the request for Google Speech-to-Text API
      const speechRequest = {
        audio: {
          content: request.audio
        },
        config: {
          encoding: this.mapEncoding(request.config.encoding),
          sampleRateHertz: request.config.sampleRateHertz,
          languageCode: request.config.languageCode,
          enableAutomaticPunctuation: request.config.enableAutomaticPunctuation,
          model: request.config.model,
          useEnhanced: true, // Use enhanced model for better accuracy
          enableWordTimeOffsets: false, // We don't need word-level timing
          enableWordConfidence: true, // Get confidence scores
          alternativeLanguageCodes: ['en-GB', 'en-AU'], // Alternative English variants
        }
      };

      logger.info('Sending request to Google Speech-to-Text API', {
        encoding: speechRequest.config.encoding,
        sampleRate: speechRequest.config.sampleRateHertz,
        language: speechRequest.config.languageCode
      });

      // Call Google Speech-to-Text API
      const [response] = await this.speechClient.recognize(speechRequest);

      if (!response.results || response.results.length === 0) {
        logger.warn('No transcription results from Google Speech-to-Text API');
        return {
          transcript: '',
          confidence: 0,
          isFinal: true
        };
      }

      // Get the best result
      const result = response.results[0];
      const alternative = result.alternatives?.[0];

      if (!alternative) {
        logger.warn('No alternatives in transcription result');
        return {
          transcript: '',
          confidence: 0,
          isFinal: true
        };
      }

      const transcript = alternative.transcript || '';
      const confidence = alternative.confidence || 0;

      logger.info('Speech-to-text transcription completed', {
        transcriptLength: transcript.length,
        confidence: confidence,
        isFinal: true
      });

      return {
        transcript: transcript.trim(),
        confidence: confidence,
        isFinal: true // Google Speech-to-Text API results are always final
      };

    } catch (error) {
      logger.error('Error in speech-to-text transcription', {
        error: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : undefined
      });

      // Handle specific Google Cloud errors
      if (error instanceof Error) {
        if (error.message.includes('INVALID_ARGUMENT')) {
          throw new Error('Invalid audio format or configuration');
        } else if (error.message.includes('PERMISSION_DENIED')) {
          throw new Error('Speech-to-Text API access denied. Check service account permissions.');
        } else if (error.message.includes('QUOTA_EXCEEDED')) {
          throw new Error('Speech-to-Text API quota exceeded');
        } else if (error.message.includes('UNAVAILABLE')) {
          throw new Error('Speech-to-Text API temporarily unavailable');
        }
      }

      throw new Error(`Speech-to-text transcription failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Map encoding string to Google Speech-to-Text encoding enum
   */
  private mapEncoding(encoding: string): any {
    const encodingMap: { [key: string]: any } = {
      'WEBM_OPUS': 'WEBM_OPUS',
      'WEBM_VORBIS': 'WEBM_VORBIS',
      'LINEAR16': 'LINEAR16',
      'FLAC': 'FLAC',
      'MULAW': 'MULAW',
      'AMR': 'AMR',
      'AMR_WB': 'AMR_WB',
      'OGG_OPUS': 'OGG_OPUS',
      'SPEEX_WITH_HEADER_BYTE': 'SPEEX_WITH_HEADER_BYTE'
    };

    return encodingMap[encoding] || 'WEBM_OPUS';
  }

  /**
   * Validate audio configuration
   */
  validateConfig(config: SpeechToTextConfig): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.languageCode) {
      errors.push('Language code is required');
    }

    if (!config.sampleRateHertz || config.sampleRateHertz < 8000 || config.sampleRateHertz > 48000) {
      errors.push('Sample rate must be between 8000 and 48000 Hz');
    }

    if (!config.encoding) {
      errors.push('Audio encoding is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get supported languages
   */
  getSupportedLanguages(): string[] {
    return [
      'en-US', 'en-GB', 'en-AU', 'en-CA', 'en-IN',
      'es-ES', 'es-MX', 'fr-FR', 'fr-CA', 'de-DE',
      'it-IT', 'pt-BR', 'pt-PT', 'ru-RU', 'ja-JP',
      'ko-KR', 'zh-CN', 'zh-TW', 'hi-IN', 'ar-SA'
    ];
  }
}
