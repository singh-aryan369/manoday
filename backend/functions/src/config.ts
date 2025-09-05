// Configuration file for API endpoints and credentials
export const config = {

  // Vertex AI Gemini Configuration - Uses Firebase config with fallbacks
  gemini: {
    apiKey: process.env.FIREBASE_CONFIG_GEMINI_API_KEY || 'AIzaSyB1Vjf6ZK2WZHSlW0DseUARtWGM8Fnyiu4',
    endpoint: process.env.FIREBASE_CONFIG_GEMINI_ENDPOINT || 'https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent',
    model: 'gemini-2.5-flash',
    temperature: 0.7,
    maxTokens: 1024
  },
  
  // AutoML Model Configuration - Uses environment variables for security
  automl: {
    endpoint: process.env.AUTOML_ENDPOINT || 'https://asia-south1-aiplatform.googleapis.com/v1/projects/smart-surf-469908-n0/locations/asia-south1/endpoints/712725427356958720:predict',
    modelId: process.env.AUTOML_MODEL_ID || '5361460589593886720',
    projectId: process.env.PROJECT_ID || 'smart-surf-469908-n0',
    region: process.env.REGION || 'asia-south1'
  },
  
  // Service Account Configuration - Uses environment variables for security
  serviceAccount: {
    email: process.env.SERVICE_ACCOUNT_EMAIL || 'manoday-app@smart-surf-469908.iam.gserviceaccount.com',
    projectId: process.env.PROJECT_ID || 'smart-surf-469908-n0',
    region: process.env.REGION || 'asia-south1',
    privateKey: process.env.SERVICE_ACCOUNT_PRIVATE_KEY || '-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCtNPxhHa2iq1eT\n2FLJRhUvQ0KY4Tm7P22y25dXy0Wb1hws2NuBNO0vqPu4U1VK4vXdK025GDsUrsRk\nfwrVC9U7APUq+0FrftS0dtRCwz1hAEQ4SaJMaPf4OE2HxDGqIvK/NTuCzbAjXPwG\n9Xr4U4WqV4fxJLQ5pgMhIajWK4e8IurSHrAgMBAAECggEAPtoS2RThbL17VqlxhR\nsa1d802/AiuGlwX65ikVewZze/WqDIqm6vwRMzYLRQp4+LQ1oS5p891SgEGSmmnx+\nfnT0gOhwZpa3M9r2GEcHyWeL66XI+UQ7KAeSST7qsMtSfDb77v9dwOUikqQN2gkq\ncwvOPirgy6SfRXWzHniZAI6FGb8eQkS2TZ/PRSJ4BSPNvaMuwZhgRrgR2eQ60ntu\nIOzxK25wf7e/Jn3rCBAKvvM45XEiE3DC11F+94Trp9QaoXLxxauAoNjlg2+v0Ep2\nLOBn+v5GY5VZEeSteLZRfosZrG3BXwTnbH1HVUxiKMA/j8Px5sjHzer2beOARE/9\nZMQKBgQDUMmnP27mg3RnM7jKbOq2tDRYBo8f3sJI/tu82tcelU8MoBeOhL7DyJMA\nxWmT3GwWDZFWRT/X1cjCKZ8dSPEDtg8vdcax0XbniwhvkthHdxbBAjUcofJOuFiD\nQE4T9nmgAb19rGiHO9MbcKqCnl/lYJIRjhprWYG/qjkyMgzY0QKBgQDQ9iQl9TPB\ncH2vIVSq2cydg0tQSWHqyvkoK7sEdxeQXx38LSMglwtGlvkC5d9drdu000cD7DJW\n9O/lEZPJw2N8JJDXU5q74+9VngQX+oQ4UtTaJeiNKowJXjc9+TuF1/jE/O1MHSWq\nCbDR81RXvj7uYtmB0QDqHgj97mVrQG79+wKBgQCRe07YV4jZJT1/JwBDN4bVEPkU\ndFaQoFc5Zz/NtbPjSMZbyFrEaTXroFIAqOIKx0tzKSM0eGmXOreJRg4tyWKIHFtk\nHHVk4gmSlVb7CEbtZRoM22tJVVI6Cmh9f0q7zPWhqAayUO3XrlL44qRUmvUKXCb4\n2pD+WzKDm5T7QQKBgCWV31QM4XIAKLd4Md1sqplscb328eJx/QkoVc1QCS0JsVzL\nM0wvVNt1c1ioKDNoyVLlosrEQa4uOi/F5CDNsJeJTrFC6BdZ29Do0LYyK0EoMm3Z\nbL2AwewTUk1KTJyXIi5YMh+uYZyhb3NAM9jJRhk6O/DMmHpEv7wwIbgqNW/AoGAK\n/TxxMrP4mtr7tALqBzvTE9LXVEhMMo5zkX40OhAufDApUvTpiE1wb7bLVjOaqywA\nCc+yuLIGmUTD9JE1sBYI0VXsRViFGhmJskc+Q63K7o6xV74d2glG7yPuCww4ryP4\ni2MM+lPE1gyXtyT7vbvv4K4P1rFC+c4edVSjOuIiU4=\n-----END PRIVATE KEY-----\n'
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
    apiKey: process.env.GOOGLE_MAPS_API_KEY || 'AIzaSyDk-uXv91NxIhDcXVCewvaUXLuDm4xqZhY',
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
