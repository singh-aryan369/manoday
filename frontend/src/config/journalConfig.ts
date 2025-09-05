export const journalConfig = {
  api: {
    baseUrl: process.env.REACT_APP_JOURNAL_API_URL || 'https://us-central1-smart-surf-469908-n0.cloudfunctions.net/journal'
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
