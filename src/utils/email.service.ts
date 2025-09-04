import nodemailer from 'nodemailer';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }

  async sendAccountCreationEmail(email: string, firstName: string, tempPassword: string) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Compte créé - Gestionnaire de Projets Étudiants',
      html: `
        <h2>Bienvenue ${firstName}!</h2>
        <p>Votre compte étudiant a été créé.</p>
        <p><strong>Email:</strong> ${email}</p>
        <p><strong>Mot de passe temporaire:</strong> ${tempPassword}</p>
        <p>Veuillez vous connecter et changer votre mot de passe dès que possible.</p>
        <p><a href="${process.env.FRONTEND_URL}/login">Se connecter</a></p>
      `,
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendProjectNotificationEmail(email: string, projectName: string, projectDescription: string) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: `Nouveau projet disponible: ${projectName}`,
      html: `
        <h2>Nouveau projet: ${projectName}</h2>
        <p>${projectDescription}</p>
        <p><a href="${process.env.FRONTEND_URL}/projects">Voir le projet</a></p>
      `,
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendDeliverableReminderEmail(email: string, deliverableName: string, deadline: Date) {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: `Rappel: Livrable "${deliverableName}" à rendre`,
      html: `
        <h2>Rappel de livrable</h2>
        <p>Le livrable "${deliverableName}" doit être rendu avant le ${deadline.toLocaleDateString('fr-FR')}.</p>
        <p><a href="${process.env.FRONTEND_URL}/deliverables">Voir les livrables</a></p>
      `,
    };

    return await this.transporter.sendMail(mailOptions);
  }

  async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Bienvenue sur la plateforme de gestion de projets étudiants',
      html: `
        <h2>Bienvenue ${firstName}!</h2>
        <p>Votre compte a été créé avec succès.</p>
        <p>Vous pouvez maintenant accéder à la plateforme et commencer à gérer vos projets étudiants.</p>
        <p><a href="${process.env.FRONTEND_URL}/login">Se connecter</a></p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordChangedEmail(email: string, firstName: string): Promise<void> {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Mot de passe modifié',
      html: `
        <h2>Mot de passe modifié</h2>
        <p>Bonjour ${firstName},</p>
        <p>Votre mot de passe a été modifié avec succès.</p>
        <p>Si vous n'êtes pas à l'origine de cette modification, contactez immédiatement l'administrateur.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetEmail(email: string, firstName: string, resetToken: string): Promise<void> {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Réinitialisation de mot de passe',
      html: `
        <h2>Réinitialisation de mot de passe</h2>
        <p>Bonjour ${firstName},</p>
        <p>Vous avez demandé une réinitialisation de votre mot de passe.</p>
        <p>Cliquez sur le lien suivant pour définir un nouveau mot de passe :</p>
        <p><a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}">Réinitialiser mon mot de passe</a></p>
        <p>Ce lien expirera dans 1 heure.</p>
        <p>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.</p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

  async sendPasswordResetConfirmationEmail(email: string, firstName: string): Promise<void> {
    const mailOptions = {
      from: process.env.FROM_EMAIL || 'noreply@example.com',
      to: email,
      subject: 'Mot de passe réinitialisé',
      html: `
        <h2>Mot de passe réinitialisé</h2>
        <p>Bonjour ${firstName},</p>
        <p>Votre mot de passe a été réinitialisé avec succès.</p>
        <p>Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        <p><a href="${process.env.FRONTEND_URL}/login">Se connecter</a></p>
      `,
    };

    await this.transporter.sendMail(mailOptions);
  }

}