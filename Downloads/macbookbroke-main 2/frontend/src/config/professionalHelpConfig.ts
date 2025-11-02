// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.REACT_APP_DEVELOPMENT_MODE === 'true' ||
                     window.location.hostname === 'localhost';

// Configuration for Professional Help functionality
export const config = {
  // API Configuration
  api: {
    baseUrl: isDevelopment 
      ? 'http://localhost:5001/YOUR_PROJECT_ID/us-central1/professionalhelp'
      : 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/professionalHelp'
  },

  // Google Maps Configuration (handled by backend)
  googleMaps: {
    defaultRadius: 50000, // 50km in meters
    maxResults: 20
  },

  // Default search parameters
  search: {
    defaultRadius: 50, // kilometers
    maxResults: 20,
    fallbackRadius: 100 // kilometers for fallback search
  },

  // UI Configuration
  ui: {
    enableLocationPermission: true,
    showDistance: true,
    showSpecialties: true,
    enableCallButton: true,
    enableWebsiteButton: true
  },

  // Fallback configuration
  fallback: {
    enableFallbackHelplines: true,
    showNationalHelplines: true,
    enableGooglePlacesFallback: false // Set to true if you want to use Google Places as fallback
  }
};
