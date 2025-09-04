import { Router } from 'express';
import { GradingController } from '../controllers/grading.controller';
import { authMiddleware, requireTeacher } from '../middleware/auth.middleware';

const router = Router();
const gradingController = new GradingController();

router.post('/grids', authMiddleware, requireTeacher, gradingController.createGradingGrid.bind(gradingController));
router.post('/grade', authMiddleware, requireTeacher, gradingController.gradeGroup.bind(gradingController));

export default router;