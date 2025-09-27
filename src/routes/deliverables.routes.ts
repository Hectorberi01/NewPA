import { Router } from 'express';
import { DeliverableController } from '../controllers/deliverable.controller';
import { authMiddleware, requireTeacher } from '../middleware/auth.middleware';
import { validateCreateDeliverable } from '../middleware/validation.middleware';
import { uploadMiddleware } from '../middleware/upload.middleware';

const router = Router();
const deliverableController = new DeliverableController();

// Routes pour les enseignants
router.post('/', authMiddleware, requireTeacher, validateCreateDeliverable, 
  deliverableController.createDeliverable.bind(deliverableController));
router.put('/:id', authMiddleware, requireTeacher, validateCreateDeliverable, 
  deliverableController.updateDeliverable.bind(deliverableController));
router.post('/:id/rules', authMiddleware, requireTeacher, 
  deliverableController.addValidationRule.bind(deliverableController));
router.get('/:id/submissions', authMiddleware, requireTeacher, 
  deliverableController.getSubmissions.bind(deliverableController));
router.get('/:id/summary', authMiddleware, requireTeacher, 
  deliverableController.getSubmissionSummary.bind(deliverableController));
router.post('/:id/analyze-similarity', authMiddleware, requireTeacher, 
  deliverableController.analyzeSimilarity.bind(deliverableController));
router.post('/:id/send-reminders', authMiddleware, requireTeacher, 
  deliverableController.sendDeadlineReminders.bind(deliverableController));

router.get('/submissions/:id/download', authMiddleware,requireTeacher, 
  deliverableController.download.bind(deliverableController));


// Routes pour les étudiants
router.post('/:id/submit', authMiddleware, uploadMiddleware.single('file'), 
  deliverableController.submitDeliverable.bind(deliverableController));

// Routes combinées dans les projets
router.get('/projects/:projectId/deliverables', authMiddleware, 
  deliverableController.getProjectDeliverables.bind(deliverableController));

export default router;