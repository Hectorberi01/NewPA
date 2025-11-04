"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_middleware_1 = require("../middleware/auth.middleware");
const report_service_1 = require("../services/report.service");
const router = (0, express_1.Router)();
const reportService = new report_service_1.ReportService();
// ============================================================================
// ROUTES SPÉCIFIQUES (doivent être définies AVANT les routes génériques)
// ============================================================================
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
router.post('/', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { projectId, groupId, title, description } = req.body;
        console.log(projectId, groupId, title);
        const report = await reportService.createReport(projectId, groupId, title, description);
        res.status(201).json(report);
    }
    catch (error) {
        console.error('Erreur createReport:', error);
        res.status(500).json({ message: error.message });
    }
});
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
router.put('/:id/sections', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const reportId = parseInt(req.params.id);
        const { sectionTitle, content, orderIndex } = req.body;
        const section = await reportService.updateReportSection(reportId, sectionTitle, content, orderIndex);
        res.json(section);
    }
    catch (error) {
        console.error('Erreur updateSection:', error);
        res.status(500).json({ message: error.message });
    }
});
// ============================================================================
// ROUTES PROJECTS
// ============================================================================
/**
 * @swagger
 * /api/reports/projects/{projectId}:
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
router.get('/projects/:projectId', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const reports = await reportService.getReportsByProject(projectId);
        res.json(reports);
    }
    catch (error) {
        console.error('Erreur getReportsByProject:', error);
        res.status(500).json({ message: error.message });
    }
});
router.post('/projects/:projectId/report-config', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        const config = await reportService.saveReportConfig(projectId, req.body);
        res.json(config);
    }
    catch (error) {
        console.error('Erreur saveReportConfig:', error);
        res.status(500).json({ message: error.message });
    }
});
router.get('/projects/:projectId/report-config', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        console.log('Fetching report config for projectId:', projectId);
        const config = await reportService.getReportConfig(projectId);
        console.log('Fetched report config:', config);
        if (!config) {
            return res.json({
                isEnabled: false,
                sections: [],
                format: 'markdown',
                projectId
            });
        }
        res.json(config);
    }
    catch (error) {
        console.error('Erreur getReportConfig:', error);
        res.status(500).json({ message: error.message });
    }
});
router.delete('/projects/:projectId/report-config', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, async (req, res) => {
    try {
        const projectId = parseInt(req.params.projectId);
        await reportService.deleteReportConfig(projectId);
        res.json({ message: 'Configuration supprimée avec succès' });
    }
    catch (error) {
        console.error('Erreur deleteReportConfig:', error);
        res.status(500).json({ message: error.message });
    }
});
// ============================================================================
// ROUTES GROUPS
// ============================================================================
/**
 * @swagger
 * /api/reports/groups/{groupId}/projects/{projectId}:
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
router.get('/groups/:groupId/projects/:projectId', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { groupId, projectId } = req.params;
        const report = await reportService.getGroupReport(parseInt(projectId), parseInt(groupId));
        res.json(report);
    }
    catch (error) {
        console.error('Erreur getGroupReport:', error);
        res.status(500).json({ message: error.message });
    }
});
router.post('/groups/:groupId/projects/:projectId/submit', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const { groupId, projectId } = req.params;
        const submitted = await reportService.submitReport(parseInt(projectId), parseInt(groupId));
        res.json(submitted);
    }
    catch (error) {
        console.error('Erreur submitReport:', error);
        res.status(500).json({ message: error.message });
    }
});
// ============================================================================
// ROUTES SECTIONS
// ============================================================================
router.put('/sections/:sectionConfigId/content', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const sectionConfigId = parseInt(req.params.sectionConfigId);
        const { content, groupId } = req.body;
        const updated = await reportService.updateSectionContent(sectionConfigId, groupId, content);
        res.json(updated);
    }
    catch (error) {
        console.error('Erreur updateSectionContent:', error);
        res.status(500).json({ message: error.message });
    }
});
router.delete('/sections/:sectionId', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, async (req, res) => {
    try {
        const sectionId = parseInt(req.params.sectionId);
        await reportService.deleteReportSection(sectionId);
        res.json({ message: 'Section supprimée avec succès' });
    }
    catch (error) {
        console.error('Erreur deleteReportSection:', error);
        res.status(500).json({ message: error.message });
    }
});
router.delete('/section-config/:sectionConfigId', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, async (req, res) => {
    try {
        const sectionConfigId = parseInt(req.params.sectionConfigId);
        await reportService.deleteSectionConfig(sectionConfigId);
        res.json({ message: 'Section de configuration supprimée' });
    }
    catch (error) {
        console.error('Erreur deleteSectionConfig:', error);
        res.status(500).json({ message: error.message });
    }
});
// ============================================================================
// ROUTES GÉNÉRIQUES (doivent être définies EN DERNIER pour éviter les conflits)
// ============================================================================
router.get('/:reportId', auth_middleware_1.authMiddleware, async (req, res) => {
    try {
        const reportId = parseInt(req.params.reportId);
        const report = await reportService.getReportById(reportId);
        if (!report) {
            return res.status(404).json({ message: 'Rapport non trouvé' });
        }
        res.json(report);
    }
    catch (error) {
        console.error('Erreur getReportById:', error);
        res.status(500).json({ message: error.message });
    }
});
router.delete('/:reportId', auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, async (req, res) => {
    try {
        const reportId = parseInt(req.params.reportId);
        await reportService.deleteReport(reportId);
        res.json({ message: 'Rapport supprimé avec succès' });
    }
    catch (error) {
        console.error('Erreur deleteReport:', error);
        res.status(500).json({ message: error.message });
    }
});
exports.default = router;
