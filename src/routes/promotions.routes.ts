import { Router } from 'express';
import { PromotionController } from '../controllers/promotion.controller';
import { authMiddleware, requireTeacher } from '../middleware/auth.middleware';
//import { body } from 'express-validator';
import * as validator from 'express-validator';
import { handleValidationErrors } from '../middleware/validation.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();
const { body } = validator;
const promotionController = new PromotionController();

const validateCreatePromotion = [
  body('name').notEmpty().withMessage('Promotion name is required'),
  body('year').isInt({ min: 2020, max: 2030 }).withMessage('Invalid year'),
  handleValidationErrors
];

router.post('/', authMiddleware, requireTeacher, validateCreatePromotion, promotionController.createPromotion.bind(promotionController));
router.get('/my', authMiddleware, requireTeacher, promotionController.getMyPromotions.bind(promotionController));
router.post('/:promotionId/students', authMiddleware, requireTeacher, promotionController.addStudents.bind(promotionController));

router.put('/:id', authMiddleware, requireTeacher, validateCreatePromotion, promotionController.updatePromotion.bind(promotionController));
router.delete('/:id', authMiddleware, requireTeacher, promotionController.deletePromotion.bind(promotionController));

router.post('/:promotionId/students/import', 
  authMiddleware, 
  requireTeacher, 
  uploadMiddleware.single('file'), // Limite à 10MB par défaut
  promotionController.addStudentsFromFile.bind(promotionController)
);
router.delete('/:id/students/:studentId', authMiddleware, requireTeacher, promotionController.deleteStudent.bind(promotionController));

export default router;