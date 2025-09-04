import { Request, Response } from 'express';
import { ProjectService } from '../services/project.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

export class ProjectController {
  private projectService: ProjectService;

  constructor() {
    this.projectService = new ProjectService();
  }

  /**
   * @swagger
   * /api/projects:
   *   post:
   *     summary: Create a new project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProject'
   *     responses:
   *       201:
   *         description: Project created successfully
   */
  async createProject(req: AuthenticatedRequest, res: Response) {
    try {
      const teacherId = req.user?.id;
      const projectData = { ...req.body, teacher: { id: teacherId } };
      const project = await this.projectService.createProject(projectData);
      res.status(201).json(project);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   get:
   *     summary: Get project by ID
   *     tags: [Projects]
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
   *         description: Project retrieved successfully
   */
  async getProjectById(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.id);
      const project = await this.projectService.getProjectById(projectId);
      
      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }
      
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   put:
   *     summary: Update a project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateProject'
   *     responses:
   *       200:
   *         description: Project updated successfully
   */
  async updateProject(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.id);
      const project = await this.projectService.updateProject(projectId, req.body);
      res.json(project);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/my:
   *   get:
   *     summary: Get projects for current user
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Projects retrieved successfully
   */
  async getMyProjects(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const userRole = req.user?.role;
      
      if (!userId || !userRole) {
        return res.status(401).json({ error: 'Unauthorized' });
      }
      
      let projects;
      if (userRole === 'teacher') {
        projects = await this.projectService.getProjectsByTeacher(userId);
      } else {
        projects = await this.projectService.getProjectsByStudent(userId);
      }
      
      res.json(projects);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{id}/groups/generate:
   *   post:
   *     summary: Generate random groups for a project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       201:
   *         description: Groups generated successfully
   */
  async generateRandomGroups(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.id);
      const groups = await this.projectService.generateRandomGroups(projectId);
      res.status(201).json(groups);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{id}/groups/manual:
   *   post:
   *     summary: Create manual groups for a project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               groups:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     name:
   *                       type: string
   *                     memberIds:
   *                       type: array
   *                       items:
   *                         type: integer
   *     responses:
   *       201:
   *         description: Manual groups created successfully
   */
  async generateManualGroups(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.id);
      const { groups: groupsData } = req.body;
      const groups = await this.projectService.generateManualGroups(projectId, groupsData);
      res.status(201).json(groups);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{id}/assign-unassigned:
   *   post:
   *     summary: Assign unassigned students to groups
   *     tags: [Projects]
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
   *         description: Unassigned students assigned successfully
   */
  async assignUnassignedStudents(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.id);
      await this.projectService.assignUnassignedStudents(projectId);
      res.json({ message: 'Unassigned students have been distributed to groups' });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/projects/{id}:
   *   delete:
   *     summary: Delete a project
   *     tags: [Projects]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       204:
   *         description: Project deleted successfully
   */
  async deleteProject(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.id);
      await this.projectService.deleteProject(projectId);
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
