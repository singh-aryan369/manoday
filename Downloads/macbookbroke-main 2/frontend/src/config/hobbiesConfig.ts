// Configuration for Hobbies and Wanderlust Module

const isDevelopment = process.env.NODE_ENV === 'development' || window.location.hostname === 'localhost';

const LOCAL_BASE_URL = 'http://localhost:5001/YOUR_PROJECT_ID/us-central1';
const PRODUCTION_BASE_URL = 'https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net';

export const hobbiesConfig = {
  // API Endpoints
  api: {
    baseUrl: isDevelopment ? LOCAL_BASE_URL : PRODUCTION_BASE_URL,
    submitSurvey: isDevelopment ? `${LOCAL_BASE_URL}/hobbies/survey/submit` : `${PRODUCTION_BASE_URL}/hobbies/survey/submit`,
    getSuggestions: isDevelopment ? `${LOCAL_BASE_URL}/hobbies/suggest` : `${PRODUCTION_BASE_URL}/hobbies/suggest`,
    updateProgress: isDevelopment ? `${LOCAL_BASE_URL}/hobbies/update_progress` : `${PRODUCTION_BASE_URL}/hobbies/update_progress`,
    getUserProfile: isDevelopment ? `${LOCAL_BASE_URL}/hobbies/profile` : `${PRODUCTION_BASE_URL}/hobbies/profile`,
    getAllHobbies: isDevelopment ? `${LOCAL_BASE_URL}/hobbies/all` : `${PRODUCTION_BASE_URL}/hobbies/all`,
    getHobbyById: (hobbyId: string) => isDevelopment ? `${LOCAL_BASE_URL}/hobbies/${hobbyId}` : `${PRODUCTION_BASE_URL}/hobbies/${hobbyId}`
  },

  // UI Configuration
  ui: {
    cardsPerPage: 9,
    nearbyRadius: 5000, // 5km
    maxNearbyResults: 10
  },

  // Credits and WRI Rules
  rewards: {
    session: {
      wri_reduction: 3,
      credits_spent: 20,
      label: 'Hobby Session',
      icon: '🎯'
    },
    offline_class: {
      wri_reduction: 5,
      credits_spent: 25,
      label: 'Offline Class Visit',
      icon: '🏫'
    },
    online_course: {
      wri_reduction: 2,
      credits_spent: 15,
      label: 'Online Course',
      icon: '💻'
    }
  },

  // Initial credits for new users
  initialCredits: 100
};

