"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
const password_service_1 = require("../utils/password.service");
const email_service_1 = require("../utils/email.service");
const google_auth_library_1 = require("google-auth-library");
const dotenv = __importStar(require("dotenv"));
dotenv.config();
const client = new google_auth_library_1.OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const TOKEN_CONFIG = {
    access: {
        secret: process.env.JWT_SECRET || 'default_secret',
        expiresIn: process.env.JWT_EXPIRES_IN || '15m' // Réduit à 15 minutes pour plus de sécurité
    },
    refresh: {
        secret: process.env.JWT_REFRESH_SECRET || 'refresh_secret',
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d'
    }
};
class AuthService {
    constructor() {
        this.userRepository = data_source_1.AppDataSource.getRepository(Entities_1.User);
        this.emailService = new email_service_1.EmailService();
    }
    /**
     * Connexion par email/mot de passe
     */
    async login(email, password) {
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
        const isPasswordValid = await password_service_1.PasswordService.comparePasswords(password, user.password);
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
    async registerTeacher(registerData) {
        // Vérifier si l'utilisateur existe déjà
        const existingUser = await this.userRepository.findOne({
            where: { email: registerData.email }
        });
        if (existingUser) {
            throw new Error('User already exists');
        }
        // Hacher le mot de passe
        const hashedPassword = await password_service_1.PasswordService.hashPassword(registerData.password);
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
    async authenticateWithGoogle(googleToken) {
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
                role: 'teacher', // Par défaut, les nouveaux utilisateurs OAuth sont des enseignants
                googleId: googleUserData.id,
                isActive: true,
                password: "DefaultPassword123!" // Mot de passe par défaut (à changer après la première connexion)
            });
            user = await this.userRepository.save(user);
            // Envoyer un email de bienvenue
            //await this.emailService.sendWelcomeEmail(user.email, user.firstName);
        }
        else {
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
    async authenticateWithMicrosoft(microsoftToken) {
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
        }
        else {
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
    async changePassword(userId, currentPassword, newPassword) {
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
            const isCurrentPasswordValid = await password_service_1.PasswordService.comparePasswords(currentPassword, user.password);
            if (!isCurrentPasswordValid) {
                throw new Error('Current password is incorrect');
            }
        }
        // Hacher le nouveau mot de passe
        const hashedNewPassword = await password_service_1.PasswordService.hashPassword(newPassword);
        // Mettre à jour le mot de passe
        await this.userRepository.update(userId, { password: hashedNewPassword });
        // Envoyer un email de confirmation
        //await this.emailService.sendPasswordChangedEmail(user.email, user.firstName);
    }
    /**
     * Demander une réinitialisation de mot de passe
     */
    async requestPasswordReset(email) {
        const user = await this.userRepository.findOne({ where: { email } });
        if (!user || !user.isActive) {
            // Ne pas révéler si l'utilisateur existe ou non
            return;
        }
        // Générer un token de réinitialisation
        const resetToken = password_service_1.PasswordService.generateResetToken();
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
    async resetPassword(resetToken, newPassword) {
        const user = await this.userRepository.findOne({
            where: { resetToken }
        });
        if (!user || !user.resetTokenExpiry || new Date() > user.resetTokenExpiry) {
            throw new Error('Invalid or expired reset token');
        }
        // Hacher le nouveau mot de passe
        const hashedPassword = await password_service_1.PasswordService.hashPassword(newPassword);
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
    async refreshAccessToken(refreshToken) {
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, process.env.JWT_REFRESH_SECRET || 'refresh_secret');
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
        }
        catch (error) {
            throw new Error('Invalid refresh token');
        }
    }
    /**
     * Déconnexion (invalider le token)
     */
    async logout(userId) {
        // Mettre à jour la dernière déconnexion
        // Dans une implémentation complète, vous pourriez maintenir une blacklist des tokens
        // ou utiliser Redis pour gérer les tokens invalides
    }
    /**
     * Vérifier si un token est valide
     */
    async verifyToken(token) {
        try {
            const decoded = jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'default_secret');
            const user = await this.userRepository.findOne({
                where: { id: decoded.id, isActive: true }
            });
            return user;
        }
        catch (error) {
            return null;
        }
    }
    /**
     * Obtenir les informations de l'utilisateur depuis le token
     */
    async getUserFromToken(token) {
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
    generateAccessToken(user) {
        const payload = {
            id: user.id,
            email: user.email,
            role: user.role
        };
        return jsonwebtoken_1.default.sign(payload, process.env.JWT_SECRET || 'default_secret', { expiresIn: process.env.JWT_EXPIRES_IN || '1h' });
    }
    /**
     * Générer un token de rafraîchissement
     */
    generateRefreshToken(user) {
        const payload = {
            id: user.id,
            type: 'refresh'
        };
        return jsonwebtoken_1.default.sign(payload, process.env.JWT_REFRESH_SECRET || 'refresh_secret', { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' });
    }
    /**
     * Vérifier un token Google
     */
    async verifyGoogleToken(idToken) {
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
        if (!payload)
            throw new Error('Invalid Google token');
        // Garde-fous utiles
        const issOk = payload.iss === 'accounts.google.com' ||
            payload.iss === 'https://accounts.google.com';
        if (!issOk)
            throw new Error('Invalid issuer');
        if (!payload.email || !payload.email_verified) {
            throw new Error('Email not verified by Google');
        }
        return {
            id: payload.sub, // identifiant Google
            email: payload.email,
            given_name: payload.given_name,
            family_name: payload.family_name,
            picture: payload.picture,
        };
    }
    /**
     * Vérifier un token Microsoft
     */
    async verifyMicrosoftToken(token) {
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
        }
        catch (error) {
            throw new Error('Failed to verify Microsoft token');
        }
    }
}
exports.AuthService = AuthService;
