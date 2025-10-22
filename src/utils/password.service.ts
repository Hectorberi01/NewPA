import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class PasswordService {
  
  static async hashPassword(password: string): Promise<string> {
    const saltRounds = 10;
    return await bcrypt.hash(password, saltRounds);
  }

  static async comparePasswords(plainPassword: string, hashedPassword: string): Promise<boolean> {
    console.log("Comparing passwords:", plainPassword, hashedPassword);
    return await bcrypt.compare(plainPassword, hashedPassword);
  }

  static generateTemporaryPassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    
    return password;
  }

  static generateResetToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }
}