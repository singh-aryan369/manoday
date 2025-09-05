/**
 * Client-Side Encryption Service
 * Uses user password + Gmail ID for key derivation
 * Password NEVER reaches the server - stays in browser only
 */

export interface EncryptedData {
  encryptedData: string;
  iv: string;
  salt: string;
}

export class ClientEncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly SALT_LENGTH = 16; // 128 bits
  private static readonly ITERATIONS = 100000;

  /**
   * Derive encryption key from user password + Gmail ID
   * This happens entirely in the browser - server never sees the password
   */
  private static async deriveKey(userEmail: string, userPassword: string, salt?: Uint8Array): Promise<{ key: CryptoKey; salt: Uint8Array }> {
    // Combine Gmail ID with user password for stronger security
    const password = userEmail + userPassword;
    
    // Use provided salt or generate a new one
    const saltBytes = salt || crypto.getRandomValues(new Uint8Array(this.SALT_LENGTH));
    
    // Import the password as a key
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    // Derive the actual encryption key using PBKDF2
    const key = await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: saltBytes,
        iterations: this.ITERATIONS,
        hash: 'SHA-256'
      },
      passwordKey,
      { name: this.ALGORITHM, length: this.KEY_LENGTH },
      false,
      ['encrypt', 'decrypt']
    );

    return { key, salt: saltBytes };
  }

  /**
   * Encrypt data using user password + Gmail ID
   * Returns encrypted data, IV, and salt for storage
   */
  static async encryptData(
    data: string, 
    userEmail: string, 
    userPassword: string
  ): Promise<EncryptedData> {
    try {
      // Derive key from password + Gmail ID (generates new salt)
      const { key, salt } = await this.deriveKey(userEmail, userPassword);
      
      // Generate random IV
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      // Encrypt the data
      const encryptedData = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        new TextEncoder().encode(data)
      );

      // Convert to base64 for storage
      const encryptedArray = new Uint8Array(encryptedData);
      const encryptedBase64 = btoa(String.fromCharCode(...encryptedArray));
      const ivBase64 = btoa(String.fromCharCode(...iv));
      const saltBase64 = btoa(String.fromCharCode(...salt));

      return {
        encryptedData: encryptedBase64,
        iv: ivBase64,
        salt: saltBase64
      };
    } catch (error) {
      console.error('Client encryption error:', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt data using user password + Gmail ID
   * Requires the same password used for encryption
   */
  static async decryptData(
    encryptedData: EncryptedData,
    userEmail: string,
    userPassword: string
  ): Promise<string> {
    try {
      // Convert salt from base64 to Uint8Array
      const saltBytes = new Uint8Array(
        atob(encryptedData.salt).split('').map(char => char.charCodeAt(0))
      );
      
      // Derive the same key using password + Gmail ID + stored salt
      const { key } = await this.deriveKey(userEmail, userPassword, saltBytes);
      
      // Convert from base64
      const encryptedArray = new Uint8Array(
        atob(encryptedData.encryptedData).split('').map(char => char.charCodeAt(0))
      );
      const iv = new Uint8Array(
        atob(encryptedData.iv).split('').map(char => char.charCodeAt(0))
      );

      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: iv
        },
        key,
        encryptedArray
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      console.error('Client decryption error:', error);
      throw new Error('Failed to decrypt data - wrong password?');
    }
  }


  /**
   * Verify if a password is correct for a user
   * This is done by attempting to decrypt a known piece of data
   */
  static async verifyPassword(
    userEmail: string,
    userPassword: string,
    testEncryptedData: EncryptedData
  ): Promise<boolean> {
    try {
      await this.decryptData(testEncryptedData, userEmail, userPassword);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Generate a test encrypted data for password verification
   * This can be stored to verify passwords later
   */
  static async generateTestData(
    userEmail: string,
    userPassword: string
  ): Promise<EncryptedData> {
    const testData = "password_verification_test";
    return await this.encryptData(testData, userEmail, userPassword);
  }

  /**
   * Decrypt old format data (server-side encrypted) using client-side method
   * This is for backward compatibility with journals created before the password system
   */
  static async decryptOldFormatData(encryptedData: string, iv: string, userEmail: string): Promise<string> {
    try {
      console.log('🔐 ClientEncryptionService: Starting old format decryption');

      // For old format, we use the email as the key (same as server-side method)
      const combinedSecret = userEmail;
      
      // Use a fixed salt for old format (same as server-side)
      const salt = new Uint8Array(16).fill(0); // Fixed salt for old format

      const passwordKey = await crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(combinedSecret),
        'PBKDF2',
        false,
        ['deriveKey']
      );

      const key = await crypto.subtle.deriveKey(
        {
          name: 'PBKDF2',
          salt: salt,
          iterations: 100000, // Same as server-side
          hash: 'SHA-256'
        },
        passwordKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
      );

      // Convert IV from hex string to Uint8Array
      const ivBytes = new Uint8Array(iv.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

      // Convert encrypted data from hex string to Uint8Array
      const encryptedBytes = new Uint8Array(encryptedData.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));

      // Decrypt the data
      const decryptedData = await crypto.subtle.decrypt(
        {
          name: 'aes-256-gcm',
          iv: ivBytes
        },
        key,
        encryptedBytes
      );

      const decryptedText = new TextDecoder().decode(decryptedData);
      console.log('🔐 ClientEncryptionService: Old format decryption successful');

      return decryptedText;
    } catch (error) {
      console.error('🔐 ClientEncryptionService: Old format decryption failed:', error);
      throw new Error('Failed to decrypt old format data');
    }
  }
}
