import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authMiddleware, requireTeacher } from '../middleware/auth.middleware';
import { body } from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';

const router = Router();
const userController = new UserController();

const validateBulkStudentCreation = [
  body('emails').isArray().withMessage('Emails must be an array'),
  body('emails.*').isEmail().withMessage('Invalid email format'),
  body('promotionId').isInt().withMessage('Promotion ID must be an integer'),
  handleValidationErrors
];

const validateProfileUpdate = [
  body('firstName').optional().notEmpty().withMessage('First name cannot be empty'),
  body('lastName').optional().notEmpty().withMessage('Last name cannot be empty'),
  handleValidationErrors
];

// Routes publiques (accessibles par tous les utilisateurs connectés)
router.get('/profile', authMiddleware, userController.getProfile.bind(userController));
router.put('/profile', authMiddleware, validateProfileUpdate, userController.updateProfile.bind(userController));
router.get('/search', authMiddleware, userController.searchUsers.bind(userController));

// Routes pour les enseignants uniquement
router.post('/students/bulk', authMiddleware, requireTeacher, validateBulkStudentCreation, 
  userController.createStudentsBulk.bind(userController));
router.get('/students', authMiddleware, requireTeacher, userController.getAllStudents.bind(userController));
router.get('/teachers', authMiddleware, requireTeacher, userController.getAllTeachers.bind(userController));
router.put('/:id/deactivate', authMiddleware, requireTeacher, userController.deactivateUser.bind(userController));

export default router;