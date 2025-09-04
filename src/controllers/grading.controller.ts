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
}