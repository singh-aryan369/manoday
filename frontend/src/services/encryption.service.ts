/**
 * Frontend Encryption Service
 * Provides client-side encryption/decryption for wellness data
 * Uses Web Crypto API for secure encryption
 */

export class FrontendEncryptionService {
  private static readonly ALGORITHM = 'AES-GCM';
  private static readonly KEY_LENGTH = 256;
  private static readonly IV_LENGTH = 12; // 96 bits for GCM

  /**
   * Generate encryption key from user email
   * Uses PBKDF2 to derive a secure key
   */
  private static async deriveKey(userEmail: string): Promise<CryptoKey> {
    const salt = 'manoday-wellness-salt-2024'; // Should match backend
    const encoder = new TextEncoder();
    
    // Import password as key material
    const passwordKey = await crypto.subtle.importKey(
      'raw',
      encoder.encode(userEmail + salt),
      'PBKDF2',
      false,
      ['deriveBits', 'deriveKey']
    );

    // Derive AES-GCM key
    return crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: encoder.encode(salt),
        iterations: 100000,
        hash: 'SHA-256'
      },
      passwordKey,
      {
        name: this.ALGORITHM,
        length: this.KEY_LENGTH
      },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Encrypt wellness data
   * Returns encrypted data and IV for storage
   */
  static async encryptWellnessData(data: any, userEmail: string): Promise<{ encryptedData: string; iv: string }> {
    try {
      const key = await this.deriveKey(userEmail);
      const iv = crypto.getRandomValues(new Uint8Array(this.IV_LENGTH));
      
      const encodedData = new TextEncoder().encode(JSON.stringify(data));
      
      const encryptedBuffer = await crypto.subtle.encrypt(
        {
          name: this.ALGORITHM,
          iv: iv,
          additionalData: new TextEncoder().encode(userEmail)
        },
        key,
        encodedData
      );

      return {
        encryptedData: this.arrayBufferToHex(encryptedBuffer),
        iv: this.uint8ArrayToHex(iv)
      };
    } catch (error) {
      console.error('Frontend encryption error:', error);
      throw new Error('Failed to encrypt wellness data');
    }
  }

  /**
   * Decrypt wellness data
   * Verifies data integrity using authentication tag
   */
  static async decryptWellnessData(encryptedData: string, iv: string, userEmail: string): Promise<any> {
    try {
      const key = await this.deriveKey(userEmail);
      const ivBuffer = this.hexToArrayBuffer(iv);
      const encryptedBuffer = this.hexToArrayBuffer(encryptedData);

      const decryptedBuffer = await crypto.subtle.decrypt(
        {
          name: this.ALGORITHM,
          iv: ivBuffer,
          additionalData: new TextEncoder().encode(userEmail)
        },
        key,
        encryptedBuffer
      );

      const decryptedText = new TextDecoder().decode(decryptedBuffer);
      return JSON.parse(decryptedText);
    } catch (error) {
      console.error('Frontend decryption error:', error);
      throw new Error('Failed to decrypt wellness data');
    }
  }

  /**
   * Convert ArrayBuffer to hex string
   */
  private static arrayBufferToHex(buffer: ArrayBuffer): string {
    const uint8Array = new Uint8Array(buffer);
    return Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert Uint8Array to hex string
   */
  private static uint8ArrayToHex(uint8Array: Uint8Array): string {
    return Array.from(uint8Array)
      .map(byte => byte.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Convert hex string to ArrayBuffer
   */
  private static hexToArrayBuffer(hex: string): ArrayBuffer {
    const uint8Array = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
      uint8Array[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return uint8Array.buffer;
  }

  /**
   * Verify if encryption is supported in this browser
   */
  static isSupported(): boolean {
    return typeof crypto !== 'undefined' && 
           typeof crypto.subtle !== 'undefined' && 
           typeof crypto.getRandomValues !== 'undefined';
  }
}
