"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingController = void 0;
const grading_service_1 = require("../services/grading.service");
class GradingController {
    constructor() {
        this.gradingService = new grading_service_1.GradingService();
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
    async createGradingGrid(req, res) {
        try {
            const grid = await this.gradingService.createGradingGrid(req.body);
            res.status(201).json(grid);
        }
        catch (error) {
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
    async gradeGroup(req, res) {
        try {
            const { gradingGridId, groupId, criterionGrades } = req.body;
            const grade = await this.gradingService.gradeGroup(gradingGridId, groupId, criterionGrades);
            res.status(201).json(grade);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
exports.GradingController = GradingController;
