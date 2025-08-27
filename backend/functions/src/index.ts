/**
 * Import function triggers from their respective submodules:
 *
 * import {onCall} from "firebase-functions/v2/https";
 * import {onDocumentWritten} from "firebase-functions/v2/firestore";
 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */

import {setGlobalOptions} from "firebase-functions";
import {onRequest} from "firebase-functions/https";
import * as logger from "firebase-functions/logger";
import cors from 'cors';
import { config, validateConfig } from './config';

// Debug: Check if environment variables are loaded
console.log('🔍 Environment variables check:');
console.log('GEMINI_API_KEY:', process.env.FIREBASE_CONFIG_GEMINI_API_KEY ? '✅ Loaded' : '❌ Missing (using fallback)');
console.log('AUTOML_ENDPOINT:', process.env.FIREBASE_CONFIG_AUTOML_ENDPOINT ? '✅ Loaded' : '❌ Missing (using fallback)');
console.log('SERVICE_ACCOUNT_EMAIL:', process.env.FIREBASE_CONFIG_SERVICE_ACCOUNT_EMAIL ? '✅ Loaded' : '❌ Missing (using fallback)');

// Start writing functions
// https://firebase.google.com/docs/functions/typescript

// For cost control, you can set the maximum number of containers that can be
// running at the same time. This helps mitigate the impact of unexpected
// traffic spikes by instead downgrading performance. This limit is a
// per-function limit. You can override the limit for each function using the
// `maxInstances` option in the function's options, e.g.
// `onRequest({ maxInstances: 5 }, (req, res) => { ... })`.
// NOTE: setGlobalOptions does not apply to functions using the v1 API. V1
// functions should each use functions.runWith({ maxInstances: 10 }) instead.
// In the v1 API, each function can only serve one request per container, so
// this will be the maximum concurrent request count.
setGlobalOptions({ maxInstances: 10 });

// Vertex AI Gemini API endpoint
export const gemini = onRequest(async (request, response) => {
  // Enable CORS
  response.set('Access-Control-Allow-Origin', '*');
  response.set('Access-Control-Allow-Methods', 'GET, POST');
  response.set('Access-Control-Allow-Headers', 'Content-Type');

  // Debug: Check config validation
  console.log('🔍 Gemini endpoint - Config validation:');
  const configValid = validateConfig();
  if (!configValid) {
    response.status(500).json({ error: 'Configuration validation failed' });
    return;
  }

  if (request.method === 'OPTIONS') {
    response.status(204).send('');
    return;
  }

  if (request.method !== 'POST') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { message, conversationHistory, wellnessData } = request.body;

    if (!message) {
      response.status(400).json({ error: 'Message is required' });
      return;
    }

    // Call Gemini API and get response with extracted data
    const geminiResult = await callVertexAIGemini(message, conversationHistory, wellnessData);
    
    // Merge extracted data with existing wellness data
    const updatedWellnessData = { ...wellnessData, ...geminiResult.extractedData };
    
    response.json({ 
      response: geminiResult.response,
      extractedData: geminiResult.extractedData,
      updatedWellnessData: updatedWellnessData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('Gemini API error:', error);
    response.status(500).json({ 
      error: 'Failed to get Gemini response',
      fallback: getFallbackResponse(request.body?.message || '')
    });
  }
});

// AutoML Model API endpoint
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
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { features, wellnessData } = request.body;
    
    // Accept either 'features' or 'wellnessData' for backwards compatibility
    const inputData = features || wellnessData;

    if (!inputData) {
      response.status(400).json({ error: 'Features or wellnessData are required' });
      return;
    }

    const result = await callAutoMLModel(inputData);
    
    logger.info('AutoML endpoint response:', { result, type: typeof result });
    
    response.json({ 
      recommendation: result.recommendation,
      confidence: result.confidence,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    logger.error('AutoML API error:', error);
    response.status(500).json({ 
      error: 'Failed to get AutoML recommendation',
      fallback: getFallbackRecommendation(request.body?.features?.mood)
    });
  }
});

// Test endpoint to verify data transformation
export const testTransform = onRequest((request, response) => {
  cors()(request, response, () => {
    try {
      const features = request.body?.features || {};
      const transformed = prepareModelInput(features);
      
      response.json({
        original: features,
        transformed: transformed,
        message: "Data transformation test"
      });
    } catch (error) {
      response.status(500).json({ error: String(error) });
    }
  });
});

// Helper function to call Vertex AI Gemini
async function callVertexAIGemini(message: string, conversationHistory: string[], wellnessData: any): Promise<{ response: string; extractedData: any }> {
  try {
    // Import config to use the centralized configuration
    const { config } = require('./config');
    const GEMINI_API_KEY = config.gemini.apiKey;
    const GEMINI_ENDPOINT = config.gemini.endpoint;
    
    // Create empathetic prompt based on wellness data
    const prompt = createEmpatheticPrompt(message, conversationHistory, wellnessData);
    
    // Log the prompt being sent for debugging
    logger.info('Sending prompt to Gemini:', { prompt: prompt.substring(0, 500) + '...' });
    
    const response = await fetch(`${GEMINI_ENDPOINT}?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_MEDIUM_AND_ABOVE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      logger.error('Gemini API error:', { status: response.status, error: errorText });
      
      // Handle quota exceeded - use intelligent fallback
      if (response.status === 429) {
        logger.info('Quota exceeded, using intelligent fallback based on wellness data');
        const fallbackResponse = getIntelligentFallback(message, conversationHistory, wellnessData);
        return {
          response: fallbackResponse,
          extractedData: {}
        };
      }
      
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const geminiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || getIntelligentFallback(message, conversationHistory, wellnessData);
    
        // Parse Gemini response to extract wellness data
    const extractedData = parseGeminiResponse(geminiResponse);
    
    // Clean the response by removing JSON blocks for frontend display
    const cleanResponse = geminiResponse.replace(/```json\s*\{[\s\S]*?\}\s*```/g, '').trim();
    
    logger.info('Gemini API call successful:', { 
      messageLength: message.length, 
      responseLength: geminiResponse.length,
      extractedData: extractedData
    });

    return {
      response: cleanResponse,
      extractedData: extractedData
    };

  } catch (error) {
    logger.error('Vertex AI Gemini call failed:', error);
    const fallbackResponse = getIntelligentFallback(message, conversationHistory, wellnessData);
    return {
      response: fallbackResponse,
      extractedData: {}
    };
  }
}

// Helper function to call AutoML model
async function callAutoMLModel(features: any): Promise<{ recommendation: string; confidence: number }> {
  try {
    // Use the real AutoML endpoint from config
    const AUTOML_ENDPOINT = config.automl.endpoint;
    
    // Prepare features for your AutoML model
    const modelInput = prepareModelInput(features);
    
    // Log the input data for debugging
    logger.info('AutoML input features:', { original: features, transformed: modelInput });
    
    // Get access token using application default credentials
    const accessToken = await getAccessToken();
    
    // Vertex AI AutoML endpoint expects this format
    const response = await fetch(AUTOML_ENDPOINT, {
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
    
    // Extract prediction from Vertex AI response format
    if (data.predictions && data.predictions[0]) {
      const predictionData = data.predictions[0];
      
      // Find the highest confidence prediction
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
        recommendation: bestClass || getFallbackRecommendation(features.mood),
        confidence: maxScore || 0.8
      };
    }
    
    // Fallback if no predictions
    const fallback = getFallbackRecommendation(features.mood);
    logger.info('Using fallback recommendation:', { recommendation: fallback, confidence: 0.8 });
    return {
      recommendation: fallback,
      confidence: 0.8
    };

  } catch (error) {
    logger.error('AutoML model call failed:', error);
    return {
      recommendation: getFallbackRecommendation(features.mood),
      confidence: 0.8
    };
  }
}

// Helper function to get access token
async function getAccessToken(): Promise<string> {
  try {
    // Use the service account private key for JWT authentication
    const serviceAccountEmail = config.serviceAccount.email;
    const privateKey = config.serviceAccount.privateKey;
    
    // Use google-auth-library for proper JWT authentication
    const { JWT } = await import('google-auth-library');
    
    const jwt = new JWT({
      email: serviceAccountEmail,
      key: privateKey,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    // Get access token directly from JWT client
    const accessToken = await jwt.getAccessToken();
    
    if (!accessToken.token) {
      throw new Error('Failed to get access token from JWT client');
    }
    
    logger.info('Successfully obtained access token using service account JWT');
    return accessToken.token;
    
  } catch (error) {
    logger.error('Service account authentication failed:', error);
    
    // Fallback: try application default credentials
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

// Create empathetic prompt for Gemini based on real interview examples
function createEmpatheticPrompt(message: string, conversationHistory: string[], wellnessData: any): string {
  const history = conversationHistory.slice(-6).join('\n'); // Keep last 6 exchanges for context
  
  // Define the exact order of parameters to collect
  const parameterOrder = [
    'mood',
    'sleepHours', 
    'stressLevel',
    'academicPressure',
    'socialSupport',
    'loneliness',
    'confidenceLevel',
    'hobbiesInterest',
    'opennessToJournaling',
    'willingForProfessionalHelp'
  ];

  // Count collected parameters and assess conversation flow with intelligent progression
  let collectedCount = 0;
  let nextParameter: string | null = null;
  
  for (const param of parameterOrder) {
    if (wellnessData[param]) {
      collectedCount++;
    } else if (!nextParameter) {
      nextParameter = param;
    }
  }
  
  const conversationLength = conversationHistory.length;
  
  // Check if we've been asking about the same parameter multiple times
  if (nextParameter) {
    const currentParamMessages = conversationHistory.filter(msg => {
      const lowerMsg = msg.toLowerCase();
      return lowerMsg.includes(nextParameter as string) || 
             lowerMsg.includes('sleep') || 
             lowerMsg.includes('stress') ||
             lowerMsg.includes('academic') ||
             lowerMsg.includes('support') ||
             lowerMsg.includes('lonely') ||
             lowerMsg.includes('confidence') ||
             lowerMsg.includes('hobby') ||
             lowerMsg.includes('journal') ||
             lowerMsg.includes('professional');
    });
    
    // If we've asked about this parameter 2+ times, make intelligent assumption and move forward
    if (currentParamMessages.length >= 2) {
      // We'll make the assumption after conversationFlow is defined
      logger.info(`User has been asked about ${nextParameter} multiple times, will make intelligent assumption`);
    }
  }
  
  // Check if user explicitly asks for recommendation
  const userAsksForRecommendation = message.toLowerCase().includes('recommend me') || 
                                  message.toLowerCase().includes('suggest me') || 
                                  message.toLowerCase().includes('help me') ||
                                  message.toLowerCase().includes('recommend') ||
                                  message.toLowerCase().includes('suggest');
  
  if (userAsksForRecommendation) {
    nextParameter = null; // User wants recommendation now
  }

  logger.info('Smart prompt logic:', { collectedCount, conversationLength, nextParameter, willContinueQuestioning: !!nextParameter });

  // If user asks for recommendation OR all parameters collected, give brief supportive response
  if (!nextParameter) {
    return `You are a supportive friend responding to someone asking for help.

User's message: "${message}"
What you know about them: ${JSON.stringify(wellnessData)}

CRITICAL INSTRUCTIONS:
1. Provide 4-5 lines of empathetic, caring response
2. Be warm, understanding, and emotionally supportive
3. If they ask for recommendation/activity, acknowledge their request warmly
4. Sound like a caring friend who truly understands their struggles
5. Show genuine empathy and validation of their feelings
6. Be encouraging and hopeful while acknowledging their challenges

Remember: Compassionate, empathetic, supportive - like a close friend who truly cares.`;
  }

  // Empathetic, therapist-like conversation flow with intelligent assumptions
  const conversationFlow = {
    mood: {
      starter: "I can sense you're going through something challenging. When you think about your emotional state lately, what would you say is most present? Are you feeling more on the sad side, anxious, or maybe somewhere in between?",
      smartDefaults: { unclear: "Sad", negative: "Sad", positive: "Happy", mentions_worry: "Anxious" } // Assume sad if unclear (context of asking for help)
    },
    sleepHours: {
      starter: "I know when we're struggling emotionally, sleep often gets disrupted too. Can you tell me, on a typical night, how many hours of rest are you actually getting?",
      smartDefaults: { unclear: "5", mentions_tired: "5", mentions_good_sleep: "8", mentions_insomnia: "4" } // Assume 5 hours if unclear (common for struggling people)
    },
    stressLevel: {
      starter: "I can see this is really affecting you. When you think about your stress levels these days, would you say you're feeling more on the overwhelmed side, like it's manageable but challenging, or actually pretty calm and relaxed?",
      smartDefaults: { unclear: "High", mentions_exams: "High", mentions_relaxed: "Low", mentions_overwhelming: "High", mentions_manageable: "Medium", mentions_calm: "Low" } // Assume high if unclear (context of asking for help)
    },
    academicPressure: {
      starter: "I'm curious about how your academic responsibilities are feeling these days. Do they feel like something you can handle, or are they starting to feel like too much?",
      smartDefaults: { unclear: "Medium", mentions_overwhelming: "High", mentions_manageable: "Low", mentions_easy: "Low" }
    },
    socialSupport: {
      starter: "Having people we can lean on makes such a difference. How would you describe the support you're getting from the people in your life right now?",
      smartDefaults: { unclear: "Weak", mentions_alone: "Weak", mentions_family_friends: "Strong", mentions_isolated: "Weak" } // Assume weak if unclear (context of asking for help)
    },
    loneliness: {
      starter: "I want to understand this better. How often do you find yourself feeling disconnected or alone? Is this something that happens occasionally, or does it feel more constant?",
      smartDefaults: { unclear: "Often", mentions_alone: "Often", mentions_friends: "Never", mentions_isolated: "Often" } // Assume often if unclear (context of asking for help)
    },
    confidenceLevel: {
      starter: "I'm wondering about your sense of self-confidence these days. How would you describe your belief in yourself and your abilities right now?",
      smartDefaults: { unclear: "Low", mentions_doubt: "Low", mentions_capable: "High", mentions_uncertain: "Low" } // Assume low if unclear (context of asking for help)
    },
    hobbiesInterest: {
      starter: "I'm curious about what brings you joy or helps you recharge. What kinds of activities or interests do you find yourself drawn to these days?",
      smartDefaults: { unclear: "None", mentions_activity: "Sports", mentions_music: "Music", mentions_reading: "Reading" }
    },
    opennessToJournaling: {
      starter: "Some people find that writing down their thoughts helps them process things. Is that something you've ever tried or would be open to?",
      smartDefaults: { unclear: "No", mentions_writing: "Yes", mentions_not_interested: "No", mentions_curious: "Yes" }
    },
    willingForProfessionalHelp: {
      starter: "I want to ask about something important. If things ever felt too heavy to carry alone, how do you feel about the idea of talking with someone who's trained to help?",
      smartDefaults: { unclear: "No", mentions_help: "Yes", mentions_private: "No", mentions_stigma: "No" }
    }
  };

  // NEVER repeat questions - assign smart values immediately when user response is unclear
  if (nextParameter && conversationFlow[nextParameter as keyof typeof conversationFlow]) {
    const currentFlow = conversationFlow[nextParameter as keyof typeof conversationFlow];
    
    // Only assign smart value if we don't have this parameter and user response is unclear
    if (!wellnessData[nextParameter] && currentFlow) {
      // Check if the current message is unclear or contains skip keywords
      const currentMessage = message.toLowerCase();
      const isSkipRequest = currentMessage.includes('skip') || 
                           currentMessage.includes('next question') || 
                           currentMessage.includes('i don\'t want to answer') ||
                           currentMessage.includes('move on') ||
                           currentMessage.includes('pass') ||
                           currentMessage.includes('don\'t want to talk about it');
      
      // Check if user response is unclear (doesn't contain relevant keywords)
      const isUnclearResponse = !isSkipRequest && !isClearResponseForParameter(currentMessage, nextParameter);
      
      // CRITICAL: Only assign if we're actually asking about this parameter right now
      const isCurrentlyAsking = conversationHistory.length > 0 && 
                               conversationHistory[conversationHistory.length - 1].toLowerCase().includes(nextParameter as string);
      
      // Assign smart value immediately if skip request or unclear response AND we're currently asking about this parameter
      if ((isSkipRequest || isUnclearResponse) && isCurrentlyAsking) {
        // Make intelligent assumption based on context
        wellnessData[nextParameter] = currentFlow.smartDefaults.unclear;
        logger.info(`Making intelligent assumption for ${nextParameter}: ${currentFlow.smartDefaults.unclear}`);
        
        // Move to next parameter immediately
        const remainingParams = parameterOrder.filter(param => !wellnessData[param]);
        nextParameter = remainingParams.length > 0 ? remainingParams[0] : null;
        collectedCount = Object.keys(wellnessData).length;
        
        logger.info(`Parameter assignment debug:`, {
          currentParameter: nextParameter,
          isSkipRequest,
          isUnclearResponse,
          assignedValue: currentFlow.smartDefaults.unclear,
          remainingParams: remainingParams.length
        });
      }
    }
  }

  // Helper function to check if user response is clear for a specific parameter
  function isClearResponseForParameter(userMessage: string, parameter: string): boolean {
    const message = userMessage.toLowerCase();
    
    switch (parameter) {
      case 'mood':
        return message.includes('sad') || message.includes('happy') || message.includes('anxious') || 
               message.includes('stressed') || message.includes('lonely') || message.includes('good') || 
               message.includes('bad') || message.includes('fine') || message.includes('okay');
      
      case 'sleepHours':
        return /\d+\s*(hour|hr|h|hours?)/.test(message) || 
               message.includes('tired') || message.includes('insomnia') || message.includes('good sleep');
      
      case 'stressLevel':
        return message.includes('high') || message.includes('medium') || message.includes('low') || 
               message.includes('overwhelmed') || message.includes('calm') || message.includes('stressed');
      
      case 'academicPressure':
        return message.includes('high') || message.includes('medium') || message.includes('low') || 
               message.includes('overwhelming') || message.includes('manageable') || message.includes('stressful');
      
      case 'socialSupport':
        return message.includes('strong') || message.includes('weak') || message.includes('average') || 
               message.includes('support') || message.includes('help') || message.includes('alone');
      
      case 'loneliness':
        return message.includes('often') || message.includes('sometimes') || message.includes('never') || 
               message.includes('lonely') || message.includes('alone') || message.includes('isolated');
      
      case 'confidenceLevel':
        return message.includes('high') || message.includes('medium') || message.includes('low') || 
               message.includes('confident') || message.includes('doubt') || message.includes('capable');
      
      case 'hobbiesInterest':
        return message.includes('music') || message.includes('sports') || message.includes('reading') || 
               message.includes('art') || message.includes('travel') || message.includes('none') || 
               message.includes('hobby') || message.includes('interest');
      
      case 'opennessToJournaling':
        return message.includes('yes') || message.includes('no') || message.includes('maybe') || 
               message.includes('journal') || message.includes('write') || message.includes('writing');
      
      case 'willingForProfessionalHelp':
        return message.includes('yes') || message.includes('no') || message.includes('maybe') || 
               message.includes('therapist') || message.includes('counselor') || message.includes('help');
      
      default:
        return false;
    }
  }

  const currentFlow = conversationFlow[nextParameter as keyof typeof conversationFlow];

  return `You are an empathetic and friendly wellness companion for young people, inspired by real conversations.
Your role is to chat naturally and supportively while systematically collecting wellness information.

CONVERSATION APPROACH:
This should feel like talking to a caring friend, NOT a survey or interview.
Currently focusing on: ${nextParameter}

User's message: "${message}"
Previous conversation: ${history}

CONTEXT FOR ${nextParameter?.toUpperCase() || 'NEXT_PARAMETER'}:
${currentFlow?.starter || 'Ask about the next wellness parameter naturally'}

CRITICAL INTELLIGENCE INSTRUCTIONS:
1. **SYSTEMATIC COLLECTION**: You MUST follow the parameter order: mood → sleepHours → stressLevel → academicPressure → socialSupport → loneliness → confidenceLevel → hobbiesInterest → opennessToJournaling → willingForProfessionalHelp
2. **CONTEXT AWARENESS**: You know what you asked about ${nextParameter} - use that context to understand user responses
3. **SMART INTERPRETATION**: Even short responses like "music", "overwhelmed", "barely", "no" should be understood based on context
4. **IMMEDIATE PROGRESSION**: If user says "skip", "next question", "i don't want to answer" - acknowledge and move to next parameter
5. **INTELLIGENT MAPPING**: Use your understanding of the question + user's response to map to nearest wellness value
6. **BE EMPATHETIC**: Show understanding even when responses are brief or unclear
7. **ALWAYS ASK NEXT**: After extracting data, ALWAYS ask about the next parameter in the sequence
8. **NEVER REPEAT QUESTIONS**: If user doesn't give clear response, make smart assumption and move forward
9. **ASSIGN ALL PARAMETERS**: Every parameter must get a value - either from user or smart assumption
10. **EFFICIENT FLOW**: Don't wait for perfect answers - be intelligent and keep conversation moving
11. **RESPECT USER INPUT**: If user gives clear response, use that exact value - don't override with smart defaults
12. **CONTEXT-BASED ASSIGNMENT**: Only assign smart values when user response is unclear, based on actual conversation context

SMART CONTEXT UNDERSTANDING EXAMPLES:
- **If you asked about hobbies** and user says "music" → hobbiesInterest: "Music"
- **If you asked about stress** and user says "overwhelmed" → stressLevel: "High"  
- **If you asked about support** and user says "barely" → socialSupport: "Weak"
- **If you asked about confidence** and user says "low" → confidenceLevel: "Low"
- **If you asked about sleep** and user says "5" → sleepHours: "5"
- **If you asked about academic pressure** and user says "too much" → academicPressure: "High"

SKIP HANDLING:
- User: "skip this" → Acknowledge kindly, assign smart default value, and ask about next parameter
- User: "next question" → Thank them, assign smart default value, and move forward naturally
- User: "i don't want to answer" → Respect their choice, assign smart default value, and continue

SMART DEFAULT ASSIGNMENT:
When user skips a question, automatically assign the most appropriate value based on context:
- **Mood**: If unclear → "Stressed" (context of asking for help)
- **Sleep Hours**: If unclear → "6" (average for struggling people)
- **Stress Level**: If unclear → "High" (context of asking for help)
- **Academic Pressure**: If unclear → "Medium" (balanced assumption)
- **Social Support**: If unclear → "Weak" (context of asking for help)
- **Loneliness**: If unclear → "Often" (context of asking for help)
- **Confidence Level**: If unclear → "Low" (context of asking for help)
- **Hobbies Interest**: If unclear → "None" (common for people asking for help)
- **Openness to Journaling**: If unclear → "No" (conservative assumption)
- **Professional Help Willingness**: If unclear → "No" (conservative assumption)

PARAMETER COLLECTION ORDER (FOLLOW THIS EXACTLY):
1. **Mood** → Ask about emotional state
2. **Sleep Hours** → Ask about sleep duration
3. **Stress Level** → Ask about stress intensity
4. **Academic Pressure** → Ask about academic workload
5. **Social Support** → Ask about support network
6. **Loneliness** → Ask about social isolation
7. **Confidence Level** → Ask about self-belief
8. **Hobbies Interest** → Ask about activities/interests
9. **Openness to Journaling** → Ask about writing willingness
10. **Professional Help Willingness** → Ask about therapy openness

WHAT TO COLLECT FOR ${nextParameter}:
- **Mood**: Look for emotional states (sad, happy, anxious, neutral, stressed, lonely)
- **Sleep Hours**: Extract specific numbers (1-10 hours) or patterns (tired, insomnia, good sleep)
- **Stress Level**: Identify intensity (low, medium, high) from context clues
- **Academic Pressure**: Understand workload perception (low, medium, high) from academic mentions
- **Social Support**: Assess support network strength (weak, average, strong) from relationship descriptions
- **Loneliness**: Determine frequency (sometimes, often, never) from social isolation mentions
- **Confidence Level**: Gauge self-belief (low, medium, high) from self-doubt or capability expressions
- **Hobbies Interest**: Identify activities (music, sports, art, travel, reading, none) from interests mentioned
- **Openness to Journaling**: Assess willingness (yes/no) from writing or reflection mentions
- **Professional Help Willingness**: Determine openness (yes/no) from help-seeking or privacy concerns

CRITICAL: After your empathetic response, add a JSON block with extracted wellness data:
\`\`\`json
{
  "extractedData": {
    // Only include parameters you can confidently extract from user's response
    // Use the exact values from the CSV table (e.g., "High", "Medium", "Low", "Often", "Sometimes", "Never")
  }
}
\`\`\`

Already collected: ${JSON.stringify(wellnessData)}

NEVER REPEAT QUESTIONS RULE:
- ALWAYS ask about every parameter - never skip questions
- If user gives clear response, use that exact value
- If user response is unclear/difficult to interpret, assign smart context-based value and move to next
- Never ask the same question twice - make intelligent assumption and continue
- Base smart values on actual conversation context, not generic defaults
- **CRITICAL**: Each parameter is INDEPENDENT - do NOT assume one parameter based on another
- **CRITICAL**: Journaling preference does NOT determine professional help willingness
- **CRITICAL**: Only extract data from the current user response, not from previous responses
- **CRITICAL**: If user says "no" to journaling, ONLY extract opennessToJournaling: "No"
- **CRITICAL**: Do NOT extract willingForProfessionalHelp unless specifically asked about it
- **CRITICAL**: Wait for user's actual response about professional help before extracting that parameter
- **CRITICAL**: Assign values IMMEDIATELY when user gives unclear response or says skip
- **CRITICAL**: Only assign to the current parameter being asked about
- **CRITICAL**: Do NOT auto-assign multiple parameters from one response
- **CRITICAL**: If asking about sleep, ONLY extract sleep-related data
- **CRITICAL**: If asking about stress, ONLY extract stress-related data
- **CRITICAL**: NEVER extract data for parameters that haven't been asked about yet

IMPORTANT: Be creative, natural, and empathetic. Use the context of what you asked to understand even brief responses. Don't wait for perfect answers - be intelligent and move forward! ALWAYS follow the parameter order and ask about the next one!`;
}

// Parse Gemini response to extract wellness data
function parseGeminiResponse(geminiResponse: string): any {
  try {
    // Look for JSON block in the response
    const jsonMatch = geminiResponse.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      const jsonData = JSON.parse(jsonMatch[1]);
      return jsonData.extractedData || {};
    }
    
    // If no JSON block, try to extract from the text
    const extractedData: any = {};
    
    // Extract sleep hours if mentioned
    const sleepMatch = geminiResponse.match(/(\d+)\s*hours?/i);
    if (sleepMatch) {
      extractedData.sleepHours = sleepMatch[1];
    }
    
    // Extract other parameters based on context clues
    if (geminiResponse.toLowerCase().includes('mood:') || geminiResponse.toLowerCase().includes('feeling:')) {
      // Extract mood from context
      if (geminiResponse.toLowerCase().includes('sad') || geminiResponse.toLowerCase().includes('down')) {
        extractedData.mood = 'Sad';
      } else if (geminiResponse.toLowerCase().includes('happy') || geminiResponse.toLowerCase().includes('good')) {
        extractedData.mood = 'Happy';
      } else if (geminiResponse.toLowerCase().includes('anxious') || geminiResponse.toLowerCase().includes('worried')) {
        extractedData.mood = 'Anxious';
      }
    }
    
    return extractedData;
  } catch (error) {
    logger.error('Error parsing Gemini response:', error);
    return {};
  }
}

// Prepare model input for AutoML with smart defaults
function prepareModelInput(features: any): any {
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

// Fallback empathetic responses
// Intelligent fallback that follows conversation flow
function getIntelligentFallback(message: string, conversationHistory: string[], wellnessData: any): string {
  // Define the exact order of parameters to collect
  const parameterOrder = [
    'mood',
    'sleepHours', 
    'stressLevel',
    'academicPressure',
    'socialSupport',
    'loneliness',
    'confidenceLevel',
    'hobbiesInterest',
    'opennessToJournaling',
    'willingForProfessionalHelp'
  ];

  // Find the next parameter to ask about
  let nextParameter = null;
  logger.info('Intelligent fallback - checking wellness data:', { wellnessData });
  
  for (const param of parameterOrder) {
    if (!wellnessData[param]) {
      nextParameter = param;
      logger.info('Intelligent fallback - next parameter:', { nextParameter });
      break;
    }
  }

  // If all parameters are collected, give supportive response
  if (!nextParameter) {
    return "Thank you for sharing so much with me. Based on everything you've told me, I'd like to help you find some activities that might be beneficial. Let me think about what could work best for you.";
  }

  // Parameter-specific fallback questions
  const fallbackQuestions = {
    mood: "I hear you. How have you been feeling emotionally lately?",
    sleepHours: "I understand. How many hours of sleep do you usually get at night?",
    stressLevel: "That sounds challenging. Would you say your stress level is low, medium, or high right now?",
    academicPressure: "I get that. How about your schoolwork - does it feel manageable or overwhelming?",
    socialSupport: "That must be tough. Do you feel supported by your friends and family?",
    loneliness: "I hear you. Do you find yourself feeling lonely often, sometimes, or hardly ever?",
    confidenceLevel: "Thank you for sharing. How would you describe your confidence level these days?",
    hobbiesInterest: "I understand. What kinds of activities or hobbies do you enjoy in your free time?",
    opennessToJournaling: "That makes sense. Would you be open to trying journaling as a way to express your thoughts?",
    willingForProfessionalHelp: "I appreciate your honesty. If things felt overwhelming, would you consider talking to a counselor or professional?"
  };

  const question = fallbackQuestions[nextParameter as keyof typeof fallbackQuestions] || "I'm here to listen and support you. Can you tell me more about how you're feeling?";
  logger.info('Intelligent fallback - returning question:', { question });
  return question;
}

function getFallbackResponse(message: string): string {
  const responses = [
    "Thank you for sharing that with me. Your feelings are completely valid, and I want you to know that you're not alone in this. 💙",
    "I hear you, and I can sense the courage it took to open up. Whatever you're going through, we can work through it together. What feels most overwhelming right now?",
    "That sounds really challenging, and I'm sorry you're experiencing this. You've taken a brave step by reaching out. How can I best support you in this moment?",
    "I appreciate you trusting me with your feelings. Remember, healing isn't linear, and it's perfectly okay to have difficult days. What would bring you even a small sense of comfort right now?",
    "Your emotional experience matters deeply. I'm here to listen without judgment and walk alongside you. Would it help to talk more about what's on your heart?"
  ];
  
  return responses[Math.floor(Math.random() * responses.length)];
}

// Fallback recommendations
function getFallbackRecommendation(mood?: string): string {
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

// Health check endpoint
export const health = onRequest((request, response) => {
  response.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    services: {
      gemini: 'configured',
      automl: 'configured'
    }
  });
});

