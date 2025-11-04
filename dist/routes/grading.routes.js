"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const grading_controller_1 = require("../controllers/grading.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const gradingController = new grading_controller_1.GradingController();
// Grilles
router.post('/grids', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.createGradingGrid.bind(gradingController));
router.get('/grids/:id', auth_middleware_1.authMiddleware, gradingController.getGradingGrid);
router.put('/grids/:id', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.updateGradingGrid);
router.delete('/grids/:id', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.deleteGradingGrid);
router.get('/projects/:projectId/statistics', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.getGradingStatistics.bind(gradingController));
router.post('/grades/validate', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.validateGrades.bind(gradingController));
router.get('/grades/:id', auth_middleware_1.authMiddleware, gradingController.getGradeById.bind(gradingController));
router.get('/projects/:projectId/grids', auth_middleware_1.authMiddleware, gradingController.getGradingGridsByProject.bind(gradingController));
router.get('/projects/:projectId/groups/:groupId/final-grade', auth_middleware_1.authMiddleware, gradingController.calculateProjectGrade.bind(gradingController));
// Critères
router.post('/grids/:gridId/criteria', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.addCriterion);
router.put('/criteria/:id', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.updateCriterion);
router.delete('/criteria/:id', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.deleteCriterion);
// Notes
router.post('/grade', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.gradeGroup.bind(gradingController));
router.get('/groups/:groupId/grades', auth_middleware_1.authMiddleware, gradingController.getGroupGrades);
router.get('/projects/:projectId/grades', auth_middleware_1.authMiddleware, gradingController.getProjectGrades);
// src/routes/grading.routes.ts
router.get('/projects/:projectId/summary', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.getGradingSummary.bind(gradingController));
// Routes pour les étudiants - affichage des notes
router.get('/students/my-grades', auth_middleware_1.authMiddleware, gradingController.getStudentGrades.bind(gradingController));
router.get('/students/projects/:projectId/grades', auth_middleware_1.authMiddleware, gradingController.getStudentProjectGrades.bind(gradingController));
router.get('/students/grades/:gradeId/details', auth_middleware_1.authMiddleware, gradingController.getGradeDetails.bind(gradingController));
router.get('/sessions', auth_middleware_1.authMiddleware, gradingController.getGradingSession.bind(gradingController));
router.post('/sessions', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.createOrUpdateGradingSession.bind(gradingController));
router.put('/sessions/:id', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.createOrUpdateGradingSession.bind(gradingController));
// Dans grading.routes.ts - AJOUTEZ CETTE ROUTE
router.get('/sessions/project/:projectId', auth_middleware_1.authMiddleware, gradingController.getGradingSessionsByProject.bind(gradingController));
router.put('/projects/:projectId/weights', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, gradingController.updateGridWeights.bind(gradingController));
exports.default = router;
/*POST   /api/grading/grids
GET    /api/grading/projects/:projectId/grids?deliverableId=X
PUT    /api/grading/grids/:gridId
DELETE /api/grading/grids/:gridId

// Critères
POST   /api/grading/grids/:gridId/criteria
PUT    /api/grading/criteria/:criterionId
DELETE /api/grading/criteria/:criterionId

// Sessions de notation
POST   /api/grading/sessions
PUT    /api/grading/sessions/:sessionId
GET    /api/grading/deliverables/:deliverableId/sessions
GET    /api/grading/reports/:reportId/groups/:groupId/session
GET    /api/grading/reports/:reportId/grid

// Pondération et synthèse
GET    /api/grading/projects/:projectId/summary
PUT    /api/grading/projects/:projectId/weights7771

+.=
==+
+

+*/ 
