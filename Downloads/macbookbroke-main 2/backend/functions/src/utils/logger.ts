// Simple logger utility for backend functions
export const logger = {
  info: (message: string, data?: any) => {
    console.log(`[INFO] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : '');
  },
  
  warn: (message: string, data?: any) => {
    console.warn(`[WARN] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : '');
  },
  
  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${new Date().toISOString()} - ${message}`, error ? JSON.stringify(error) : '');
  },
  
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV === 'development') {
      console.debug(`[DEBUG] ${new Date().toISOString()} - ${message}`, data ? JSON.stringify(data) : '');
    }
  }
};
