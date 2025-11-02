// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development' || 
                     process.env.REACT_APP_DEVELOPMENT_MODE === 'true' ||
                     window.location.hostname === 'localhost';

export const meditationConfig = {
  api: {
    baseUrl: isDevelopment 
      ? 'http://localhost:5001/YOUR_PROJECT_ID/us-central1/meditation'
      : 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/meditation'
  },
  points: {
    videoPoints: 5,
    soundPoints: 3,
    maxPointsPerDay: 16,
    streakBonusDays: 7,
    streakWRIReduction: 10
  },
  ui: {
    videosPerPage: 12,
    soundsPerPage: 20,
    thumbnailSize: 'medium',
    autoPlayEnabled: false,
    volumeDefault: 0.7
  },
  storage: {
    meditationVideosCollection: 'meditation_videos',
    meditationSoundsCollection: 'meditation_sounds',
    bucketName: 'meditation-bucket-container'
  }
};
