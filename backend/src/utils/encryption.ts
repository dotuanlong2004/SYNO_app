import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // Standard for GCM
const AUTH_TAG_LENGTH = 16;

/**
 * Utility để mã hóa và giải mã dữ liệu nhạy cảm (như API Keys).
 * Yêu cầu biến môi trường ENCRYPTION_KEY phải có độ dài 32 ký tự.
 */
export class EncryptionUtils {
  private static getSecretKey(): Buffer {
    const key = process.env.ENCRYPTION_KEY;
    if (!key) {
      throw new Error('ENCRYPTION_KEY is not defined in environment variables');
    }
    if (key.length !== 32) {
      throw new Error('ENCRYPTION_KEY must be exactly 32 characters long');
    }
    return Buffer.from(key, 'utf8');
  }

  /**
   * Mã hóa text thành chuỗi base64 chứa: iv:authTag:encryptedData
   */
  static encrypt(text: string): string {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, this.getSecretKey(), iv);
    
    let encrypted = cipher.update(text, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag().toString('base64');
    
    return `${iv.toString('base64')}:${authTag}:${encrypted}`;
  }

  /**
   * Giải mã chuỗi base64 định dạng iv:authTag:encryptedData
   */
  static decrypt(encryptedText: string): string {
    const [ivBase64, authTagBase64, dataBase64] = encryptedText.split(':');
    
    if (!ivBase64 || !authTagBase64 || !dataBase64) {
      throw new Error('Invalid encrypted text format');
    }

    const iv = Buffer.from(ivBase64, 'base64');
    const authTag = Buffer.from(authTagBase64, 'base64');
    const encryptedData = Buffer.from(dataBase64, 'base64');
    
    const decipher = crypto.createDecipheriv(ALGORITHM, this.getSecretKey(), iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encryptedData, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}