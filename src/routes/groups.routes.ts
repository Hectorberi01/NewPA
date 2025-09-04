import { Router } from 'express';
import { GroupController } from '../controllers/group.controller';
import { authMiddleware } from '../middleware/auth.middleware';

const router = Router();
const groupController = new GroupController();

router.post('/', authMiddleware, groupController.createGroup.bind(groupController));
router.post('/:id/join', authMiddleware, groupController.joinGroup.bind(groupController));
router.get('/project/:projectId/groups', authMiddleware, groupController.getProjectGroups.bind(groupController));

export default router;