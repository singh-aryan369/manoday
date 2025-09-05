import { onRequest } from 'firebase-functions/v2/https';
import * as logger from "firebase-functions/logger";
import { GeminiController } from './controllers/gemini.controller';
import { AutoMLController } from './controllers/automl.controller';
import { ProfessionalHelpController } from './controllers/professional-help.controller';
import { JournalController } from './controllers/journal.controller';
import { SpeechToTextController } from './controllers/speech-to-text.controller';
import { validateConfig } from './config';
import { getFirestore } from 'firebase-admin/firestore';
import { EncryptionService } from './services/encryption.service';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin with production config
if (!admin.apps.length) {
  admin.initializeApp({
    // Use production Firebase instead of emulator
    projectId: process.env.FIREBASE_PROJECT_ID || 'smart-surf-469908-n0',
    // Remove emulator settings
  });
}

// Set global options for Firebase Functions
// setGlobalOptions({ maxInstances: 10 }); // This line is removed as per the new_code

// Initialize controllers
const geminiController = new GeminiController();
const automlController = new AutoMLController();
const professionalHelpController = new ProfessionalHelpController();
const journalController = new JournalController();
const speechToTextController = new SpeechToTextController();

// Validate configuration on startup
validateConfig();

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

// Professional Help endpoints
export const professionalHelp = onRequest(async (request, response) => {
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  response.set('Access-Control-Max-Age', '86400');

  if (request.method === 'OPTIONS') {
    response.status(200).send('');
    return;
  }

  const { action } = request.query;

  try {
    switch (action) {
      case 'nearby':
        await professionalHelpController.getNearbyHelplines(request, response);
        break;
      case 'city':
        await professionalHelpController.getHelplinesByCity(request, response);
        break;
      case 'national':
        await professionalHelpController.getNationalHelplines(request, response);
        break;
      case 'health':
        await professionalHelpController.healthCheck(request, response);
        break;
      default:
        response.status(400).json({
          error: 'Invalid action. Supported actions: nearby, city, national, health'
        });
    }
  } catch (error) {
    logger.error('Error in professional help endpoint:', error);
    response.status(500).json({
      error: 'Internal server error'
    });
  }
});

// Journal endpoints
export const journal = onRequest(async (request, response) => {
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');
  response.set('Access-Control-Max-Age', '86400');

  if (request.method === 'OPTIONS') {
    response.status(200).send('');
    return;
  }

  logger.info('Journal endpoint called');
  await journalController.handleRequest(request, response);
});

// Speech-to-Text endpoints
export const speechToText = onRequest(async (request, response) => {
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');
  response.set('Access-Control-Max-Age', '86400');

  if (request.method === 'OPTIONS') {
    response.status(200).send('');
    return;
  }

  logger.info('Speech-to-Text endpoint called');
  
  try {
    if (request.method === 'POST') {
      await speechToTextController.transcribeAudio(request, response);
    } else if (request.method === 'GET' && request.query.action === 'languages') {
      await speechToTextController.getSupportedLanguages(request, response);
    } else if (request.method === 'GET' && request.query.action === 'health') {
      await speechToTextController.healthCheck(request, response);
    } else {
      response.status(405).json({
        success: false,
        error: 'Method not allowed'
      });
    }
  } catch (error) {
    logger.error('Error in speech-to-text endpoint', error);
    response.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
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
      automl: 'configured',
      professionalHelp: 'configured',
      journal: 'configured',
      speechToText: 'configured'
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

// Store encrypted wellness insights with chat session tracking
export const storeEncryptedInsights = onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(200).send('');
    return;
  }

  try {
    const { userEmail, wellnessData, sessionId } = request.body;
    
    console.log('🔐 STORING ENCRYPTED INSIGHTS:', {
      userEmail,
      wellnessDataKeys: Object.keys(wellnessData || {}),
      wellnessDataValues: Object.values(wellnessData || {}),
      sessionId: sessionId || 'auto-generated',
      timestamp: new Date().toISOString()
    });

    if (!userEmail || !wellnessData) {
      console.log('❌ VALIDATION FAILED:', { userEmail: !!userEmail, wellnessData: !!wellnessData });
      response.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Generate session ID if not provided
    const chatSessionId = sessionId || `chat_${Date.now()}`;
    
    // Encrypt the wellness data
    console.log('🔑 GENERATING ENCRYPTION KEY FOR:', userEmail);
    const { encryptedData, iv } = EncryptionService.encryptWellnessData(wellnessData, userEmail);
    
    console.log('✅ ENCRYPTION SUCCESSFUL:', {
      userEmail,
      encryptedDataLength: encryptedData.length,
      ivLength: iv.length,
      originalDataSize: JSON.stringify(wellnessData).length
    });

    // Store to Firestore with chat session structure
    const db = getFirestore();
    const userRef = db.collection('encrypted_insights').doc(userEmail);
    const chatSessionRef = userRef.collection('chat_sessions').doc(chatSessionId);
    
    // Check if session already exists
    const existingSession = await chatSessionRef.get();
    
    const storageData = {
      encryptedData,
      iv,
      timestamp: existingSession.exists ? existingSession.data()?.timestamp : new Date(),
      lastUpdated: new Date(),
      dataHash: EncryptionService.generateUserKey(userEmail),
      userEmail,
      dataVersion: '1.0',
      sessionId: chatSessionId,
      parametersCollected: Object.keys(wellnessData),
      parameterCount: Object.keys(wellnessData).length
    };

    console.log('💾 STORING TO FIRESTORE:', {
      collection: 'encrypted_insights',
      documentId: userEmail,
      subCollection: 'chat_sessions',
      sessionId: chatSessionId,
      sessionExists: existingSession.exists,
      storageDataKeys: Object.keys(storageData),
      timestamp: new Date()
    });

    // Create new session or update existing one
    if (!existingSession.exists) {
      // New session - create document
      await chatSessionRef.set({
        ...storageData,
        timestamp: new Date(),
        dataVersion: '1.0'
      });
      console.log('🆕 Created new chat session document');
    } else {
      // Existing session - update with merge
      await chatSessionRef.set(storageData, { merge: true });
      console.log('🔄 Updated existing chat session document');
    }
    
    // Also update the main user document with latest data for quick access
    try {
      const userDoc = await userRef.get();
      const currentTotal = userDoc.exists ? (userDoc.data()?.totalSessions || 0) : 0;
      
      // Only increment totalSessions for new sessions
      const newTotal = existingSession.exists ? currentTotal : currentTotal + 1;
      
      await userRef.set({
        latestSessionId: chatSessionId,
        latestUpdate: new Date(),
        totalSessions: newTotal,
        lastUpdated: new Date()
      }, { merge: true });
      
      if (!existingSession.exists) {
        console.log('📊 Incremented total sessions count to:', newTotal);
      }
    } catch (updateError) {
      console.warn('⚠️ Could not update total sessions count:', updateError);
      // Continue anyway - the main data is stored
    }

    console.log('�� ENCRYPTED INSIGHTS STORED SUCCESSFULLY:', {
      userEmail,
      documentId: userEmail,
      collection: 'encrypted_insights',
      sessionId: chatSessionId,
      timestamp: new Date().toISOString()
    });

    response.json({ 
      success: true, 
      message: 'Insights stored securely',
      sessionId: chatSessionId,
      parametersStored: Object.keys(wellnessData).length
    });

  } catch (error) {
    console.error('🚨 ERROR STORING ENCRYPTED INSIGHTS:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    });
    
    response.status(500).json({ 
      success: false, 
      error: 'Failed to store insights' 
    });
  }
});

// Get encrypted insights with chat history for analytics
export const getEncryptedInsights = onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(200).send('');
    return;
  }

  try {
    const { userEmail, includeHistory = false } = request.body;
    
    console.log('🔍 RETRIEVING ENCRYPTED INSIGHTS FOR:', userEmail);

    if (!userEmail) {
      response.status(400).json({ 
        success: false, 
        error: 'Missing userEmail' 
      });
      return;
    }

    const db = getFirestore();
    const userRef = db.collection('encrypted_insights').doc(userEmail);
    
    console.log('📖 QUERYING FIRESTORE:', {
      collection: 'encrypted_insights',
      documentId: userEmail,
      timestamp: new Date().toISOString()
    });

    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      response.json({ 
        success: false, 
        error: 'No insights found for this user' 
      });
      return;
    }

    const userData = userDoc.data();
    
    if (!userData) {
      response.status(500).json({ 
        success: false, 
        error: 'Failed to retrieve user data' 
      });
      return;
    }
    
    console.log('🔓 DATA RETRIEVED FROM FIRESTORE:', {
      userEmail,
      hasLatestSession: !!userData?.latestSessionId,
      totalSessions: userData?.totalSessions || 0,
      lastUpdated: userData?.lastUpdated,
      dataSize: JSON.stringify(userData).length
    });

    // Get latest chat session data
    let latestWellnessData = {};
    if (userData.latestSessionId) {
      const latestSessionRef = userRef.collection('chat_sessions').doc(userData.latestSessionId);
      const latestSessionDoc = await latestSessionRef.get();
      
      if (latestSessionDoc.exists) {
        const sessionData = latestSessionDoc.data();
        if (sessionData) {
          // Verify data integrity for the session
          if (EncryptionService.verifyDataIntegrity(
            sessionData.encryptedData, 
            sessionData.iv, 
            userEmail
          )) {
            latestWellnessData = EncryptionService.decryptWellnessData(
              sessionData.encryptedData,
              sessionData.iv,
              userEmail
            );
            console.log('✅ Latest session data decrypted successfully');
          } else {
            console.log('⚠️ Data integrity check failed for latest session');
          }
        }
      }
    }

    // Get chat history if requested
    let chatHistory: any[] = [];
    if (includeHistory) {
      const chatSessionsSnapshot = await userRef.collection('chat_sessions').orderBy('timestamp', 'desc').get();
      chatHistory = chatSessionsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          sessionId: data.sessionId,
          timestamp: data.timestamp,
          parametersCollected: data.parametersCollected,
          parameterCount: data.parameterCount,
          // Don't decrypt historical data for privacy - just metadata
        };
      });
    }

    console.log('🎉 ENCRYPTED INSIGHTS RETRIEVED SUCCESSFULLY:', {
      userEmail,
      decryptedDataKeys: Object.keys(latestWellnessData),
      decryptedDataValues: Object.values(latestWellnessData),
      chatHistoryCount: chatHistory.length,
      timestamp: new Date().toISOString()
    });

    response.json({
      success: true,
      data: {
        wellnessData: latestWellnessData,
        lastUpdated: userData.lastUpdated,
        totalSessions: userData.totalSessions || 1,
        chatHistory: includeHistory ? chatHistory : undefined
      }
    });

  } catch (error) {
    console.error('🚨 ERROR RETRIEVING ENCRYPTED INSIGHTS:', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : 'No stack trace',
      timestamp: new Date().toISOString()
    });
    
    response.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve insights' 
    });
  }
});

// Authentication endpoints
