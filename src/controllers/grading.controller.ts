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
}