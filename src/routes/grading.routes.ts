import { Router } from 'express';
import { GradingController } from '../controllers/grading.controller';
import { authMiddleware, requireTeacher } from '../middleware/auth.middleware';

const router = Router();
const gradingController = new GradingController();

router.post('/grids', authMiddleware, requireTeacher, gradingController.createGradingGrid.bind(gradingController));
router.post('/grade', authMiddleware, requireTeacher, gradingController.gradeGroup.bind(gradingController));
router.put('/grids/:gridId', authMiddleware, requireTeacher, gradingController.updateGradingGrid.bind(gradingController));
router.delete('/grids/:gridId', authMiddleware, requireTeacher, gradingController.deleteGradingGrid.bind(gradingController));
router.post('/grids/:gridId/criteria', authMiddleware, requireTeacher, gradingController.addCriterion.bind(gradingController));
router.get('/grids/:projectId', authMiddleware, gradingController.getGradingGridsByProject.bind(gradingController));
router.get('/grades/group/:groupId', authMiddleware, gradingController.getGradesByGroup.bind(gradingController));
router.get('/grades/project/:projectId', authMiddleware, gradingController.getGradesByProject.bind(gradingController));
router.get('/grade/:gradeId', authMiddleware, gradingController.getGradeById.bind(gradingController));
router.post('/grades/validate', authMiddleware, requireTeacher, gradingController.validateGrades.bind(gradingController));
//router.get('/grades/calculate/:projectId/group/:groupId', authMiddleware, gradingController.calculateProjectGrade.bind(gradingController));
router.get('/grades/summary/:projectId', authMiddleware, gradingController.getProjectGradingSummary.bind(gradingController));
router.get('/grades/export/:projectId', authMiddleware, requireTeacher, gradingController.exportGradesToCSV.bind(gradingController));
router.get('/grades/statistics/:projectId', authMiddleware, gradingController.getGradingStatistics.bind(gradingController));

export default router;