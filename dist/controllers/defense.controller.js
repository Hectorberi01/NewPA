"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefenseController = void 0;
const defense_service_1 = require("../services/defense.service");
class DefenseController {
    constructor() {
        this.defenseService = new defense_service_1.DefenseService();
    }
    /**
     * @swagger
     * /api/defenses/projects/{projectId}/schedule:
     *   post:
     *     summary: Schedule defenses for a project
     *     tags: [Defenses]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: projectId
     *         required: true
     *         schema:
     *           type: integer
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [startDateTime, durationPerGroup]
     *             properties:
     *               startDateTime:
     *                 type: string
     *                 format: date-time
     *               durationPerGroup:
     *                 type: integer
     *                 description: Duration in minutes
     *     responses:
     *       201:
     *         description: Defenses scheduled successfully
     */
    async scheduleDefenses(req, res) {
        try {
            const projectId = parseInt(req.params.projectId);
            const { startDateTime, durationPerGroup } = req.body;
            const defenses = await this.defenseService.scheduleDefenses(projectId, new Date(startDateTime), durationPerGroup);
            res.status(201).json(defenses);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/defenses/projects/{projectId}/reorder:
     *   put:
     *     summary: Update defense order
     *     tags: [Defenses]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: projectId
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
     *               newOrder:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     groupId:
     *                       type: integer
     *                     orderIndex:
     *                       type: integer
     *     responses:
     *       200:
     *         description: Defense order updated successfully
     */
    async updateDefenseOrder(req, res) {
        try {
            const projectId = parseInt(req.params.projectId);
            const { newOrder } = req.body;
            const defenses = await this.defenseService.updateDefenseOrder(projectId, newOrder);
            res.json(defenses);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/defenses/projects/{projectId}/schedule/pdf:
     *   get:
     *     summary: Download defense schedule as PDF
     *     tags: [Defenses]
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
     *         description: PDF file
     *         content:
     *           application/pdf:
     *             schema:
     *               type: string
     *               format: binary
     */
    async downloadSchedulePDF(req, res) {
        try {
            const projectId = parseInt(req.params.projectId);
            const pdfBuffer = await this.defenseService.generateDefenseSchedulePDF(projectId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=defense-schedule-${projectId}.pdf`);
            res.send(pdfBuffer);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/defenses/projects/{projectId}/attendance/pdf:
     *   get:
     *     summary: Download attendance sheet as PDF
     *     tags: [Defenses]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: projectId
     *         required: true
     *         schema:
     *           type: integer
     *       - in: query
     *         name: orderType
     *         required: false
     *         schema:
     *           type: string
     *           enum: [group, alphabetical]
     *           default: group
     *     responses:
     *       200:
     *         description: PDF file
     *         content:
     *           application/pdf:
     *             schema:
     *               type: string
     *               format: binary
     */
    async downloadAttendancePDF(req, res) {
        try {
            const projectId = parseInt(req.params.projectId);
            const orderType = req.query.orderType || 'group';
            const pdfBuffer = await this.defenseService.generateAttendanceSheetPDF(projectId, orderType);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename=attendance-sheet-${projectId}.pdf`);
            res.send(pdfBuffer);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
exports.DefenseController = DefenseController;
