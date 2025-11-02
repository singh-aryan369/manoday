import { onRequest } from 'firebase-functions/v2/https';
import * as logger from "firebase-functions/logger";
import { GeminiController } from './controllers/gemini.controller';
import { AutoMLController } from './controllers/automl.controller';
import { ProfessionalHelpController } from './controllers/professional-help.controller';
import { JournalController } from './controllers/journal.controller';
import { SpeechToTextController } from './controllers/speech-to-text.controller';
import { MeditationController } from './controllers/meditation.controller';
import { HobbiesController } from './controllers/hobbies.controller';
import { GeminiService } from './services/gemini.service';
import { validateConfig } from './config';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { EncryptionService } from './services/encryption.service';
import * as admin from 'firebase-admin';

// Initialize Firebase Admin with local/production config
if (!admin.apps.length) {
  const isDevelopment = process.env.NODE_ENV === 'development' || 
                       process.env.USE_FIREBASE_EMULATOR === 'true';
  
  if (isDevelopment) {
    // Use emulator configuration for local development
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
    });
    
    // Set emulator environment variables
    process.env.FIRESTORE_EMULATOR_HOST = 'localhost:8081';
    process.env.FIREBASE_AUTH_EMULATOR_HOST = 'localhost:9099';
    process.env.FUNCTIONS_EMULATOR_HOST = 'localhost:5001';
    
    console.log('🔥 Firebase Admin initialized for local development with emulators');
  } else {
    // Use production Firebase configuration
    admin.initializeApp({
      projectId: process.env.FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
    });
    console.log('🔥 Firebase Admin initialized for production');
  }
}

// Set global options for Firebase Functions
// setGlobalOptions({ maxInstances: 10 }); // This line is removed as per the new_code

// Initialize controllers
const geminiController = new GeminiController();
const automlController = new AutoMLController();
const professionalHelpController = new ProfessionalHelpController();
const journalController = new JournalController();
const speechToTextController = new SpeechToTextController();
const meditationController = new MeditationController();
const hobbiesController = new HobbiesController();

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

// Meditation endpoints
export const meditation = onRequest(async (request, response) => {
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');
  response.set('Access-Control-Max-Age', '86400');

  if (request.method === 'OPTIONS') {
    response.status(200).send('');
    return;
  }

  logger.info('Meditation endpoint called');
  
  try {
    if (request.method === 'POST') {
      await meditationController.handleRequest(request, response);
    } else {
      response.status(405).json({
        success: false,
        error: 'Method not allowed. Use POST.'
      });
    }
  } catch (error) {
    logger.error('Error in meditation endpoint:', error);
    response.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
});

// Hobbies endpoint
export const hobbies = onRequest(async (request, response) => {
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-id');
  response.set('Access-Control-Max-Age', '86400');

  if (request.method === 'OPTIONS') {
    response.status(200).send('');
    return;
  }

  logger.info('Hobbies endpoint called', { 
    method: request.method, 
    path: request.path 
  });
  
  try {
    const path = request.path || '';
    
    // Route handling
    if (path.includes('/survey/submit') && request.method === 'POST') {
      await hobbiesController.submitSurvey(request, response);
    } else if (path.includes('/suggest') && request.method === 'GET') {
      await hobbiesController.getHobbySuggestions(request, response);
    } else if (path.includes('/update_progress') && request.method === 'POST') {
      await hobbiesController.updateProgress(request, response);
    } else if (path.includes('/profile') && request.method === 'GET') {
      await hobbiesController.getUserProfile(request, response);
    } else if (path.includes('/all') && request.method === 'GET') {
      await hobbiesController.getAllHobbies(request, response);
    } else if (path.match(/\/[a-zA-Z0-9_-]+$/) && request.method === 'GET') {
      // Get hobby by ID (e.g., /hobbies/hobby_123)
      const hobbyId = path.split('/').pop();
      request.params = { hobbyId: hobbyId || '' };
      await hobbiesController.getHobbyById(request, response);
    } else {
      response.status(404).json({
        success: false,
        error: 'Route not found'
      });
    }
  } catch (error) {
    logger.error('Error in hobbies endpoint:', error);
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

// Personal Assistant Agent (LangChain-like) endpoint using Gemini backend
export const personalAssistantAgent = onRequest(async (request, response) => {
  // CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  response.set('Access-Control-Allow-Headers', 'Content-Type');
  response.set('Access-Control-Max-Age', '86400');

  if (request.method === 'OPTIONS') {
    response.status(200).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ success: false, error: 'Method not allowed' });
    return;
  }

  try {
    const { userEmail, prompt, context, tools } = request.body || {};
    if (!userEmail || !prompt) {
      response.status(400).json({ success: false, error: 'Missing userEmail or prompt' });
      return;
    }

    // Prepare a compact context string for the LLM
    const compact = (obj: any, max = 2000) => {
      try {
        const s = JSON.stringify(obj || {});
        return s.length > max ? s.slice(0, max) + '…' : s;
      } catch {
        return '';
      }
    };

    const assistantSystemPreamble = `
You are a supportive wellness assistant. Be concise, practical, and empathetic.
Use the provided context (WRI history, goals, journal streaks, and recent wellness inputs) to personalize guidance.
Tools available (by server): ${compact(tools, 300)}.
Never expose internal JSON directly; speak naturally. Provide 2–4 actionable steps when appropriate.`;

    // Build a single prompt for GeminiController
    const augmentedMessage = `${assistantSystemPreamble}

User prompt: ${prompt}

Context snapshot:
- Latest WRI: ${context?.latestWri ?? 'unknown'}
- WRI history (last few): ${compact((context?.wriHistory || []).slice(-5))}
- Goals today: ${compact((context?.dailyGoals || []).map((g: any)=>({id:g.id,title:g.title,completed:g.completed}))).slice(0, 500)}
- Journal metrics: ${compact(context?.journalMetrics)}
- Recent wellness inputs: ${compact(context?.wellnessData)}
`;

    // Use Gemini service directly for a deterministic response
    const geminiService = new GeminiService();
    const r = await geminiService.generateResponse({
      message: augmentedMessage,
      conversationHistory: [],
      wellnessData: {}
    } as any);
    const replyText = r.response || 'How can I support you today?';

    const pickExpression = (reply: string, latestWri?: number) => {
      const r = reply.toLowerCase();
      if (latestWri !== undefined && latestWri >= 75) return 'scared';
      if (r.includes('sorry') || r.includes('cannot') || r.includes('unable')) return 'apologetic';
      if (r.includes('great') || r.includes('nice') || (latestWri !== undefined && latestWri < 25)) return 'cheerful';
      if (r.includes('note') || r.includes('info')) return 'info';
      return 'neutral';
    };

    const expression = pickExpression(replyText, context?.latestWri);

    response.json({ reply: replyText, expression, toolCalls: [] });
  } catch (error) {
    logger.error('Personal assistant agent error', error);
    response.status(500).json({ reply: 'I ran into an issue. Please try again in a moment.', expression: 'apologetic' });
  }
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

// Store encrypted journal insights 
export const storeJournalInsights = onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(200).send('');
    return;
  }

  try {
    const { userEmail, journalData } = request.body;
    
    console.log('🔐 STORING ENCRYPTED JOURNAL INSIGHTS:', {
      userEmail,
      journalData,
      timestamp: new Date().toISOString()
    });

    if (!userEmail || !journalData) {
      console.log('❌ VALIDATION FAILED:', { userEmail: !!userEmail, journalData: !!journalData });
      response.status(400).json({ success: false, error: 'Missing required fields' });
      return;
    }

    // Encrypt the journal data
    console.log('🔑 GENERATING ENCRYPTION KEY FOR JOURNAL DATA:', userEmail);
    const { encryptedData, iv } = EncryptionService.encryptWellnessData(journalData, userEmail);
    
    console.log('✅ JOURNAL ENCRYPTION SUCCESSFUL:', {
      userEmail,
      encryptedDataLength: encryptedData.length,
      ivLength: iv.length,
      originalDataSize: JSON.stringify(journalData).length
    });

    // Store to Journal_insights collection
    const db = getFirestore();
    const today = new Date().toISOString().slice(0, 10);
    const journalInsightRef = db.collection('Journal_insights').doc(userEmail).collection('daily').doc(today);
    
    const storageData = {
      encryptedData,
      iv,
      userEmail,
      date: today,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      dataType: 'journal_metrics',
      // Store readable metrics for dashboard display
      metrics: {
        journal_streak: journalData.journal_streak || 0,
        weekly_journal_count: journalData.weekly_journal_count || 0,
        journal_entries_today: journalData.journal_entries_today || 0,
        last_journal_date: journalData.last_journal_date || null
      }
    };

    await journalInsightRef.set(storageData, { merge: true });
    
    console.log('✅ JOURNAL INSIGHTS STORED SUCCESSFULLY:', {
      userEmail,
      date: today,
      collection: 'Journal_insights'
    });

    response.status(200).json({ 
      success: true, 
      message: 'Journal insights stored successfully',
      date: today
    });

  } catch (error) {
    console.error('❌ JOURNAL INSIGHTS STORAGE ERROR:', error);
    response.status(500).json({ 
      success: false, 
      error: 'Failed to store journal insights' 
    });
  }
});

// Get encrypted journal insights
export const getJournalInsights = onRequest(async (request, response) => {
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  if (request.method === 'OPTIONS') {
    response.status(200).send('');
    return;
  }

  try {
    const { userEmail } = request.body;
    
    if (!userEmail) {
      response.status(400).json({ success: false, error: 'Missing userEmail' });
      return;
    }

    console.log('🔍 RETRIEVING ENCRYPTED JOURNAL INSIGHTS:', { userEmail });

    // Get today's journal insights
    const db = getFirestore();
    const today = new Date().toISOString().slice(0, 10);
    const journalInsightRef = db.collection('Journal_insights').doc(userEmail).collection('daily').doc(today);
    
    const doc = await journalInsightRef.get();
    
    if (!doc.exists) {
      console.log('📭 No journal insights found for today:', { userEmail, date: today });
      response.status(200).json({ 
        success: true, 
        journalData: {
          journal_streak: 0,
          weekly_journal_count: 0,
          last_journal_date: null,
          journal_entries_today: 0
        }
      });
      return;
    }

    const data = doc.data();
    if (!data || !data.encryptedData || !data.iv) {
      console.log('📭 Invalid journal insight data:', { userEmail, data });
      response.status(200).json({ 
        success: true, 
        journalData: {
          journal_streak: 0,
          weekly_journal_count: 0,
          last_journal_date: null,
          journal_entries_today: 0
        }
      });
      return;
    }

    // Decrypt the journal data
    console.log('🔓 DECRYPTING JOURNAL INSIGHTS:', { userEmail });
    const decryptedData = EncryptionService.decryptWellnessData(data.encryptedData, data.iv, userEmail);
    
    console.log('✅ JOURNAL INSIGHTS RETRIEVED AND DECRYPTED:', {
      userEmail,
      date: today,
      journalData: decryptedData
    });

    response.status(200).json({ 
      success: true, 
      journalData: decryptedData
    });

  } catch (error) {
    console.error('❌ JOURNAL INSIGHTS RETRIEVAL ERROR:', error);
    response.status(500).json({ 
      success: false, 
      error: 'Failed to retrieve journal insights' 
    });
  }
});

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
      const chatSessionsSnapshot = await userRef.collection('chat_sessions').orderBy('timestamp', 'asc').get();
      chatHistory = [];
      for (const docSnap of chatSessionsSnapshot.docs) {
        const data = docSnap.data();
        if (data?.encryptedData && data?.iv) {
          try {
            // Decrypt each session using the same server-side method
            const decrypted = EncryptionService.decryptWellnessData(
              data.encryptedData,
              data.iv,
              userEmail
            );
            chatHistory.push({
              sessionId: data.sessionId,
              timestamp: data.timestamp,
              wellnessData: decrypted,
              parametersCollected: data.parametersCollected,
              parameterCount: data.parameterCount,
            });
          } catch (e) {
            chatHistory.push({
              sessionId: data.sessionId,
              timestamp: data.timestamp,
              error: 'DECRYPT_FAILED'
            });
          }
        } else {
          chatHistory.push({
            sessionId: data?.sessionId,
            timestamp: data?.timestamp,
            parametersCollected: data?.parametersCollected,
            parameterCount: data?.parameterCount,
          });
        }
      }
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
