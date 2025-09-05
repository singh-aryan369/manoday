// Configuration for Professional Help functionality
export const config = {
  // API Configuration
  api: {
    baseUrl: process.env.REACT_APP_API_BASE_URL || 'https://us-central1-smart-surf-469908-n0.cloudfunctions.net'
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
