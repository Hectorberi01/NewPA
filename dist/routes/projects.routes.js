"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const project_controller_1 = require("../controllers/project.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const router = (0, express_1.Router)();
const projectController = new project_controller_1.ProjectController();
// Routes pour tous les utilisateurs connectés
router.get('/my', auth_middleware_1.authMiddleware, projectController.getMyProjects.bind(projectController));
router.get('/:id', auth_middleware_1.authMiddleware, projectController.getProjectById.bind(projectController));
// Routes pour les enseignants uniquement
router.post('/', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, validation_middleware_1.validateCreateProject, projectController.createProject.bind(projectController));
router.put('/:id', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, validation_middleware_1.validateCreateProject, projectController.updateProject.bind(projectController));
router.delete('/:id', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, projectController.deleteProject.bind(projectController));
// Gestion des groupes
router.post('/:id/groups/generate', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, projectController.generateRandomGroups.bind(projectController));
router.post('/:id/groups/manual', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, projectController.generateManualGroups.bind(projectController));
router.post('/:id/assign-unassigned', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, projectController.assignUnassignedStudents.bind(projectController));
exports.default = router;
