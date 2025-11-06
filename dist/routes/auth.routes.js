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
const express_1 = require("express");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validator = __importStar(require("express-validator"));
const validation_middleware_1 = require("../middleware/validation.middleware");
const passport_1 = __importDefault(require("passport"));
const auth_service_1 = require("../services/auth.service");
const dotenv = __importStar(require("dotenv"));
const { body } = validator;
const router = (0, express_1.Router)();
const authController = new auth_controller_1.AuthController();
const { loginWithGoogleOrAzure } = require('../services/auth.service');
dotenv.config();
const FRONTEND_URL = process.env.FRONTEND_URL;
const validateForgotPassword = [
    body('email').isEmail().withMessage('Invalid email format'),
    validation_middleware_1.handleValidationErrors
];
const validateResetPassword = [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('newPassword')
        .isLength({ min: 8 })
        .withMessage('New password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
        .withMessage('New password must contain at least one lowercase, one uppercase and one digit'),
    validation_middleware_1.handleValidationErrors
];
const validateRefreshToken = [
    body('refreshToken').notEmpty().withMessage('Refresh token is required'),
    validation_middleware_1.handleValidationErrors
];
const validateOAuthToken = [
    body('token').notEmpty().withMessage('OAuth token is required'),
    validation_middleware_1.handleValidationErrors
];
router.post('/forgot-password', validateForgotPassword, authController.forgotPassword.bind(authController));
router.post('/reset-password', validateResetPassword, authController.resetPassword.bind(authController));
router.post('/refresh', validateRefreshToken, authController.refreshToken.bind(authController));
router.post('/oauth/microsoft', validateOAuthToken, authController.microsoftOAuth.bind(authController));
router.get('/google', passport_1.default.authenticate('google', {
    scope: ['profile', 'email'],
    accessType: 'offline',
    prompt: 'consent'
}));
router.get('/google/callback', passport_1.default.authenticate('google', {
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=auth_failed`,
    session: false
}), async (req, res) => {
    try {
        console.log('✅ Authentication successful');
        const authService = new auth_service_1.AuthService();
        const user = req.user;
        // Générer les tokens JWT
        const authResponse = await authService.formatAuthResponse(user);
        // Encoder les données pour les passer dans l'URL
        const encodedData = Buffer.from(JSON.stringify(authResponse)).toString('base64');
        // Rediriger vers le frontend avec les tokens
        res.redirect(`${process.env.FRONTEND_URL}/auth/callback?data=${encodedData}`);
    }
    catch (error) {
        console.error('❌ Error in callback:', error);
        res.redirect(`${process.env.FRONTEND_URL}/login?error=server_error`);
    }
});
// Routes de vérification et informations utilisateur
router.get('/verify', auth_middleware_1.authMiddleware, authController.verifyToken.bind(authController));
router.get('/me', auth_middleware_1.authMiddleware, authController.getCurrentUser.bind(authController));
// Route de déconnexion
router.post('/logout', auth_middleware_1.authMiddleware, authController.logout.bind(authController));
router.post('/login', body('email').isEmail().withMessage('Invalid email format'), body('password').notEmpty().withMessage('Password is required'), validation_middleware_1.handleValidationErrors, authController.login.bind(authController));
router.post('/register', body('email').isEmail().withMessage('Invalid email format'), body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain at least one lowercase, one uppercase and one digit'), body('firstName').notEmpty().withMessage('First name is required'), body('lastName').notEmpty().withMessage('Last name is required'), validation_middleware_1.handleValidationErrors, authController.registerTeacher.bind(authController));
exports.default = router;
