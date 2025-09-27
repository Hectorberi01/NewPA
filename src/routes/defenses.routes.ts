import { Router } from 'express';
import { DefenseController } from '../controllers/defense.controller';
import { authMiddleware, requireTeacher } from '../middleware/auth.middleware';

const router = Router();
const defenseController = new DefenseController();

router.post('/projects/:projectId/schedule', authMiddleware, requireTeacher, defenseController.scheduleDefenses.bind(defenseController));
router.put('/projects/:projectId/reorder', authMiddleware, requireTeacher, defenseController.updateOrder.bind(defenseController));
router.get('/projects/:projectId/schedule/pdf', authMiddleware, requireTeacher, defenseController.downloadSchedulePDF.bind(defenseController));
router.get('/projects/:projectId/attendance/pdf', authMiddleware, requireTeacher, defenseController.downloadAttendancePDF.bind(defenseController));

export default router;