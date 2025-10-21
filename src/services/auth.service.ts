import jwt from 'jsonwebtoken';
import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { User } from '../entities/Entities';
import { PasswordService } from '../utils/password.service';
import { EmailService } from '../utils/email.service';
import { OAuth2Client, TokenPayload } from 'google-auth-library';
import * as dotenv from 'dotenv';
import { Profile } from 'passport-google-oauth20';
import { UserService } from './user.service';
dotenv.config();

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export interface LoginResult {
  user: Omit<User, 'password'>;
  token: string;
  refreshToken?: string;
}

export interface RegisterData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: 'teacher' | 'student';
}

export interface GoogleUserData {
  id: string;
  email: string;
  given_name: string;
  family_name: string;
  picture?: string;
}

export interface MicrosoftUserData {
  id: string;
  mail: string;
  givenName: string;
  surname: string;
}

interface GoogleProfile {
  id: string;
  emails?: Array<{ value: string; verified: boolean }>;
  displayName: string;
  name?: {
    givenName?: string;
    familyName?: string;
  };
  photos?: Array<{ value: string }>;
}

export class AuthService {

  private userRepository: Repository<User>;
  private emailService: EmailService;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.emailService = new EmailService();
  }

  /**
   * Connexion par email/mot de passe
   */
  async login(email: string, password: string): Promise<LoginResult> {
    // Récupérer l'utilisateur avec son mot de passe
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.email = :email', { email })
      .getOne();

    if (!user || !user.isActive) {
      throw new Error('Invalid credentials');
    }

    // Vérifier le mot de passe
    if (!user.password) {
      throw new Error('Password not set for this user');
    }

    const isPasswordValid = await PasswordService.comparePasswords(password, user.password);
    if (!isPasswordValid) {
      throw new Error('Invalid credentials');
    }

    // Mettre à jour la dernière connexion
    //await this.updateLastLogin(user.id);

    // Générer les tokens
    const token = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    // Ne pas renvoyer le mot de passe
    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      refreshToken
    };
  }

  /**
   * Inscription d'un enseignant
   */
  async registerTeacher(registerData: RegisterData): Promise<LoginResult> {
    // Vérifier si l'utilisateur existe déjà
    const existingUser = await this.userRepository.findOne({
      where: { email: registerData.email }
    });

    if (existingUser) {
      throw new Error('User already exists');
    }

    // Hacher le mot de passe
    const hashedPassword = await PasswordService.hashPassword(registerData.password);

    // Créer l'utilisateur
    const user = this.userRepository.create({
      email: registerData.email,
      password: hashedPassword,
      firstName: registerData.firstName,
      lastName: registerData.lastName,
      role: 'teacher' // Les enseignants peuvent s'inscrire directement
    });

    const savedUser = await this.userRepository.save(user);

    // Envoyer un email de bienvenue
    //await this.emailService.sendWelcomeEmail(savedUser.email, savedUser.firstName);

    // Générer les tokens
    const token = this.generateAccessToken(savedUser);
    const refreshToken = this.generateRefreshToken(savedUser);

    const { password: _, ...userWithoutPassword } = savedUser;

    return {
      user: userWithoutPassword,
      token,
      refreshToken
    };
  }

  /**
   * Authentification Google OAuth
   */
  async authenticateWithGoogle(googleToken: string): Promise<LoginResult> {
    // Vérifier le token Google
    const googleUserData = await this.verifyGoogleToken(googleToken);

    let user = await this.userRepository.findOne({
      where: { email: googleUserData.email }
    });

    if (!user) {
      // Créer un nouvel utilisateur
      user = this.userRepository.create({
        email: googleUserData.email,
        firstName: googleUserData.given_name,
        lastName: googleUserData.family_name,
        role: 'teacher',
        googleId: googleUserData.id,
        isActive: true,
        password : "DefaultPassword123!"
      });

      user = await this.userRepository.save(user);

      // Envoyer un email de bienvenue
      //await this.emailService.sendWelcomeEmail(user.email, user.firstName);
    } else {
      // Associer le compte Google si ce n'est pas déjà fait
      if (!user.googleId) {
        user.googleId = googleUserData.id;
        await this.userRepository.save(user);
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Mettre à jour la dernière connexion
      //await this.updateLastLogin(user.id);
    }

    // Générer les tokens
    const token = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      refreshToken
    };
  }

  /**
   * Authentification Microsoft OAuth
   */
  async authenticateWithMicrosoft(microsoftToken: string): Promise<LoginResult> {
    // Vérifier le token Microsoft
    const microsoftUserData = await this.verifyMicrosoftToken(microsoftToken);

    let user = await this.userRepository.findOne({
      where: { email: microsoftUserData.mail }
    });

    if (!user) {
      // Créer un nouvel utilisateur
      user = this.userRepository.create({
        email: microsoftUserData.mail,
        firstName: microsoftUserData.givenName,
        lastName: microsoftUserData.surname,
        role: 'teacher',
        microsoftId: microsoftUserData.id,
        isActive: true
      });

      user = await this.userRepository.save(user);

      // Envoyer un email de bienvenue
      //await this.emailService.sendWelcomeEmail(user.email, user.firstName);
    } else {
      // Associer le compte Microsoft si ce n'est pas déjà fait
      if (!user.microsoftId) {
        user.microsoftId = microsoftUserData.id;
        await this.userRepository.save(user);
      }

      if (!user.isActive) {
        throw new Error('Account is deactivated');
      }

      // Mettre à jour la dernière connexion
      //await this.updateLastLogin(user.id);
    }

    // Générer les tokens
    const token = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    const { password: _, ...userWithoutPassword } = user;

    return {
      user: userWithoutPassword,
      token,
      refreshToken
    };
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(userId: number, currentPassword: string, newPassword: string): Promise<void> {
    const user = await this.userRepository
      .createQueryBuilder('user')
      .addSelect('user.password')
      .where('user.id = :id', { id: userId })
      .getOne();

    if (!user) {
      throw new Error('User not found');
    }

    // Vérifier le mot de passe actuel (sauf si l'utilisateur n'en a pas - OAuth)
    if (user.password) {
      const isCurrentPasswordValid = await PasswordService.comparePasswords(
        currentPassword,
        user.password
      );

      if (!isCurrentPasswordValid) {
        throw new Error('Current password is incorrect');
      }
    }

    // Hacher le nouveau mot de passe
    const hashedNewPassword = await PasswordService.hashPassword(newPassword);

    // Mettre à jour le mot de passe
    await this.userRepository.update(userId, { password: hashedNewPassword });

    // Envoyer un email de confirmation
    //await this.emailService.sendPasswordChangedEmail(user.email, user.firstName);
  }

  /**
   * Demander une réinitialisation de mot de passe
   */
  async requestPasswordReset(email: string): Promise<void> {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user || !user.isActive) {
      // Ne pas révéler si l'utilisateur existe ou non
      return;
    }

    // Générer un token de réinitialisation
    const resetToken = PasswordService.generateResetToken();
    const resetTokenExpiry = new Date();
    resetTokenExpiry.setHours(resetTokenExpiry.getHours() + 1); // Expire dans 1 heure

    // Sauvegarder le token (vous devrez ajouter ces champs à l'entité User)
    await this.userRepository.update(user.id, {
      resetToken,
      resetTokenExpiry
    });

    // Envoyer l'email de réinitialisation
    // await this.emailService.sendPasswordResetEmail(
    //   user.email,
    //   user.firstName,
    //   resetToken
    // );
  }

  /**
   * Réinitialiser le mot de passe
   */
  async resetPassword(resetToken: string, newPassword: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { resetToken }
    });

    if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
      throw new Error('Invalid or expired reset token');
    }

    // Hacher le nouveau mot de passe
    const hashedPassword = await PasswordService.hashPassword(newPassword);

    // Mettre à jour le mot de passe et supprimer le token
    await this.userRepository.update(user.id, {
      password: hashedPassword,
      resetToken: '',
      resetTokenExpiry: ''
    });

    // Envoyer un email de confirmation
    // await this.emailService.sendPasswordResetConfirmationEmail(
    //   user.email,
    //   user.firstName
    // );
  }

  /**
   * Rafraîchir le token d'accès
   */
  async refreshAccessToken(refreshToken: string): Promise<{ token: string; refreshToken: string }> {
    try {
      const decoded = jwt.verify(
        refreshToken,
        process.env.JWT_REFRESH_SECRET || 'refresh_secret'
      ) as any;

      const user = await this.userRepository.findOne({
        where: { id: decoded.id, isActive: true }
      });

      if (!user) {
        throw new Error('User not found or inactive');
      }

      // Générer de nouveaux tokens
      const newAccessToken = this.generateAccessToken(user);
      const newRefreshToken = this.generateRefreshToken(user);

      return {
        token: newAccessToken,
        refreshToken: newRefreshToken
      };
    } catch (error) {
      throw new Error('Invalid refresh token');
    }
  }

  /**
   * Déconnexion (invalider le token)
   */
  async logout(userId: number): Promise<void> {
    // Mettre à jour la dernière déconnexion
   

    // Dans une implémentation complète, vous pourriez maintenir une blacklist des tokens
    // ou utiliser Redis pour gérer les tokens invalides
  }

  /**
   * Vérifier si un token est valide
   */
  async verifyToken(token: string): Promise<User | null> {
    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default_secret'
      ) as any;

      const user = await this.userRepository.findOne({
        where: { id: decoded.id, isActive: true }
      });

      return user;
    } catch (error) {
      return null;
    }
  }

  /**
   * Obtenir les informations de l'utilisateur depuis le token
   */
  async getUserFromToken(token: string): Promise<User | null> {
    const user = await this.verifyToken(token);
    // if (user) {
    //   // Mettre à jour la dernière activité
    //   await this.updateLastActivity(user.id);
    // }
    return user;
  }

  // ===== MÉTHODES PRIVÉES =====

  /**
   * Générer un token d'accès
   */
  private generateAccessToken(user: User): string {
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    return jwt.sign(
      payload,
      process.env.JWT_SECRET || 'default_secret',
      { expiresIn: process.env.JWT_EXPIRES_IN || '1h' } as jwt.SignOptions
    );
  }

  /**
   * Générer un token de rafraîchissement
   */
  private generateRefreshToken(user: User): string {
    const payload = {
      id: user.id,
      type: 'refresh'
    };

    return jwt.sign(
      payload,
      process.env.JWT_REFRESH_SECRET || 'refresh_secret',
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' } as jwt.SignOptions
    );
  }



  /**
   * Vérifier un token Google
   */
  private async verifyGoogleToken(idToken: string): Promise<GoogleUserData> {
    // Dans un environnement réel, utilisez la bibliothèque Google Auth Library
    // const { OAuth2Client } = require('google-auth-library');
    // const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
    
    // Pour cet exemple, simulation de la vérification
    // En production, remplacez par une vraie vérification Google
    // try {
    //   const response = await fetch(`https://www.googleapis.com/oauth2/v1/userinfo?access_token=${token}`);
    //   if (!response.ok) {
    //     throw new Error('Invalid Google token');
    //   }
      
    //   const userData = await response.json();
    //   return {
    //     id: userData.id,
    //     email: userData.email,
    //     given_name: userData.given_name,
    //     family_name: userData.family_name,
    //     picture: userData.picture
    //   };
    // } catch (error) {
    //   throw new Error('Failed to verify Google token');
    // }

      const ticket = await client.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID, // vérifie "aud"
    });

    const payload = ticket.getPayload();
    if (!payload) throw new Error('Invalid Google token');

    // Garde-fous utiles
    const issOk =
      payload.iss === 'accounts.google.com' ||
      payload.iss === 'https://accounts.google.com';
    if (!issOk) throw new Error('Invalid issuer');

    if (!payload.email || !payload.email_verified) {
      throw new Error('Email not verified by Google');
    }

    return {
      id: payload.sub,                    // identifiant Google
      email: payload.email,
      given_name: payload.given_name,
      family_name: payload.family_name,
      picture: payload.picture,
    };
  }

  /**
   * Vérifier un token Microsoft
   */
  private async verifyMicrosoftToken(token: string): Promise<MicrosoftUserData> {
    // En production, utilisez Microsoft Graph API pour vérifier le token
    try {
      const response = await fetch('https://graph.microsoft.com/v1.0/me', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Invalid Microsoft token');
      }

      const userData = await response.json();
      return {
        id: userData.id,
        mail: userData.mail || userData.userPrincipalName,
        givenName: userData.givenName,
        surname: userData.surname
      };
    } catch (error) {
      throw new Error('Failed to verify Microsoft token');
    }
  }

  async loginWithGoogleOrAzure(email: string) {
    try {
      const user = await this.userRepository.findOne({
        where: { email: email }
      });
      if (!user) {
        return { status: 401, data: { error: 'Email ou mot de passe invalide' } };
      }

         // Supprimer le champ password
      delete user.password;
      const token = jwt.sign({ user: user }, process.env.JWT_REFRESH_SECRET, { expiresIn: '1h' });
          return { status: 200, data: { token, user } };  
    } catch (err: any) {  
      return { status: 401, data: { error: 'Email ou mot de passe invalide' } };
    }
  }

  static async findOrCreateGoogleUser(profile: GoogleProfile) {
    const email = profile.emails?.[0]?.value;
    const userService = new UserService();
    if (!email) {
      throw new Error('Email not provided by Google');
    }

    // Chercher si l'utilisateur existe déjà
     let user = await userService.findByEmail(email);


    if (!user) {
      return ;
    } 

    return user;
  }

  

  async formatAuthResponse(user: any) {
    const { password, ...userWithoutPassword } = user;

    const token =  this.generateAccessToken(user);
    const refreshToken =  this.generateRefreshToken(user);

    return {
      user: userWithoutPassword,
      token,
      refreshToken
    };
  }


  /**
   * Mettre à jour la dernière connexion
   */
//   private async updateLastLogin(userId: number): Promise<void> {
//     await this.userRepository.update(userId, {
//       lastLogin: new Date()
//     });
//   }

  /**
   * Mettre à jour la dernière activité
   */
//   private async updateLastActivity(userId: number): Promise<void> {
//     await this.userRepository.update(userId, {
//       lastActivity: new Date()
//     });
//   }
}