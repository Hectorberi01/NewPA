import { Router } from 'express';
import { GradingController } from '../controllers/grading.controller';
import { authMiddleware, requireTeacher } from '../middleware/auth.middleware';

const router = Router();
const gradingController = new GradingController();



// Grilles
router.post('/grids', authMiddleware, requireTeacher, gradingController.createGradingGrid.bind(gradingController));
router.get('/grids/:id', authMiddleware, gradingController.getGradingGrid);
router.put('/grids/:id', authMiddleware, requireTeacher, gradingController.updateGradingGrid);
router.delete('/grids/:id', authMiddleware, requireTeacher, gradingController.deleteGradingGrid);
router.get(
  '/projects/:projectId/statistics',
  authMiddleware,
  requireTeacher,
  gradingController.getGradingStatistics.bind(gradingController)
);
router.post(
  '/grades/validate',
  authMiddleware,
  requireTeacher,
  gradingController.validateGrades.bind(gradingController)
);
router.get(
  '/grades/:id',
  authMiddleware,
  gradingController.getGradeById.bind(gradingController)
);
router.get(
  '/projects/:projectId/grids',
  authMiddleware,
  gradingController.getGradingGridsByProject.bind(gradingController)
);

router.get(
  '/projects/:projectId/groups/:groupId/final-grade',
  authMiddleware,
  gradingController.calculateProjectGrade.bind(gradingController)
);
         

// Critères
router.post(
  '/grids/:gridId/criteria',
  authMiddleware,
  requireTeacher,
  gradingController.addCriterion
);

router.put(
  '/criteria/:id',
  authMiddleware,
  requireTeacher,
  gradingController.updateCriterion
);

router.delete(
  '/criteria/:id',
  authMiddleware,
  requireTeacher,
  gradingController.deleteCriterion
);

// Notes
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
router.get('/groups/:groupId/grades', authMiddleware, gradingController.getGroupGrades);
router.get('/projects/:projectId/grades', authMiddleware, gradingController.getProjectGrades);
// src/routes/grading.routes.ts
router.get(
  '/projects/:projectId/summary', 
  authMiddleware, 
  requireTeacher, 
  gradingController.getGradingSummary.bind(gradingController)
);
// Dans grading.routes.ts

// Sessions (pour compatibilité frontend)
router.get(
  '/sessions',
  authMiddleware,
  gradingController.getGradingSession.bind(gradingController)
);

router.post(
  '/sessions',
  authMiddleware,
  requireTeacher,
  gradingController.createOrUpdateGradingSession.bind(gradingController)
);

router.put(
  '/sessions/:id',
  authMiddleware,
  requireTeacher,
  gradingController.createOrUpdateGradingSession.bind(gradingController)
);
export default router;


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