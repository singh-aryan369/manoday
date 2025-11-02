/**
 * Google Calendar API Integration for Goal Reminders
 * 
 * Setup Instructions:
 * 1. Go to Google Cloud Console: https://console.cloud.google.com/
 * 2. Create or select your project
 * 3. Enable Google Calendar API
 * 4. Create credentials (OAuth 2.0 Client ID for Web application)
 * 5. Add authorized JavaScript origins: http://localhost:3000, your production domain
 * 6. Add authorized redirect URIs: http://localhost:3000, your production domain
 * 7. Copy the Client ID and add it to your .env file as REACT_APP_GOOGLE_CALENDAR_CLIENT_ID
 * 
 * Environment Variables:
 * - REACT_APP_GOOGLE_CALENDAR_CLIENT_ID=your_client_id_here
 * - REACT_APP_GOOGLE_CALENDAR_API_KEY=your_api_key_here (optional, for API quota management)
 */

import { GoalTask } from './DailyGoalsService';

// Google API configuration
const GOOGLE_CLIENT_ID = process.env.REACT_APP_GOOGLE_CALENDAR_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const GOOGLE_API_KEY = process.env.REACT_APP_GOOGLE_CALENDAR_API_KEY || 'YOUR_GOOGLE_API_KEY';
const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar.events';
const CALENDAR_API_BASE = 'https://www.googleapis.com/calendar/v3';
// Note: Not using discovery docs due to 403 errors with unverified apps
// Using direct REST API calls instead

// Global Google API client
declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

let gapiInitialized = false;
let tokenClient: any = null;

/**
 * Load Google API client library
 */
export const loadGoogleAPI = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (gapiInitialized) {
      resolve();
      return;
    }

    // Load Google Identity Services for OAuth (this is all we need)
    // We'll use direct REST API calls instead of discovery docs
    if (window.google && window.google.accounts) {
      console.log('✅ Google Identity Services already loaded');
      gapiInitialized = true;
      resolve();
      return;
    }

    const gisScript = document.createElement('script');
    gisScript.src = 'https://accounts.google.com/gsi/client';
    gisScript.onload = () => {
      console.log('✅ Google Identity Services loaded');
      gapiInitialized = true;
      resolve();
    };
    gisScript.onerror = () => {
      reject(new Error('Failed to load Google Identity Services script'));
    };
    document.body.appendChild(gisScript);
  });
};

/**
 * Authenticate user with Google
 */
export const authenticateGoogleCalendar = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (!GOOGLE_CLIENT_ID) {
      reject(new Error('Google Calendar Client ID not configured. Please add REACT_APP_GOOGLE_CALENDAR_CLIENT_ID to your .env file'));
      return;
    }

    if (!window.google) {
      reject(new Error('Google Identity Services not loaded. Please refresh the page.'));
      return;
    }

    // Wait a bit for GIS to fully initialize
    setTimeout(() => {
      try {
        console.log('🔐 Initializing Google Calendar OAuth...');
        console.log('🔐 Client ID:', GOOGLE_CLIENT_ID ? 'Set' : 'Missing');
        console.log('🔐 Scopes:', CALENDAR_SCOPES);
        
        tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: CALENDAR_SCOPES,
          callback: (response: any) => {
            console.log('🔐 OAuth callback received:', {
              hasAccessToken: !!response.access_token,
              hasError: !!response.error,
              error: response.error,
              scope: response.scope
            });
            
            if (response.error) {
              console.error('❌ Google Calendar authentication failed:', response);
              if (response.error === 'popup_closed_by_user') {
                reject(new Error('Authentication cancelled. If you see a warning page, click "Go to Manoday-dev (unsafe)" or "Continue" to proceed.'));
              } else if (response.error === 'access_denied') {
                reject(new Error('Calendar access denied. Please grant permissions when prompted.'));
              } else {
                reject(new Error(`Authentication error: ${response.error}. If you see an unverified app warning, click "Continue" to proceed.`));
              }
            } else if (response.access_token) {
              // Calculate expiry time
              const expiresAt = Date.now() / 1000 + (response.expires_in || 3600);
              
              // Store token in localStorage
              const tokenData = {
                access_token: response.access_token,
                expires_at: expiresAt,
                expires_in: response.expires_in,
                scope: response.scope,
                token_type: response.token_type || 'Bearer'
              };
              
              storeToken(tokenData);
              
              console.log('✅ Google Calendar authenticated successfully');
              console.log('✅ Token stored:', {
                hasAccessToken: !!response.access_token,
                expiresIn: response.expires_in,
                expiresAt: new Date(expiresAt * 1000).toISOString(),
                scope: response.scope,
                tokenType: response.token_type
              });
              
              resolve();
            } else {
              reject(new Error('No access token received from Google OAuth. Please try again.'));
            }
          },
        });

        console.log('🔐 Requesting access token...');
        // Request access token - this will open popup
        // User will see warning page - they need to click "Continue" or "Go to Manoday-dev (unsafe)"
        tokenClient.requestAccessToken({ prompt: '' });
      } catch (error: any) {
        console.error('❌ Error initializing token client:', error);
        reject(new Error(`Failed to initialize Google Calendar authentication: ${error.message || 'Unknown error'}`));
      }
    }, 500);
  });
};

/**
 * Check if user is authenticated with Google Calendar
 */
export const isGoogleCalendarAuthenticated = (): boolean => {
  try {
    // Check if Google Identity Services is loaded
    if (!window.google || !window.google.accounts) {
      return false;
    }
    
    // Get token from localStorage or session
    // Google Identity Services stores tokens in cookies/localStorage
    const token = getStoredToken();
    
    if (!token || !token.access_token) {
      return false;
    }
    
    // Check if expired
    if (token.expires_at && token.expires_at < Date.now() / 1000) {
      clearStoredToken();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking authentication:', error);
    return false;
  }
};

// Helper function to get stored token
function getStoredToken(): any {
  try {
    const tokenStr = localStorage.getItem('google_calendar_token');
    if (tokenStr) {
      return JSON.parse(tokenStr);
    }
  } catch (error) {
    console.warn('⚠️ Error reading stored token:', error);
  }
  return null;
}

// Helper function to store token
function storeToken(token: any): void {
  try {
    localStorage.setItem('google_calendar_token', JSON.stringify(token));
  } catch (error) {
    console.warn('⚠️ Error storing token:', error);
  }
}

// Helper function to clear stored token
function clearStoredToken(): void {
  try {
    localStorage.removeItem('google_calendar_token');
  } catch (error) {
    console.warn('⚠️ Error clearing stored token:', error);
  }
}

/**
 * Check authentication status and restore if token exists
 * Call this on page load to restore connection state
 */
export const checkAndRestoreCalendarConnection = async (): Promise<boolean> => {
  try {
    await loadGoogleAPI();
    
    // Check if we already have a token stored in localStorage
    const token = getStoredToken();
    if (token && token.access_token) {
      // Check if expired
      if (token.expires_at && token.expires_at < Date.now() / 1000) {
        clearStoredToken();
        console.log('⚠️ Stored token expired');
        return false;
      }
      console.log('✅ Google Calendar connection restored (token found)');
      return true;
    }
    
    return false;
  } catch (error) {
    console.warn('❌ Error checking calendar connection:', error);
    return false;
  }
};

/**
 * Sign out from Google Calendar
 */
export const signOutGoogleCalendar = (): void => {
  const token = getStoredToken();
  if (token && token.access_token) {
    window.google.accounts.oauth2.revoke(token.access_token, () => {
      console.log('✅ Google Calendar access revoked');
    });
    clearStoredToken();
  }
};

/**
 * Create a calendar event for a goal reminder
 */
export const createGoalReminder = async (
  goal: GoalTask,
  reminderTime: Date,
  userEmail: string
): Promise<string> => {
  try {
    console.log('📅 Creating calendar reminder:', {
      goal: goal.title,
      reminderTime: reminderTime.toISOString()
    });
    
    // Check authentication
    if (!isGoogleCalendarAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar. Please connect your account first.');
    }
    
    // Get token from localStorage
    const token = getStoredToken();
    if (!token || !token.access_token) {
      throw new Error('No access token found. Please reconnect your calendar.');
    }
    
    // Check if token expired
    if (token.expires_at && token.expires_at < Date.now() / 1000) {
      clearStoredToken();
      throw new Error('Calendar token expired. Please reconnect your calendar.');
    }
    
    const accessToken = token.access_token;
    console.log('✅ Token verified, proceeding with event creation');
    
    // Ensure Google Identity Services is loaded
    if (!gapiInitialized) {
      await loadGoogleAPI();
    }
    
    console.log('✅ Using access_token for REST API call');

    const event = {
      summary: `🎯 ${goal.title}`,
      description: `${goal.description}\n\n📊 WRI Reduction: ${goal.wri_reduction || 0} points\n🏆 XP Reward: ${goal.xp} points\n⏱️ Duration: ${goal.duration || 'Flexible'}\n\n✨ ${goal.flavor || 'Complete this goal to boost your wellness score!'}`,
      start: {
        dateTime: reminderTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(reminderTime.getTime() + 15 * 60 * 1000).toISOString(), // 15 minutes default
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },      // 10 min before: popup notification
          { method: 'email', minutes: 30 },      // 30 min before: email reminder
          { method: 'email', minutes: 0 },      // EXACT TIME: email reminder at reminder time
        ],
      },
      colorId: '9', // Blue color for wellness goals
      extendedProperties: {
        private: {
          goalId: goal.id,
          userEmail: userEmail,
          wriReduction: String(goal.wri_reduction || 0),
          goalCategory: goal.category,
        },
      },
    };

    console.log('📅 Event data:', {
      summary: event.summary,
      start: event.start.dateTime,
      end: event.end.dateTime,
      reminders: event.reminders
    });

    // Use REST API directly instead of gapi.client.calendar
    const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Calendar API error:', {
        status: response.status,
        statusText: response.statusText,
        error: errorData
      });
      
      if (response.status === 401) {
        clearStoredToken();
        throw new Error('Calendar authentication expired. Please reconnect your calendar.');
      } else if (response.status === 403) {
        throw new Error('Calendar access denied. Please grant calendar permissions.');
      } else if (response.status === 404) {
        throw new Error('Calendar not found. Please check your Google account.');
      } else {
        throw new Error(`Calendar API error: ${response.statusText} (${response.status})`);
      }
    }

    const result = await response.json();
    
    if (result && result.id) {
      console.log('✅ Calendar event created successfully:', {
        eventId: result.id,
        summary: result.summary,
        start: result.start?.dateTime,
        htmlLink: result.htmlLink
      });
      return result.id;
    } else {
      console.error('❌ Invalid response from Calendar API:', result);
      throw new Error('Calendar API returned invalid response');
    }
  } catch (error: any) {
    console.error('❌ Error creating calendar event:', error);
    console.error('❌ Error details:', {
      message: error.message,
      status: error.status,
      statusText: error.statusText,
      error: error.error,
      code: error.code,
      fullError: error
    });
    
    if (error.status === 401) {
      throw new Error('Calendar authentication expired. Please reconnect your calendar.');
    } else if (error.status === 403) {
      throw new Error('Calendar access denied. Please grant calendar permissions.');
    } else if (error.status === 404) {
      throw new Error('Calendar not found. Please check your Google account.');
    } else if (error.message?.includes('token')) {
      throw new Error('Invalid calendar token. Please reconnect your calendar.');
    } else {
      throw new Error(`Failed to create calendar reminder: ${error.message || error.error?.message || 'Unknown error'}`);
    }
  }
};

/**
 * Update an existing calendar event
 */
export const updateGoalReminder = async (
  eventId: string,
  goal: GoalTask,
  newReminderTime: Date
): Promise<void> => {
  try {
    if (!isGoogleCalendarAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    const event = {
      summary: `🎯 ${goal.title}`,
      description: `${goal.description}\n\n📊 WRI Reduction: ${goal.wri_reduction || 0} points\n🏆 XP Reward: ${goal.xp} points\n⏱️ Duration: ${goal.duration || 'Flexible'}`,
      start: {
        dateTime: newReminderTime.toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      end: {
        dateTime: new Date(newReminderTime.getTime() + 15 * 60 * 1000).toISOString(),
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      },
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 10 },      // 10 min before: popup notification
          { method: 'email', minutes: 30 },      // 30 min before: email reminder
          { method: 'email', minutes: 0 },      // EXACT TIME: email reminder at reminder time
        ],
      },
    };

    // Get access token
    const token = getStoredToken();
    if (!token || !token.access_token) {
      throw new Error('No access token found. Please reconnect your calendar.');
    }

    // Use REST API directly
    const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Calendar API error: ${response.statusText} (${response.status})`);
    }

    console.log('✅ Calendar event updated:', eventId);
  } catch (error: any) {
    console.error('❌ Error updating calendar event:', error);
    throw new Error(`Failed to update calendar reminder: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Delete a calendar event
 */
export const deleteGoalReminder = async (eventId: string): Promise<void> => {
  try {
    if (!isGoogleCalendarAuthenticated()) {
      throw new Error('Not authenticated with Google Calendar');
    }

    // Get access token
    const token = getStoredToken();
    if (!token || !token.access_token) {
      throw new Error('No access token found. Please reconnect your calendar.');
    }

    // Use REST API directly
    const response = await fetch(`${CALENDAR_API_BASE}/calendars/primary/events/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token.access_token}`,
      },
    });

    if (!response.ok && response.status !== 404) {
      // 404 is OK - event might already be deleted
      const errorData = await response.json().catch(() => ({}));
      throw new Error(`Calendar API error: ${response.statusText} (${response.status})`);
    }

    console.log('✅ Calendar event deleted:', eventId);
  } catch (error: any) {
    console.error('❌ Error deleting calendar event:', error);
    throw new Error(`Failed to delete calendar reminder: ${error.message || 'Unknown error'}`);
  }
};

/**
 * Get recommended reminder time based on goal's recommended_time
 */
export const getRecommendedReminderTime = (goal: GoalTask): Date => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const recommendedTime = goal.recommended_time || 'morning';

  // Set default times based on recommendation
  switch (recommendedTime) {
    case 'morning':
      tomorrow.setHours(8, 0, 0, 0);
      break;
    case 'afternoon':
      tomorrow.setHours(14, 0, 0, 0);
      break;
    case 'evening':
      tomorrow.setHours(18, 0, 0, 0);
      break;
    case 'night':
      tomorrow.setHours(21, 0, 0, 0);
      break;
    case 'weekend_morning':
      // Find next Saturday
      const daysUntilSaturday = (6 - tomorrow.getDay() + 7) % 7 || 7;
      tomorrow.setDate(tomorrow.getDate() + daysUntilSaturday);
      tomorrow.setHours(9, 0, 0, 0);
      break;
    case 'weekend':
      const daysUntilWeekend = (6 - tomorrow.getDay() + 7) % 7 || 7;
      tomorrow.setDate(tomorrow.getDate() + daysUntilWeekend);
      tomorrow.setHours(14, 0, 0, 0);
      break;
    case 'sunday':
    case 'sunday_evening':
      const daysUntilSunday = (7 - tomorrow.getDay()) % 7 || 7;
      tomorrow.setDate(tomorrow.getDate() + daysUntilSunday);
      tomorrow.setHours(recommendedTime === 'sunday_evening' ? 19 : 14, 0, 0, 0);
      break;
    case 'throughout_day':
    default:
      tomorrow.setHours(10, 0, 0, 0);
      break;
  }

  return tomorrow;
};

