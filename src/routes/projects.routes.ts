import { Router } from 'express';
import { ProjectController } from '../controllers/project.controller';
import { authMiddleware, requireTeacher } from '../middleware/auth.middleware';
import { validateCreateProject } from '../middleware/validation.middleware';

const router = Router();
const projectController = new ProjectController();

// Routes pour tous les utilisateurs connectés
router.get('/my', authMiddleware, projectController.getMyProjects.bind(projectController));
router.get('/:id', authMiddleware, projectController.getProjectById.bind(projectController));

// Routes pour les enseignants uniquement
router.post('/', authMiddleware, requireTeacher, validateCreateProject, 
  projectController.createProject.bind(projectController));
router.put('/:id', authMiddleware, requireTeacher, validateCreateProject, 
  projectController.updateProject.bind(projectController));
router.delete('/:id', authMiddleware, requireTeacher, 
  projectController.deleteProject.bind(projectController));

// Gestion des groupes
router.post('/:id/groups/generate', authMiddleware, requireTeacher, 
  projectController.generateRandomGroups.bind(projectController));
router.post('/:id/groups/manual', authMiddleware, requireTeacher, 
  projectController.generateManualGroups.bind(projectController));
router.post('/:id/assign-unassigned', authMiddleware, requireTeacher, 
  projectController.assignUnassignedStudents.bind(projectController));

router.put("/:projectId/groups", authMiddleware,
  projectController.saveGrouping.bind(projectController));

export default router;