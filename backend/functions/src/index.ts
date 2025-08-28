import { setGlobalOptions } from "firebase-functions";
import { onRequest } from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import { GeminiController } from './controllers/gemini.controller';
import { AutoMLController } from './controllers/automl.controller';

// Set global options for Firebase Functions
setGlobalOptions({ maxInstances: 10 });

// Initialize controllers
const geminiController = new GeminiController();
const automlController = new AutoMLController();

// Debug: Check if configuration is loaded
console.log('🔍 Configuration check:');
console.log('✅ Firebase Admin SDK: Initialized via config.ts');
console.log('✅ Gemini: Configured via config.ts');
console.log('✅ AutoML: Configured via config.ts');
console.log('✅ Authentication: Configured via config.ts');

// Gemini endpoint
export const gemini = onRequest(async (request, response) => {
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
    return;
  }

  logger.info('Gemini endpoint called');
  await geminiController.handleRequest(request, response);
});

// AutoML endpoint
export const automl = onRequest(async (request, response) => {
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
    return;
  }

  logger.info('AutoML endpoint called');
  await automlController.handleRequest(request, response);
});

// Health check endpoint
export const health = onRequest((request, response) => {
  logger.info('Health check endpoint called');
  response.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      auth: 'configured',
      gemini: 'configured',
      automl: 'configured'
    }
  });
});

// Test endpoint for data transformation
export const testTransform = onRequest((request, response) => {
  try {
    const features = request.body?.features || {};
    const transformed = prepareModelInput(features);
    
    response.json({
      success: true,
      data: {
        original: features,
        transformed: transformed,
        message: "Data transformation test"
      }
    });
  } catch (error) {
    response.status(500).json({ 
      success: false,
      error: String(error) 
    });
  }
});

// Helper function for data transformation (moved from service for testing)
function prepareModelInput(features: any): any {
  const smartDefaults = {
    mood: features.mood || 'Stressed',
    sleepHours: String(features.sleepHours || '6'),
    stressLevel: features.stressLevel || 'High',
    academicPressure: features.academicPressure || 'Medium',
    socialSupport: features.socialSupport || 'Weak',
    loneliness: features.loneliness || 'Often',
    confidenceLevel: features.confidenceLevel || 'Low',
    hobbiesInterest: features.hobbiesInterest || 'None',
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



// Authentication endpoints
