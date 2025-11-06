"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportController = void 0;
const report_service_1 = require("../services/report.service");
class ReportController {
    constructor() {
        this.reportService = new report_service_1.ReportService();
    }
    /**
     * @swagger
     * /api/reports:
     *   post:
     *     summary: Create a new report
     *     tags: [Reports]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [projectId, groupId, title]
     *             properties:
     *               projectId:
     *                 type: integer
     *               groupId:
     *                 type: integer
     *               title:
     *                 type: string
     *               description:
     *                 type: string
     *     responses:
     *       201:
     *         description: Report created successfully
     */
    async createReport(req, res) {
        try {
            const { projectId, groupId, title, description } = req.body;
            console.log(projectId, groupId, title);
            const report = await this.reportService.createReport(projectId, groupId, title, description);
            res.status(201).json(report);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/reports/{id}/sections:
     *   put:
     *     summary: Update a report section
     *     tags: [Reports]
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
     *             required: [sectionTitle, content, orderIndex]
     *             properties:
     *               sectionTitle:
     *                 type: string
     *               content:
     *                 type: string
     *               orderIndex:
     *                 type: integer
     *     responses:
     *       200:
     *         description: Report section updated successfully
     */
    async updateSection(req, res) {
        try {
            const reportId = parseInt(req.params.id);
            const { sectionTitle, content, orderIndex } = req.body;
            const section = await this.reportService.updateReportSection(reportId, sectionTitle, content, orderIndex);
            res.json(section);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/{projectId}/reports:
     *   get:
     *     summary: Get all reports for a project
     *     tags: [Reports]
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
     *         description: Reports retrieved successfully
     */
    async getProjectReports(req, res) {
        try {
            const projectId = parseInt(req.params.projectId);
            const reports = await this.reportService.getReportsByProject(projectId);
            res.json(reports);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/{projectId}/groups/{groupId}/report:
     *   get:
     *     summary: Get report for a specific group
     *     tags: [Reports]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: projectId
     *         required: true
     *         schema:
     *           type: integer
     *       - in: path
     *         name: groupId
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       200:
     *         description: Group report retrieved successfully
     */
    async getGroupReport(req, res) {
        try {
            const projectId = parseInt(req.params.projectId);
            const groupId = parseInt(req.params.groupId);
            const report = await this.reportService.getReportByGroup(projectId, groupId);
            res.json(report);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
exports.ReportController = ReportController;
