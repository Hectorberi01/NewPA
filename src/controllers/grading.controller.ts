import { Request, Response } from 'express';
import { GradingService } from '../services/grading.service';

export class GradingController {
  private gradingService: GradingService;

  constructor() {
    this.gradingService = new GradingService();
  }

  /**
   * @swagger
   * /api/grading/grids:
   *   post:
   *     summary: Create a new grading grid
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, type, projectId]
   *             properties:
   *               name:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [deliverable, report, defense]
   *               projectId:
   *                 type: integer
   *               weight:
   *                 type: number
   *                 default: 1.0
   *               description:
   *                 type: string
   *     responses:
   *       201:
   *         description: Grading grid created successfully
   */
  async createGradingGrid(req: Request, res: Response) {
    try {
      console.log('Creating grading grid with data:', req.body);
      const grid = await this.gradingService.createGradingGrid(req.body);
      res.status(201).json(grid);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/grading/grade:
   *   post:
   *     summary: Grade a group
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [gradingGridId, groupId, criterionGrades]
   *             properties:
   *               gradingGridId:
   *                 type: integer
   *               groupId:
   *                 type: integer
   *               criterionGrades:
   *                 type: array
   *                 items:
   *                   type: object
   *                   properties:
   *                     criterionId:
   *                       type: integer
   *                     score:
   *                       type: number
   *                     comments:
   *                       type: string
   *     responses:
   *       201:
   *         description: Grade assigned successfully
   */
  async gradeGroup(req: Request, res: Response) {
    try {
      const { gradingGridId, groupId, criterionGrades } = req.body;
      const grade = await this.gradingService.gradeGroup(gradingGridId, groupId, criterionGrades);
      res.status(201).json(grade);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/grading/grids/{gridId}:
   *   put:
   *     summary: Update a grading grid
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: gridId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the grading grid to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               type:
   *                 type: string
   *                 enum: [deliverable, report, defense]
   *               weight:
   *                 type: number
   *               description:
   *                 type: string
   *     responses:
   *       200:
   *         description: Grading grid updated successfully
   *       404:
   *         description: Grading grid not found
   */
  async updateGradingGrid(req: Request, res: Response) {
    try {
      const gridId = parseInt(req.params.gridId, 10);
      const updateData = req.body;
      const updatedGrid = await this.gradingService.updateGradingGrid(gridId, updateData);
      if (!updatedGrid) {
        return res.status(404).json({ error: 'Grading grid not found' });
      }
      res.status(200).json(updatedGrid);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/grading/grids/{gridId}:
   *   delete:
   *     summary: Delete a grading grid
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: gridId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the grading grid to delete
   *     responses:
   *       200:
   *         description: Grading grid deleted successfully
   *       404:
   *         description: Grading grid not found
   */
  async deleteGradingGrid(req: Request, res: Response) {
    try {
      const gridId = parseInt(req.params.gridId, 10);
      await this.gradingService.deleteGradingGrid(gridId);

      res.status(200).json({ message: 'Grading grid deleted successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // GET /api/grading/grids/:gridId
  /**
   * @swagger
   * /api/grading/grids/{gridId}:
   *   get:
   *     summary: Get a grading grid by ID
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: gridId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the grading grid to retrieve
   *     responses:
   *       200:
   *         description: Grading grid found
   *       404:
   *         description: Grading grid not found
   */
  async getGradingGridById(req: Request, res: Response) {
    try {
      const gridId = parseInt(req.params.gridId, 10);
      if (!Number.isFinite(gridId)) return res.status(400).json({ message: 'Invalid gridId' });

      const grid = await this.gradingService.getGradingGridById(gridId);
      if (!grid) return res.status(404).json({ message: 'Grading grid not found' });
      return res.status(200).json(grid);
    } catch (error: any) {
      console.error('getGradingGridById error:', error);
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // GET /api/grading/projects/:projectId/grids
  /**
   * @swagger
   * /api/grading/projects/{projectId}/grids:
   *   get:
   *     summary: Get all grading grids for a project
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the project to retrieve grading grids for
   *     responses:
   *       200:
   *         description: Grading grids found
   *       404:
   *         description: Project not found
   */
  async getGradingGridsByProject(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (!Number.isFinite(projectId)) return res.status(400).json({ message: 'Invalid projectId' });

      const grids = await this.gradingService.getGradingGridsByProject(projectId);
      return res.status(200).json(grids);
    } catch (error: any) {
      console.error('getGradingGridsByProject error:', error);
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // POST /api/grading/grids/:gridId/criteria
  /**
   * @swagger
   * /api/grading/grids/{gridId}/criteria:
   *   post:
   *     summary: Add a criterion to a grading grid
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: gridId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the grading grid to add the criterion to
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
  *             properties:
  *               name:
  *                 type: string
  *               description:
  *                 type: string
  *               maxScore:
  *                 type: number
  *               weight:
  *                 type: number
  *               type:
  *                 type: string
  *                 enum: [group, individual]
  *               hasComments:
  *                 type: boolean
   *     responses:
   *       201:
   *         description: Criterion created successfully
   *       404:
   *         description: Grading grid not found
   */
  async addCriterion(req: Request, res: Response) {
    try {
      const gridId = parseInt(req.params.gridId, 10);
      if (!Number.isFinite(gridId)) return res.status(400).json({ message: 'Invalid gridId' });

      const criterionData = req.body;
      const created = await this.gradingService.addCriterion(gridId, criterionData);
      return res.status(201).json(created);
    } catch (error: any) {
      console.error('addCriterion error:', error);
      if (error.message?.includes('not found')) return res.status(404).json({ message: error.message });
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // PUT /api/grading/criteria/:criterionId
  /**
   * @swagger
   * /api/grading/criteria/{criterionId}:
   *   put:
   *     summary: Update a grading criterion
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: criterionId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the grading criterion to update
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               weight:
   *                 type: number
   *     responses:
   *       200:
   *         description: Criterion updated successfully
   *       404:
   *         description: Criterion not found
   */
  async updateCriterion(req: Request, res: Response) {
    try {
      const criterionId = parseInt(req.params.criterionId, 10);
      if (!Number.isFinite(criterionId)) return res.status(400).json({ message: 'Invalid criterionId' });

      const data = req.body;
      const updated = await this.gradingService.updateCriterion(criterionId, data);
      return res.status(200).json(updated);
    } catch (error: any) {
      console.error('updateCriterion error:', error);
      if (error.message?.includes('not found')) return res.status(404).json({ message: error.message });
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // DELETE /api/grading/criteria/:criterionId
  /**
   * @swagger
   * /api/grading/criteria/{criterionId}:
   *   delete:
   *     summary: Delete a grading criterion
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: criterionId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the grading criterion to delete
   *     responses:
   *       200:
   *         description: Criterion deleted successfully
   *       404:
   *         description: Criterion not found
   */
  async deleteCriterion(req: Request, res: Response) {
    try {
      const criterionId = parseInt(req.params.criterionId, 10);
      if (!Number.isFinite(criterionId)) return res.status(400).json({ message: 'Invalid criterionId' });

      await this.gradingService.deleteCriterion(criterionId);
      return res.status(200).json({ message: 'Criterion deleted successfully' });
    } catch (error: any) {
      console.error('deleteCriterion error:', error);
      if (error.message?.includes('not found')) return res.status(404).json({ message: error.message });
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // GET /api/grading/groups/:groupId/grades
  /**
   * @swagger
   * /api/grading/groups/{groupId}/grades:
   *   get:
   *     summary: Get grades for a specific group
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: groupId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the group to retrieve grades for
   *     responses:
   *       200:
   *         description: Grades retrieved successfully
   *       404:
   *         description: Group not found
   */
  async getGradesByGroup(req: Request, res: Response) {
    try {
      const groupId = parseInt(req.params.groupId, 10);
      if (!Number.isFinite(groupId)) return res.status(400).json({ message: 'Invalid groupId' });

      const grades = await this.gradingService.getGradesByGroup(groupId);
      return res.status(200).json(grades);
    } catch (error: any) {
      console.error('getGradesByGroup error:', error);
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // GET /api/grading/projects/:projectId/grades
  /**
   * @swagger
   * /api/grading/projects/{projectId}/grades:
   *   get:
   *     summary: Get grades for a specific project
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the project to retrieve grades for
   *     responses:
   *       200:
   *         description: Grades retrieved successfully
   *       404:
   *         description: Project not found
   */
  async getGradesByProject(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (!Number.isFinite(projectId)) return res.status(400).json({ message: 'Invalid projectId' });

      const grades = await this.gradingService.getGradesByProject(projectId);
      return res.status(200).json(grades);
    } catch (error: any) {
      console.error('getGradesByProject error:', error);
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // GET /api/grading/grades/:gradeId
  /**
   * @swagger
   * /api/grading/grades/{gradeId}:
   *   get:
   *     summary: Get a specific grade
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: gradeId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the grade to retrieve
   *     responses:
   *       200:
   *         description: Grade retrieved successfully
   *       404:
   *         description: Grade not found
   */
  async getGradeById(req: Request, res: Response) {
    try {
      const gradeId = parseInt(req.params.gradeId, 10);
      if (!Number.isFinite(gradeId)) return res.status(400).json({ message: 'Invalid gradeId' });

      const grade = await this.gradingService.getGradeById(gradeId);
      if (!grade) return res.status(404).json({ message: 'Grade not found' });
      return res.status(200).json(grade);
    } catch (error: any) {
      console.error('getGradeById error:', error);
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // PUT /api/grading/grades/validate
  /**
   * @swagger
   * /api/grading/grades/validate:
   *   put:
   *     summary: Validate multiple grades
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               gradeIds:
   *                 type: array
   *                 items:
   *                   type: integer
   *     responses:
   *       200:
   *         description: Grades validated successfully
   *       400:
   *         description: Invalid request
   *       404:
   *         description: Grades not found
   */
  async validateGrades(req: Request, res: Response) {
    try {
      const { gradeIds } = req.body;
      if (!Array.isArray(gradeIds) || gradeIds.length === 0) {
        return res.status(400).json({ message: 'gradeIds must be a non-empty array' });
      }

      const updated = await this.gradingService.validateGrades(gradeIds);
      return res.status(200).json(updated);
    } catch (error: any) {
      console.error('validateGrades error:', error);
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // GET /api/grading/projects/:projectId/summary
  /**
   * @swagger
   * /api/grading/projects/{projectId}/summary:
   *   get:
   *     summary: Get grading summary for a specific project
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the project to retrieve the grading summary for
   *     responses:
   *       200:
   *         description: Grading summary retrieved successfully
   *       404:
   *         description: Project not found
   */
  async getProjectGradingSummary(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (!Number.isFinite(projectId)) return res.status(400).json({ message: 'Invalid projectId' });

      const summary = await this.gradingService.getProjectGradingSummary(projectId);
      return res.status(200).json(summary);
    } catch (error: any) {
      console.error('getProjectGradingSummary error:', error);
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // GET /api/grading/projects/:projectId/export.csv
  /**
   * @swagger
   * /api/grading/projects/{projectId}/export.csv:
   *   get:
   *     summary: Export grades for a specific project to CSV
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the project to export grades for
   *     responses:
   *       200:
   *         description: Grades exported successfully
   *       404:
   *         description: Project not found
   */
  async exportGradesToCSV(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (!Number.isFinite(projectId)) return res.status(400).json({ message: 'Invalid projectId' });

      const csv = await this.gradingService.exportGradesToCSV(projectId);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="project-${projectId}-grades.csv"`);
      return res.status(200).send(csv);
    } catch (error: any) {
      console.error('exportGradesToCSV error:', error);
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // GET /api/grading/projects/:projectId/statistics
  /**
   * @swagger
   * /api/grading/projects/{projectId}/statistics:
   *   get:
   *     summary: Get grading statistics for a specific project
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: projectId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the project to retrieve grading statistics for
   *     responses:
   *       200:
   *         description: Grading statistics retrieved successfully
   *       404:
   *         description: Project not found
   */
  async getGradingStatistics(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId, 10);
      if (!Number.isFinite(projectId)) return res.status(400).json({ message: 'Invalid projectId' });

      const stats = await this.gradingService.getGradingStatistics(projectId);
      return res.status(200).json(stats);
    } catch (error: any) {
      console.error('getGradingStatistics error:', error);
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }

  // POST /api/grading/grids/:gridId/duplicate
  /**
   * @swagger
   * /api/grading/grids/{gridId}/duplicate:
   *   post:
   *     summary: Duplicate a grading grid
   *     tags: [Grading]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: gridId
   *         required: true
   *         schema:
   *           type: integer
   *         description: The ID of the grading grid to duplicate
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [newName]
   *             properties:
   *               newName:
   *                 type: string
   *               newProjectId:
   *                 type: integer
   *                 description: (Optional) If provided, the duplicated grid will be associated with this project
   *     responses:
   *       201:
   *         description: Grading grid duplicated successfully
   *       404:
   *         description: Grading grid not found
   */
  async duplicateGradingGrid(req: Request, res: Response) {
    try {
      const gridId = parseInt(req.params.gridId, 10);
      if (!Number.isFinite(gridId)) return res.status(400).json({ message: 'Invalid gridId' });

      const { newName, newProjectId } = req.body;
      if (!newName || typeof newName !== 'string') return res.status(400).json({ message: 'newName is required' });

      const duplicated = await this.gradingService.duplicateGradingGrid(gridId, newName, newProjectId);
      return res.status(201).json(duplicated);
    } catch (error: any) {
      console.error('duplicateGradingGrid error:', error);
      return res.status(500).json({ message: error.message || 'Internal Server Error' });
    }
  }
}