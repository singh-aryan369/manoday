/**
 * Secure Password Storage Service
 * Stores passwords in memory only, with additional security measures
 */

export class SecurePasswordStorage {
  private static passwordCache = new Map<string, string>();
  private static sessionTimeout = 30 * 60 * 1000; // 30 minutes
  private static sessionTimers = new Map<string, NodeJS.Timeout>();

  /**
   * Store password securely in memory
   * Password is automatically cleared after session timeout
   */
  static storePassword(userEmail: string, password: string): void {
    // Clear any existing timer for this user
    const existingTimer = this.sessionTimers.get(userEmail);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Store password in memory
    this.passwordCache.set(userEmail, password);

    // Set auto-clear timer
    const timer = setTimeout(() => {
      this.clearPassword(userEmail);
      console.log('🔒 Password automatically cleared due to session timeout');
    }, this.sessionTimeout);

    this.sessionTimers.set(userEmail, timer);

    console.log('🔒 Password stored securely in memory (will auto-clear in 30 minutes)');
  }

  /**
   * Retrieve password from memory
   */
  static getPassword(userEmail: string): string | null {
    return this.passwordCache.get(userEmail) || null;
  }

  /**
   * Clear password from memory
   */
  static clearPassword(userEmail: string): void {
    this.passwordCache.delete(userEmail);
    
    const timer = this.sessionTimers.get(userEmail);
    if (timer) {
      clearTimeout(timer);
      this.sessionTimers.delete(userEmail);
    }

    console.log('🔒 Password cleared from memory');
  }

  /**
   * Clear all passwords (for logout)
   */
  static clearAllPasswords(): void {
    this.passwordCache.clear();
    
    // Clear all timers
    this.sessionTimers.forEach(timer => clearTimeout(timer));
    this.sessionTimers.clear();

    console.log('🔒 All passwords cleared from memory');
  }

  /**
   * Check if password exists for user
   */
  static hasPassword(userEmail: string): boolean {
    return this.passwordCache.has(userEmail);
  }

  /**
   * Extend session timeout for user
   */
  static extendSession(userEmail: string): void {
    if (this.passwordCache.has(userEmail)) {
      // Clear existing timer
      const existingTimer = this.sessionTimers.get(userEmail);
      if (existingTimer) {
        clearTimeout(existingTimer);
      }

      // Set new timer
      const timer = setTimeout(() => {
        this.clearPassword(userEmail);
        console.log('🔒 Password automatically cleared due to session timeout');
      }, this.sessionTimeout);

      this.sessionTimers.set(userEmail, timer);
    }
  }

  /**
   * Get security status
   */
  static getSecurityStatus(): {
    hasPasswords: boolean;
    activeSessions: number;
    sessionTimeout: number;
  } {
    return {
      hasPasswords: this.passwordCache.size > 0,
      activeSessions: this.passwordCache.size,
      sessionTimeout: this.sessionTimeout
    };
  }
}
