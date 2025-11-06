"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const node_mailjet_1 = __importDefault(require("node-mailjet"));
class EmailService {
    constructor() {
        this.mailjet = new node_mailjet_1.default({
            apiKey: process.env.MJ_APIKEY_PUBLIC,
            apiSecret: process.env.MJ_APIKEY_PRIVATE,
        });
    }
    async sendMail(to, subject, html, text) {
        try {
            // Vérifier que les clés API sont présentes
            if (!process.env.MJ_APIKEY_PUBLIC || !process.env.MJ_APIKEY_PRIVATE) {
                throw new Error("Les clés API Mailjet ne sont pas configurées");
            }
            if (!process.env.MAIL_FROM) {
                throw new Error("L'adresse email d'envoi n'est pas configurée");
            }
            console.log("📧 Tentative d'envoi d'email à:", to);
            console.log("📧 Sujet:", subject);
            const response = await this.mailjet
                .post("send", { version: "v3.1" })
                .request({
                Messages: [
                    {
                        From: {
                            Email: process.env.MAIL_FROM,
                            Name: "Student Manager",
                        },
                        To: [{ Email: to }],
                        Subject: subject,
                        TextPart: text || "",
                        HTMLPart: html,
                    },
                ],
            });
            console.log("✅ Email envoyé avec succès à", to);
            console.log("✅ Réponse Mailjet:", JSON.stringify(response.body, null, 2));
            return response;
        }
        catch (error) {
            console.error("❌ Erreur complète d'envoi d'email:", {
                message: error.message,
                statusCode: error.statusCode,
                errorMessage: error.ErrorMessage,
                response: error.response?.text || error.response?.body,
                stack: error.stack
            });
            throw error; // Propager l'erreur pour que l'appelant puisse la gérer
        }
    }
    async sendAccountCreationEmail(email, firstName, tempPassword) {
        console.log("Envoi de l'email de création de compte à:", email);
        const subject = "Compte créé - Gestionnaire de Projets Étudiants";
        const html = `
      <h2>Bienvenue ${firstName}!</h2>
      <p>Votre compte étudiant a été créé.</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Mot de passe temporaire:</strong> ${tempPassword}</p>
      <p>Veuillez vous connecter et changer votre mot de passe dès que possible.</p>
      <p><a href="${process.env.FRONTEND_URL}/login">Se connecter</a></p>
    `;
        await this.sendMail(email, subject, html);
    }
    async sendProjectNotificationEmail(email, projectName, projectDescription) {
        const subject = `Nouveau projet disponible: ${projectName}`;
        const html = `
      <h2>Nouveau projet: ${projectName}</h2>
      <p>${projectDescription}</p>
      <p><a href="${process.env.FRONTEND_URL}/projects">Voir le projet</a></p>
    `;
        await this.sendMail(email, subject, html);
    }
    async sendDeliverableReminderEmail(email, deliverableName, deadline) {
        const subject = `Rappel: Livrable "${deliverableName}" à rendre`;
        const html = `
      <h2>Rappel de livrable</h2>
      <p>Le livrable "${deliverableName}" doit être rendu avant le ${deadline.toLocaleDateString("fr-FR")}.</p>
      <p><a href="${process.env.FRONTEND_URL}/deliverables">Voir les livrables</a></p>
    `;
        await this.sendMail(email, subject, html);
    }
    async sendWelcomeEmail(email, firstName) {
        const subject = "Bienvenue sur la plateforme de gestion de projets étudiants";
        const html = `
      <h2>Bienvenue ${firstName}!</h2>
      <p>Votre compte a été créé avec succès.</p>
      <p>Vous pouvez maintenant accéder à la plateforme et commencer à gérer vos projets étudiants.</p>
      <p><a href="${process.env.FRONTEND_URL}/login">Se connecter</a></p>
    `;
        await this.sendMail(email, subject, html);
    }
    async sendPasswordChangedEmail(email, firstName) {
        const subject = "Mot de passe modifié";
        const html = `
      <h2>Mot de passe modifié</h2>
      <p>Bonjour ${firstName},</p>
      <p>Votre mot de passe a été modifié avec succès.</p>
      <p>Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement l'administrateur.</p>
    `;
        await this.sendMail(email, subject, html);
    }
    async sendPasswordResetEmail(email, firstName, resetToken) {
        const subject = "Réinitialisation de mot de passe";
        const html = `
      <h2>Réinitialisation de mot de passe</h2>
      <p>Bonjour ${firstName},</p>
      <p>Vous avez demandé une réinitialisation de votre mot de passe.</p>
      <p>Cliquez sur le lien suivant pour définir un nouveau mot de passe :</p>
      <p><a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">Réinitialiser mon mot de passe</a></p>
      <p>Ce lien expirera dans 1 heure.</p>
      <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
    `;
        await this.sendMail(email, subject, html);
    }
    async sendPasswordResetConfirmationEmail(email, firstName) {
        const subject = "Mot de passe réinitialisé";
        const html = `
      <h2>Mot de passe réinitialisé</h2>
      <p>Bonjour ${firstName},</p>
      <p>Votre mot de passe a été réinitialisé avec succès.</p>
      <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
      <p><a href="${process.env.FRONTEND_URL}/login">Se connecter</a></p>
    `;
        await this.sendMail(email, subject, html);
    }
    async sendProjectVisibleEmail(to, firstName, projectName) {
        const subject = "Nouveau projet disponible";
        const html = `
      <p>Bonjour ${firstName || "étudiant"},</p>
      <p>Un nouveau projet <b>${projectName}</b> est désormais disponible dans votre espace étudiant.</p>
      <p>Connectez-vous pour le consulter.</p>
    `;
        await this.sendMail(to, subject, html);
    }
}
exports.EmailService = EmailService;
