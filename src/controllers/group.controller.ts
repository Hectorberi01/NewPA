import { Request, Response } from 'express';
import { GroupService } from '../services/group.service';

export class GroupController {
  private groupService: GroupService;

  constructor() {
    this.groupService = new GroupService();
  }

  /**
   * @swagger
   * /api/groups:
   *   post:
   *     summary: Create a new group
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [projectId, name, memberIds]
   *             properties:
   *               projectId:
   *                 type: integer
   *               name:
   *                 type: string
   *               memberIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *     responses:
   *       201:
   *         description: Group created successfully
   */
  async createGroup(req: Request, res: Response) {
    try {
      const { projectId, name, memberIds } = req.body;
      const group = await this.groupService.createGroup(projectId, name, memberIds);
      res.status(201).json(group);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/groups/{id}/join:
   *   post:
   *     summary: Join a group (for students)
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Joined group successfully
   */
  async joinGroup(req: Request, res: Response) {
    try {
      const groupId = parseInt(req.params.id);
      const studentId = (req as any).user?.id;
      const group = await this.groupService.joinGroup(groupId, studentId);
      res.json(group);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/groups/project/{projectId}/groups:
   *   get:
   *     summary: Get all groups for a project
   *     tags: [Groups]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Groups retrieved successfully
   */
  async getProjectGroups(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const groups = await this.groupService.getGroupsByProject(projectId);
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}