// Configuration file for API endpoints and credentials
export const config = {

  // Vertex AI Gemini Configuration
  gemini: {
    apiKey: process.env.FIREBASE_CONFIG_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY',
    endpoint: 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 1024
  },
  
  // AutoML Model Configuration
  automl: {
    endpoint: process.env.AUTOML_ENDPOINT || 'https://us-central1-aiplatform.googleapis.com/v1/projects/YOUR_PROJECT_ID/locations/us-central1/endpoints/YOUR_MODEL_ID:predict',
    modelId: process.env.AUTOML_MODEL_ID || 'YOUR_MODEL_ID',
    projectId: process.env.FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
    region: process.env.REGION || 'us-central1'
  },
  
  // Service Account Configuration
  serviceAccount: {
    email: 'YOUR_SERVICE_ACCOUNT_EMAIL@YOUR_PROJECT_ID.iam.gserviceaccount.com',
    projectId: 'YOUR_PROJECT_ID',
    region: 'us-central1',
    privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY || 'YOUR_SERVICE_ACCOUNT_PRIVATE_KEY'
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
  ],

  // Google Maps Configuration for Professional Help
  googleMaps: {
    apiKey: process.env.GOOGLE_MAPS_API_KEY || 'YOUR_GOOGLE_MAPS_API_KEY',
    defaultRadius: 50000, // 50km in meters
    maxResults: 20
  }
};

// Environment variable validation
export function validateConfig() {
  // Check if required environment variables are set
  const requiredEnvVars = [
    'FIREBASE_CONFIG_GEMINI_API_KEY',
    'AUTOML_ENDPOINT',
    'AUTOML_MODEL_ID',
    'PROJECT_ID',
    'REGION',
    'SERVICE_ACCOUNT_EMAIL',
    'SERVICE_ACCOUNT_PRIVATE_KEY'
  ];
  
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.warn('⚠️  Missing environment variables:', missingVars.join(', '));
    console.warn('Please set these environment variables in your Firebase Functions configuration');
    return false;
  }
  
  console.log('✅ Configuration loaded successfully from environment variables');
  return true;
}
