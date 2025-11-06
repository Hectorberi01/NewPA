import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { authMiddleware } from '../middleware/auth.middleware';
import * as validator from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';
import passport from 'passport';
import { AuthService } from '../services/auth.service';
import * as dotenv from 'dotenv';
const { body } = validator;
const router = Router();
const authController = new AuthController();
const { loginWithGoogleOrAzure } = require('../services/auth.service');
dotenv.config();

const FRONTEND_URL = process.env.FRONTEND_URL!;
const validateForgotPassword = [
  body('email').isEmail().withMessage('Invalid email format'),
  handleValidationErrors
];

const validateResetPassword = [
  body('token').notEmpty().withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('New password must contain at least one lowercase, one uppercase and one digit'),
  handleValidationErrors
];

const validateRefreshToken = [
  body('refreshToken').notEmpty().withMessage('Refresh token is required'),
  handleValidationErrors
];

const validateOAuthToken = [
  body('token').notEmpty().withMessage('OAuth token is required'),
  handleValidationErrors
];


router.post('/forgot-password', validateForgotPassword, 
  authController.forgotPassword.bind(authController));

router.post('/reset-password', validateResetPassword, 
  authController.resetPassword.bind(authController));

router.post('/refresh', validateRefreshToken, 
  authController.refreshToken.bind(authController));

router.post('/oauth/microsoft', validateOAuthToken, 
  authController.microsoftOAuth.bind(authController));

router.get(
  '/google',
  passport.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
  })
);  

router.get(
  '/google/callback',
  passport.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    session: false
  }),
  async (req, res) => {
    try {
      console.log('✅ Authentication successful');

      const authService = new AuthService();
      const user = req.user as any;

      // Générer les tokens JWT
      const authResponse = await authService.formatAuthResponse(user);

      // Encoder les données pour les passer dans l'URL
      const encodedData = Buffer.from(JSON.stringify(authResponse)).toString('base64');

      // Rediriger vers le frontend avec les tokens
      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?data=${encodedData}`);
    } catch (error) {
      console.error('❌ Error in callback:', error);
      res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
  }
);

// Routes de vérification et informations utilisateur
router.get('/verify', authMiddleware, 
  authController.verifyToken.bind(authController));

router.get('/me', authMiddleware, 
  authController.getCurrentUser.bind(authController));

// Route de déconnexion
router.post('/logout', authMiddleware, 
  authController.logout.bind(authController));

router.post('/login', 
  body('email').isEmail().withMessage('Invalid email format'),
  body('password').notEmpty().withMessage('Password is required'),
  handleValidationErrors,
  authController.login.bind(authController)
);

router.post('/register', 
  body('email').isEmail().withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase, one uppercase and one digit'),
  body('firstName').notEmpty().withMessage('First name is required'),
  body('lastName').notEmpty().withMessage('Last name is required'),

  handleValidationErrors,
  authController.registerTeacher.bind(authController)
);
export default router;