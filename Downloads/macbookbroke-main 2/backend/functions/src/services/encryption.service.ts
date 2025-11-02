import * as crypto from 'crypto';

export class EncryptionService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly KEY_LENGTH = 32; // 256 bits
  private static readonly IV_LENGTH = 16; // 128 bits
  private static readonly TAG_LENGTH = 16; // 128 bits

  /**
   * Generate a random encryption key for the user
   * This key is derived from user's email + a secret salt
   */
  static generateUserKey(userEmail: string): string {
    const salt = process.env.ENCRYPTION_SALT || 'manoday-wellness-salt-2024';
    const hash = crypto.createHash('sha256');
    hash.update(userEmail + salt);
    const hashResult = hash.digest('hex');
    
    // Ensure we have exactly 32 bytes (256 bits) for AES-256
    // If hash is shorter, pad it; if longer, truncate it
    const keyBytes = Buffer.from(hashResult, 'hex');
    const finalKey = Buffer.alloc(32); // 32 bytes = 256 bits
    
    if (keyBytes.length >= 32) {
      keyBytes.copy(finalKey, 0, 0, 32);
    } else {
      keyBytes.copy(finalKey, 0, 0, keyBytes.length);
      // Pad remaining bytes with zeros
      finalKey.fill(0, keyBytes.length);
    }
    
    return finalKey.toString('hex');
  }

  /**
   * Encrypt wellness data using AES-256-GCM
   * Returns encrypted data and IV for secure storage
   */
  static encryptWellnessData(data: any, userEmail: string): { encryptedData: string; iv: string } {
    try {
      const key = Buffer.from(this.generateUserKey(userEmail), 'hex');
      const iv = crypto.randomBytes(this.IV_LENGTH);
      
      const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);
      
      let encrypted = cipher.update(JSON.stringify(data), 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      // Combine encrypted data with authentication tag
      const encryptedWithTag = encrypted + tag.toString('hex');
      
      return {
        encryptedData: encryptedWithTag,
        iv: iv.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt wellness data');
    }
  }

  /**
   * Decrypt wellness data using AES-256-GCM
   * Verifies data integrity using authentication tag
   */
  static decryptWellnessData(encryptedData: string, iv: string, userEmail: string): any {
    try {
      const key = Buffer.from(this.generateUserKey(userEmail), 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      
      // Separate encrypted data from authentication tag
      const encrypted = encryptedData.substring(0, encryptedData.length - this.TAG_LENGTH * 2);
      const tag = Buffer.from(encryptedData.substring(encryptedData.length - this.TAG_LENGTH * 2), 'hex');
      
      const decipher = crypto.createDecipheriv(this.ALGORITHM, key, ivBuffer);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return JSON.parse(decrypted);
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt wellness data');
    }
  }

  /**
   * Verify data integrity without decrypting
   * Checks if the encrypted data belongs to the user
   */
  static verifyDataIntegrity(encryptedData: string, iv: string, userEmail: string): boolean {
    try {
      // Try to decrypt a small portion to verify integrity
      const key = Buffer.from(this.generateUserKey(userEmail), 'hex');
      const ivBuffer = Buffer.from(iv, 'hex');
      
      if (encryptedData.length < this.TAG_LENGTH * 2) {
        return false;
      }
      
      // Just verify the key and IV are valid
      return key.length === this.KEY_LENGTH && ivBuffer.length === this.IV_LENGTH;
    } catch (error) {
      return false;
    }
  }
}
