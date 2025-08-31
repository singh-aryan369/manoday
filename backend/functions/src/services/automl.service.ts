import { AutoMLRequest, AutoMLResponse, WellnessData } from '../types';
import { config } from '../config';
import * as logger from 'firebase-functions/logger';

export class AutoMLService {
  async getRecommendation(request: AutoMLRequest): Promise<AutoMLResponse> {
    try {
      const automlConfig = config.automl;
      const modelInput = this.prepareModelInput(request.features);
      
      logger.info('AutoML input features:', { original: request.features, transformed: modelInput });
      
      const accessToken = await this.getAccessToken();
      
      const response = await fetch(automlConfig.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          instances: [modelInput]
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error('AutoML API response error:', { status: response.status, error: errorText });
        throw new Error(`AutoML API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      logger.info('AutoML API response:', data);
      
      if (data.predictions && data.predictions[0]) {
        const predictionData = data.predictions[0];
        
        let maxScore = 0;
        let bestClass = '';
        
        if (predictionData.scores && predictionData.classes) {
          for (let i = 0; i < predictionData.scores.length; i++) {
            if (predictionData.scores[i] > maxScore) {
              maxScore = predictionData.scores[i];
              bestClass = predictionData.classes[i];
            }
          }
        }
        
        logger.info('AutoML prediction successful:', { 
          recommendation: bestClass, 
          confidence: maxScore,
          allPredictions: predictionData
        });
        
        return {
          recommendation: bestClass || this.getFallbackRecommendation(request.features.mood),
          confidence: maxScore || 0.8,
          timestamp: new Date().toISOString()
        };
      }
      
      const fallback = this.getFallbackRecommendation(request.features.mood);
      logger.info('Using fallback recommendation:', { recommendation: fallback, confidence: 0.8 });
      return {
        recommendation: fallback,
        confidence: 0.8,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('AutoML model call failed:', error);
      return {
        recommendation: this.getFallbackRecommendation(request.features.mood),
        confidence: 0.8,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Prepare model input for AutoML with smart defaults
  private prepareModelInput(features: Partial<WellnessData>): any {
    // Use intelligent smart defaults based on context and user behavior
    const smartDefaults = {
      mood: features.mood || 'Stressed', // If asking for help, likely stressed
      sleepHours: String(features.sleepHours || '6'), // Average sleep
      stressLevel: features.stressLevel || 'High', // If asking for help, likely high stress
      academicPressure: features.academicPressure || 'Medium', 
      socialSupport: features.socialSupport || 'Weak', // If struggling, likely weak support
      loneliness: features.loneliness || 'Often', // If struggling, likely often lonely
      confidenceLevel: features.confidenceLevel || 'Low', // If asking for help, likely low confidence
      hobbiesInterest: features.hobbiesInterest || 'None', // Common for people asking for help
      opennessToJournaling: features.opennessToJournaling || 'No',
      willingForProfessionalHelp: features.willingForProfessionalHelp || 'No'
    };

    return {
      Mood: smartDefaults.mood,
      SleepHours: smartDefaults.sleepHours,
      StressLevel: smartDefaults.stressLevel,
      AcademicPressure: smartDefaults.academicPressure,
      SocialSupport: smartDefaults.socialSupport,
      Loneliness: smartDefaults.loneliness,
      ConfidenceLevel: smartDefaults.confidenceLevel,
      HobbiesInterest: smartDefaults.hobbiesInterest,
      OpennessToJournaling: smartDefaults.opennessToJournaling,
      WillingForProfessionalHelp: smartDefaults.willingForProfessionalHelp
    };
  }

  private async getAccessToken(): Promise<string> {
    try {
      const serviceAccountConfig = config.serviceAccount;
      
      const { JWT } = await import('google-auth-library');
      
      const jwt = new JWT({
        email: serviceAccountConfig.email,
        key: serviceAccountConfig.privateKey,
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
      });
      
      const accessToken = await jwt.getAccessToken();
      
      if (!accessToken.token) {
        throw new Error('Failed to get access token from JWT client');
      }
      
      logger.info('Successfully obtained access token using service account JWT');
      return accessToken.token;
      
    } catch (error) {
      logger.error('Service account authentication failed:', error);
      
      try {
        logger.info('Trying application default credentials as fallback...');
        const { GoogleAuth } = await import('google-auth-library');
        const auth = new GoogleAuth({
          scopes: ['https://www.googleapis.com/auth/cloud-platform']
        });
        
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        
        if (!token.token) {
          throw new Error('Failed to get access token from application default credentials');
        }
        
        logger.info('Successfully obtained access token using application default credentials');
        return token.token;
        
      } catch (fallbackError) {
        logger.error('All authentication methods failed:', fallbackError);
        throw new Error('Authentication failed for Vertex AI endpoint. Please check your service account configuration.');
      }
    }
  }

  private getFallbackRecommendation(mood?: string): string {
    switch (mood?.toLowerCase()) {
      case 'stressed':
      case 'anxious':
        return 'Meditation and Yoga';
      case 'sad':
      case 'depressed':
        return 'Professional Help';
      case 'lonely':
        return 'Hobbies Wanderlust';
      case 'overwhelmed':
        return 'Goal Setting';
      default:
        return 'Journaling';
    }
  }
}
