"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const user_controller_1 = require("../controllers/user.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const express_validator_1 = require("express-validator");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
const userController = new user_controller_1.UserController();
const validateBulkStudentCreation = [
    (0, express_validator_1.body)('emails').isArray().withMessage('Emails must be an array'),
    (0, express_validator_1.body)('emails.*').isEmail().withMessage('Invalid email format'),
    (0, express_validator_1.body)('promotionId').isInt().withMessage('Promotion ID must be an integer'),
    validation_middleware_1.handleValidationErrors
];
const validateProfileUpdate = [
    (0, express_validator_1.body)('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
    (0, express_validator_1.body)('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
    validation_middleware_1.handleValidationErrors
];
// Routes publiques (accessibles par tous les utilisateurs connectés)
router.get('/profile', auth_middleware_1.authMiddleware, userController.getProfile.bind(userController));
router.put('/profile', auth_middleware_1.authMiddleware, validateProfileUpdate, userController.updateProfile.bind(userController));
router.get('/search', auth_middleware_1.authMiddleware, userController.searchUsers.bind(userController));
// Routes pour les enseignants uniquement
router.post('/students/bulk', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, validateBulkStudentCreation, userController.createStudentsBulk.bind(userController));
router.get('/students', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, userController.getAllStudents.bind(userController));
router.get('/teachers', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, userController.getAllTeachers.bind(userController));
router.put('/:id/deactivate', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, userController.deactivateUser.bind(userController));
exports.default = router;
