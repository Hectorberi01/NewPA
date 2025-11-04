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
import { buildAntiCheatRouter } from './anticheat.routes';
import { AppDataSource } from '../database/data-source';

const router = Router();
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/deliverables', deliverableRoutes);
router.use('/promotions', promotionRoutes);
router.use('/groups', groupRoutes);
//router.use('/reports', reportRoutes);
router.use('/defenses', defenseRoutes);
router.use('/grading', gradingRoutes);

router.use(buildAntiCheatRouter(AppDataSource));


export default router;