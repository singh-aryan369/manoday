// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.REACT_APP_DEVELOPMENT_MODE === 'true' ||
                     window.location.hostname === 'localhost';

export const journalConfig = {
  api: {
    baseUrl: isDevelopment 
      ? 'http://localhost:5001/YOUR_PROJECT_ID/us-central1/journal'
      : 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/journal'
  },
  ui: {
    maxTitleLength: 100,
    maxContentLength: 10000,
    autoSaveInterval: 30000, // 30 seconds
    paginationLimit: 10
  },
  validation: {
    minTitleLength: 1,
    minContentLength: 1,
    maxTitleLength: 100,
    maxContentLength: 10000
  },
  storage: {
    collectionName: 'journals',
    encryptionEnabled: true
  },
  features: {
    autoSave: true,
    draftMode: true,
    searchEnabled: true,
    exportEnabled: true
  }
};
