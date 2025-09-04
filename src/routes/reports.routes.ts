import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const reportController = new ReportController();

router.post('/', authMiddleware, reportController.createReport.bind(reportController));
router.put('/:id/sections', authMiddleware, reportController.updateSection.bind(reportController));

export default router;