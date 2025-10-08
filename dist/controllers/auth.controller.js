"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const auth_service_1 = require("../services/auth.service");
class AuthController {
    constructor() {
        this.authService = new auth_service_1.AuthService();
    }
    /**
     * @swagger
     * /api/auth/login:
     *   post:
     *     summary: User login
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/LoginRequest'
     *     responses:
     *       200:
     *         description: Login successful
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LoginResponse'
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     */
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await this.authService.login(email, password);
            res.json(result);
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    }
    /**
     * @swagger
     * /api/auth/logout:
     *   post:
     *     summary: User logout
     *     tags: [Authentication]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Logout successful
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     */
    async logout(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            await this.authService.logout(userId);
            res.json({ message: 'Logout successful' });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * @swagger
     * /api/auth/register:
     *   post:
     *     summary: Teacher registration
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/RegisterRequest'
     *     responses:
     *       201:
     *         description: Registration successful
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LoginResponse'
     *       409:
     *         description: User already exists
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    async registerTeacher(req, res) {
        try {
            const { email, password, firstName, lastName } = req.body;
            const result = await this.authService.registerTeacher({
                email,
                password,
                firstName,
                lastName
            });
            res.status(201).json(result);
        }
        catch (error) {
            const status = error === 'User already exists' ? 409 : 400;
            res.status(status).json({ error: 'Invalid request data' });
        }
    }
    /**
     * @swagger
     * /api/auth/oauth/google:
     *   post:
     *     summary: Google OAuth login
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [token]
     *             properties:
     *               token:
     *                 type: string
     *                 description: Google access token
     *     responses:
     *       200:
     *         description: OAuth login successful
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LoginResponse'
     */
    async googleOAuth(req, res) {
        try {
            const { token } = req.body;
            const result = await this.authService.authenticateWithGoogle(token);
            res.json(result);
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    }
    /**
     * @swagger
     * /api/auth/oauth/microsoft:
     *   post:
     *     summary: Microsoft OAuth login
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [token]
     *             properties:
     *               token:
     *                 type: string
     *                 description: Microsoft access token
     *     responses:
     *       200:
     *         description: OAuth login successful
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LoginResponse'
     */
    async microsoftOAuth(req, res) {
        try {
            const { token } = req.body;
            const result = await this.authService.authenticateWithMicrosoft(token);
            res.json(result);
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    }
    /**
     * @swagger
     * /api/auth/change-password:
     *   post:
     *     summary: Change user password
     *     tags: [Authentication]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [currentPassword, newPassword]
     *             properties:
     *               currentPassword:
     *                 type: string
     *               newPassword:
     *                 type: string
     *                 minLength: 8
     *     responses:
     *       200:
     *         description: Password changed successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     */
    async changePassword(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const { currentPassword, newPassword } = req.body;
            await this.authService.changePassword(userId, currentPassword, newPassword);
            res.json({ message: 'Password changed successfully' });
        }
        catch (error) {
            const status = error === 'Current password is incorrect' ? 400 : 500;
            res.status(status).json({ error: 'Current password is incorrect' });
        }
    }
    /**
     * @swagger
     * /api/auth/forgot-password:
     *   post:
     *     summary: Request password reset
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [email]
     *             properties:
     *               email:
     *                 type: string
     *                 format: email
     *     responses:
     *       200:
     *         description: Password reset email sent (if email exists)
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     */
    async forgotPassword(req, res) {
        try {
            const { email } = req.body;
            await this.authService.requestPasswordReset(email);
            // Toujours renvoyer le même message pour éviter l'énumération d'emails
            res.json({
                message: 'If an account with this email exists, a password reset link has been sent.'
            });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
    /**
     * @swagger
     * /api/auth/reset-password:
     *   post:
     *     summary: Reset password with token
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [token, newPassword]
     *             properties:
     *               token:
     *                 type: string
     *                 description: Password reset token
     *               newPassword:
     *                 type: string
     *                 minLength: 8
     *     responses:
     *       200:
     *         description: Password reset successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       400:
     *         description: Invalid or expired token
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    async resetPassword(req, res) {
        try {
            const { token, newPassword } = req.body;
            await this.authService.resetPassword(token, newPassword);
            res.json({ message: 'Password reset successfully' });
        }
        catch (error) {
            res.status(400).json({ error: 'Invalid or expired token' });
        }
    }
    /**
     * @swagger
     * /api/auth/refresh:
     *   post:
     *     summary: Refresh access token
     *     tags: [Authentication]
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [refreshToken]
     *             properties:
     *               refreshToken:
     *                 type: string
     *     responses:
     *       200:
     *         description: New access token generated
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/LoginResponse'
     *       401:
     *         description: Invalid or expired refresh token
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    async refreshToken(req, res) {
        try {
            const { refreshToken } = req.body;
            const result = await this.authService.refreshAccessToken(refreshToken);
            res.json(result);
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    }
    /**
     * @swagger
     * /api/auth/verify:
     *   get:
     *     summary: Verify access token validity
     *     tags: [Authentication]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Token is valid
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *       401:
     *         description: Invalid or expired token
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    async verifyToken(req, res) {
        try {
            // Si le middleware authMiddleware a passé, le token est valide
            res.json({ message: 'Token is valid' });
        }
        catch (error) {
            res.status(401).json({ error: 'Invalid or expired token' });
        }
    }
    /**
     * @swagger
     * /api/auth/me:
     *   get:
     *     summary: Get current authenticated user
     *     tags: [Authentication]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Current user information
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/User'
     *       401:
     *         description: Unauthorized
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     */
    async getCurrentUser(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const token = req.header('Authorization')?.replace('Bearer ', '') || '';
            const user = await this.authService.getUserFromToken(token);
            if (!user) {
                return res.status(401).json({ error: 'User not found' });
            }
            const { password: _, resetToken: __, resetTokenExpiry: ___, ...userWithoutSensitiveData } = user;
            res.json(userWithoutSensitiveData);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal server error' });
        }
    }
}
exports.AuthController = AuthController;
