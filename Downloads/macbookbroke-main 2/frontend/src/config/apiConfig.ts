// Centralized API configuration for local/production switching
// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.REACT_APP_DEVELOPMENT_MODE === 'true' ||
                     window.location.hostname === 'localhost';

// Base URLs for local emulator vs production
const LOCAL_BASE_URL = 'http://localhost:5001/YOUR_PROJECT_ID/us-central1';
const PRODUCTION_BASE_URL = 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net';

// API Endpoints Configuration
export const apiConfig = {
  // Gemini AI Chat
  gemini: isDevelopment 
    ? `${LOCAL_BASE_URL}/gemini`
    : `${PRODUCTION_BASE_URL}/gemini`,

  // AutoML Recommendations
  automl: isDevelopment 
    ? `${LOCAL_BASE_URL}/automl`
    : `${PRODUCTION_BASE_URL}/automl`,

  // Journal Management
  journal: isDevelopment 
    ? `${LOCAL_BASE_URL}/journal`
    : `${PRODUCTION_BASE_URL}/journal`,

  // Professional Help Locator
  professionalHelp: isDevelopment 
    ? `${LOCAL_BASE_URL}/professionalHelp`
    : `${PRODUCTION_BASE_URL}/professionalHelp`,

  // Speech-to-Text
  speechToText: isDevelopment 
    ? `${LOCAL_BASE_URL}/speechToText`
    : `${PRODUCTION_BASE_URL}/speechToText`,

  // Encrypted Insights Management
  getEncryptedInsights: isDevelopment 
    ? `${LOCAL_BASE_URL}/getEncryptedInsights`
    : `${PRODUCTION_BASE_URL}/getEncryptedInsights`,

  storeEncryptedInsights: isDevelopment 
    ? `${LOCAL_BASE_URL}/storeEncryptedInsights`
    : `${PRODUCTION_BASE_URL}/storeEncryptedInsights`,

  // Journal Insights
  getJournalInsights: isDevelopment 
    ? `${LOCAL_BASE_URL}/getJournalInsights`
    : `${PRODUCTION_BASE_URL}/getJournalInsights`,

  storeJournalInsights: isDevelopment 
    ? `${LOCAL_BASE_URL}/storeJournalInsights`
    : `${PRODUCTION_BASE_URL}/storeJournalInsights`,

  // Personal Assistant Agent
  personalAssistantAgent: isDevelopment
    ? `${LOCAL_BASE_URL}/personalAssistantAgent`
    : `${PRODUCTION_BASE_URL}/personalAssistantAgent`,

  // Hobbies & Wanderlust
  hobbies: isDevelopment
    ? `${LOCAL_BASE_URL}/hobbies`
    : `${PRODUCTION_BASE_URL}/hobbies`,

  // Health Check
  health: isDevelopment 
    ? `${LOCAL_BASE_URL}/health`
    : `${PRODUCTION_BASE_URL}/health`
};

// Utility function to get API URL
export const getApiUrl = (endpoint: keyof typeof apiConfig): string => {
  return apiConfig[endpoint];
};

// Development mode indicator
export const isDevMode = isDevelopment;

// Log current configuration
console.log('🔧 API Configuration:', {
  mode: isDevelopment ? 'LOCAL DEVELOPMENT' : 'PRODUCTION',
  baseUrl: isDevelopment ? LOCAL_BASE_URL : 'Production URLs',
  endpoints: Object.keys(apiConfig).length
});
