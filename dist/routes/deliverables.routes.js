"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const deliverable_controller_1 = require("../controllers/deliverable.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const router = (0, express_1.Router)();
const deliverableController = new deliverable_controller_1.DeliverableController();
// Routes pour les enseignants
router.post('/', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, validation_middleware_1.validateCreateDeliverable, deliverableController.createDeliverable.bind(deliverableController));
router.put('/:id', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, validation_middleware_1.validateCreateDeliverable, deliverableController.updateDeliverable.bind(deliverableController));
router.post('/:id/rules', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, deliverableController.addValidationRule.bind(deliverableController));
router.get('/:id/submissions', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, deliverableController.getSubmissions.bind(deliverableController));
router.get('/:id/summary', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, deliverableController.getSubmissionSummary.bind(deliverableController));
router.post('/:id/analyze-similarity', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, deliverableController.analyzeSimilarity.bind(deliverableController));
router.post('/:id/send-reminders', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, deliverableController.sendDeadlineReminders.bind(deliverableController));
router.get('/submissions/:id/download', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, deliverableController.download.bind(deliverableController));
// Routes pour les étudiants
router.post('/:id/submit', auth_middleware_1.authMiddleware, upload_middleware_1.uploadMiddleware.single('file'), deliverableController.submitDeliverable.bind(deliverableController));
// Routes combinées dans les projets
router.get('/projects/:projectId/deliverables', auth_middleware_1.authMiddleware, deliverableController.getProjectDeliverables.bind(deliverableController));
// Ajouter dans le router, après les autres routes
router.post('/:id/validate', auth_middleware_1.authMiddleware, upload_middleware_1.uploadMiddleware.single('file'), deliverableController.validateDeliverable.bind(deliverableController));
router.get('/:deliverableId/submissions/:groupId', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, deliverableController.getGroupSubmission.bind(deliverableController));
exports.default = router;
