import { Router } from 'express';
import userRoutes from './users.routes';
import projectRoutes from './projects.routes';
import deliverableRoutes from './deliverables.routes';
import promotionRoutes from './promotions.routes';
import groupRoutes from './groups.routes';
import reportRoutes from './reports.routes';
import defenseRoutes from './defenses.routes';
import gradingRoutes from './grading.routes';
import authRoutes from './auth.routes';

const router = Router();
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/deliverables', deliverableRoutes);
router.use('/promotions', promotionRoutes);
router.use('/groups', groupRoutes);
router.use('/reports', reportRoutes);
router.use('/defenses', defenseRoutes);
router.use('/grading', gradingRoutes);

// Routes combinées pour certaines fonctionnalités
router.use('/projects/:projectId/groups', groupRoutes);
router.use('/projects/:projectId/reports', reportRoutes);
router.use('/projects/defenses', defenseRoutes);
router.use('/projects/:projectId/deliverables', deliverableRoutes);
router.use('/projects/:projectId/defenses', defenseRoutes);
router.use('/projects/:projectId/grading', gradingRoutes);

export default router;