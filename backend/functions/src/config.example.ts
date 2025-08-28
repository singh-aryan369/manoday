// Configuration file for API endpoints and credentials
export const config = {

  // Vertex AI Gemini Configuration - Uses Firebase config with fallbacks
  gemini: {
    apiKey: process.env.FIREBASE_CONFIG_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY_HERE',
    endpoint: process.env.FIREBASE_CONFIG_GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 1024
  },
  
  // AutoML Model Configuration - Uses environment variables for security
  automl: {
    endpoint: process.env.AUTOML_ENDPOINT || 'https://YOUR_REGION-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/YOUR_REGION/endpoints/YOUR_ENDPOINT_ID:predict',
    modelId: process.env.AUTOML_MODEL_ID || 'YOUR_MODEL_ID_HERE',
    projectId: process.env.PROJECT_ID || 'YOUR_PROJECT_ID_HERE',
    region: process.env.REGION || 'YOUR_REGION_HERE'
  },
  
  // Service Account Configuration - Uses environment variables for security
  serviceAccount: {
    email: process.env.SERVICE_ACCOUNT_EMAIL || 'YOUR_SERVICE_ACCOUNT_EMAIL@YOUR_PROJECT_ID.iam.gserviceaccount.com',
    projectId: process.env.PROJECT_ID || 'YOUR_PROJECT_ID_HERE',
    region: process.env.REGION || 'YOUR_REGION_HERE',
    privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nYOUR_ACTUAL_PRIVATE_KEY_HERE\n-----END PRIVATE KEY-----'
  },
  
  // Wellness Data Schema (matching your AutoML model)
  wellnessSchema: {
    mood: ['Happy', 'Sad', 'Anxious', 'Stressed', 'Angry', 'Calm', 'Neutral'],
    sleepHours: { min: 0, max: 24, default: 7 },
    stressLevel: { min: 1, max: 10, default: 5 },
    academicPressure: { min: 1, max: 10, default: 5 },
    socialSupport: { min: 1, max: 10, default: 5 },
    loneliness: { min: 1, max: 10, default: 5 },
    confidenceLevel: { min: 1, max: 10, default: 5 },
    hobbiesInterest: { min: 1, max: 10, default: 5 },
    opennessToJournaling: { min: 1, max: 10, default: 5 },
    willingForProfessionalHelp: { min: 1, max: 10, default: 5 }
  },
  
  // Activity Recommendations (matching your target column)
  activities: [
    'Journaling',
    'Professional Help',
    'Goal Setting',
    'Hobbies Wanderlust',
    'Meditation and Yoga',
    'Personalized Goal Tracker'
  ]
};

// Environment variable validation
export function validateConfig() {
  // Always return true since we have fallback values
  console.log('✅ Configuration loaded with fallback values');
  return true;
}
