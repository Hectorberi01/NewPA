"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserController = void 0;
const user_service_1 = require("../services/user.service");
class UserController {
    constructor() {
        this.userService = new user_service_1.UserService();
    }
    /**
     * @swagger
     * /api/users/profile:
     *   get:
     *     summary: Get current user profile
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: User profile retrieved successfully
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/User'
     */
    async getProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await this.userService.findById(userId);
            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }
            res.json(user);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/users/profile:
     *   put:
     *     summary: Update current user profile
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             properties:
     *               firstName:
     *                 type: string
     *               lastName:
     *                 type: string
     *     responses:
     *       200:
     *         description: Profile updated successfully
     */
    async updateProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            const user = await this.userService.updateUser(userId, req.body);
            res.json(user);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/users/students/bulk:
     *   post:
     *     summary: Create students from email list
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [emails, promotionId]
     *             properties:
     *               emails:
     *                 type: array
     *                 items:
     *                   type: string
     *               promotionId:
     *                 type: number
     *     responses:
     *       201:
     *         description: Students created successfully
     */
    async createStudentsBulk(req, res) {
        try {
            const { emails, promotionId } = req.body;
            const students = await this.userService.createStudentsFromFile(emails, promotionId);
            res.status(201).json(students);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/users/search:
     *   get:
     *     summary: Search users
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: query
     *         name: q
     *         required: true
     *         schema:
     *           type: string
     *         description: Search query
     *       - in: query
     *         name: role
     *         required: false
     *         schema:
     *           type: string
     *           enum: [teacher, student]
     *     responses:
     *       200:
     *         description: Users found
     */
    async searchUsers(req, res) {
        try {
            const { q, role } = req.query;
            const users = await this.userService.searchUsers(q, role);
            res.json(users);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/users/students:
     *   get:
     *     summary: Get all active students
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Students retrieved successfully
     */
    async getAllStudents(req, res) {
        try {
            const students = await this.userService.getAllStudents();
            res.json(students);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/users/teachers:
     *   get:
     *     summary: Get all active teachers
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Teachers retrieved successfully
     */
    async getAllTeachers(req, res) {
        try {
            const teachers = await this.userService.getAllTeachers();
            res.json(teachers);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/users/{id}/deactivate:
     *   put:
     *     summary: Deactivate a user
     *     tags: [Users]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: User deactivated successfully
     */
    async deactivateUser(req, res) {
        try {
            const userId = parseInt(req.params.id);
            const user = await this.userService.deactivateUser(userId);
            res.json(user);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
exports.UserController = UserController;
