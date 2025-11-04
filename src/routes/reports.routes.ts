import { Router } from 'express';
import { ReportController } from '../controllers/report.controller';
import { authMiddleware, requireTeacher } from '../middleware/auth.middleware';
import { ReportService } from '../services/report.service';
import PDFDocument from 'pdfkit';

const router = Router();
const reportController = new ReportController();
const reportService = new ReportService();

router.post('/', authMiddleware, reportController.createReport.bind(reportController));
router.put('/:id/sections', authMiddleware, reportController.updateSection.bind(reportController));


/**
 * @swagger
 * /api/reports/projects/{projectId}:
 *   get:
 *     summary: Get all reports for a specific project (Teacher only)
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
 *         description: List of reports for the project
 */

router.get('/projects/:projectId', 
  authMiddleware, 
  requireTeacher, 
  async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const reports = await reportService.getReportsByProject(projectId);
      res.json(reports);
    } catch (error: any) {
      console.error('Erreur getReportsByProject:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/**
 * @swagger
 * /api/reports/projects/{projectId}/report-config:
 *   post:
 *     summary: Save report configuration for a project (Teacher only)
 *     tags: [Reports]
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
 *               isEnabled:
 *                 type: boolean
 *               sections:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     sectionTitle:
 *                       type: string
 *                     orderIndex:
 *                       type: integer
 *               format:
 *                 type: string
 *                 enum: [markdown, pdf]
 *     responses:
 *       200:
 *         description: Report configuration saved successfully
 */
router.post('/projects/:projectId/report-config', 
  authMiddleware, 
  requireTeacher, 
  async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const config = await reportService.saveReportConfig(projectId, req.body);
      res.json(config);
    } catch (error: any) {
      console.error('Erreur saveReportConfig:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/** 
 * * @swagger
 * /api/reports/projects/{projectId}/report-config:
 *   get:
 *     summary: Get report configuration for a project
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
 *         description: Report configuration retrieved successfully
 */
router.get('/projects/:projectId/report-config', 
  authMiddleware, 
  async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const config = await reportService.getReportConfig(projectId);
      
      if (!config) {
        return res.json({ 
          isEnabled: false, 
          sections: [],
          format: 'markdown',
          projectId
        });
      }
      
      res.json(config);
    } catch (error: any) {
      console.error('Erreur getReportConfig:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/** 
 * * @swagger
 * /api/reports/groups/{groupId}/projects/{projectId}:
 *   get:
 *     summary: Get report for a specific group and project
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Group report retrieved successfully
 */
router.get('/groups/:groupId/projects/:projectId', 
  authMiddleware, 
  async (req, res) => {
    try {
      const { groupId, projectId } = req.params;
      const report = await reportService.getGroupReport(
        parseInt(projectId), 
        parseInt(groupId)
      );
      res.json(report);
    } catch (error: any) {
      console.error('Erreur getGroupReport:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/** 
 * @swagger
 * /api/reports/sections/{sectionConfigId}/content:
 *   put:
 *     summary: Update content of a report section
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionConfigId
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
 *               content:
 *                 type: string
 *               groupId:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Section content updated successfully
 */
router.put('/sections/:sectionConfigId/content', 
  authMiddleware, 
  async (req, res) => {
    try {
      const sectionConfigId = parseInt(req.params.sectionConfigId);
      const { content, groupId } = req.body;
      
      const updated = await reportService.updateSectionContent(
        sectionConfigId, 
        groupId, 
        content
      );
      
      res.json(updated);
    } catch (error: any) {
      console.error('Erreur updateSectionContent:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

/** * @swagger
 * /api/reports/groups/{groupId}/projects/{projectId}/submit:
 *   post:
 *     summary: Submit report for a group and project
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Report submitted successfully
 */
router.post('/groups/:groupId/projects/:projectId/submit', 
  authMiddleware, 
  async (req, res) => {
    try {
      const { groupId, projectId } = req.params;
      const submitted = await reportService.submitReport(
        parseInt(projectId), 
        parseInt(groupId)
      );
      res.json(submitted);
    } catch (error: any) {
      console.error('Erreur submitReport:', error);
      res.status(500).json({ message: error.message });
    }
  }
);


/** * @swagger
 * /api/reports/{reportId}:
 *   get:
 *     summary: Get report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Report retrieved successfully
 */
router.get('/:reportId', 
  authMiddleware, 
  async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      const report = await reportService.getReportById(reportId);
      
      if (!report) {
        return res.status(404).json({ message: 'Rapport non trouvé' });
      }
      
      res.json(report);
    } catch (error: any) {
      console.error('Erreur getReportById:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

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
 *             properties:
 *               title:
 *                 type: string
 *               description:
 *                 type: string
 *               groupId:
 *                 type: integer
 *               projectId:
 *                 type: integer
 *     responses:
 *       201:
 *         description: Report created successfully
 */
router.post('/', authMiddleware, async (req, res) => {
  try {
    const { title, description, groupId, projectId } = req.body;
    const report = await reportService.createReport(projectId, groupId, title, description);
    res.status(201).json(report);
  } catch (error: any) {
    console.error('Erreur createReport:', error);
    res.status(500).json({ message: error.message });
  }
});

/** 
 * @swagger
 * /api/reports/section-config/{sectionConfigId}:
 *   delete:
 *     summary: Delete report section configuration by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionConfigId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Section configuration deleted successfully
 */
router.delete('/section-config/:sectionConfigId', 
  authMiddleware, 
  requireTeacher,
  async (req, res) => {
    try {
      const sectionConfigId = parseInt(req.params.sectionConfigId);
      await reportService.deleteSectionConfig(sectionConfigId);
      res.json({ message: 'Section de configuration supprimée' });
    } catch (error: any) {
      console.error('Erreur deleteSectionConfig:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Supprimer un rapport complet (enseignant uniquement)
/** 
 * @swagger
 * /api/reports/{reportId}:
 *   delete:
 *     summary: Delete report by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: reportId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Report deleted successfully
 */
router.delete('/:reportId', 
  authMiddleware, 
  requireTeacher,
  async (req, res) => {
    try {
      const reportId = parseInt(req.params.reportId);
      await reportService.deleteReport(reportId);
      res.json({ message: 'Rapport supprimé avec succès' });
    } catch (error: any) {
      console.error('Erreur deleteReport:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Supprimer une section d'un rapport (enseignant uniquement)
/** 
 * @swagger
 * /api/reports/sections/{sectionId}:
 *   delete:
 *     summary: Delete report section by ID
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Report section deleted successfully
 */
router.delete('/sections/:sectionId', 
  authMiddleware, 
  requireTeacher,
  async (req, res) => {
    try {
      const sectionId = parseInt(req.params.sectionId);
      await reportService.deleteReportSection(sectionId);
      res.json({ message: 'Section supprimée avec succès' });
    } catch (error: any) {
      console.error('Erreur deleteReportSection:', error);
      res.status(500).json({ message: error.message });
    }
  }
);

// Supprimer la configuration complète d'un projet
/** 
 * @swagger
 * /api/reports/projects/{projectId}/report-config:
 *   delete:
 *     summary: Delete report configuration for a project
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
 *         description: Report configuration deleted successfully
 */
router.delete('/projects/:projectId/report-config', 
  authMiddleware, 
  requireTeacher,
  async (req, res) => {
    try {
      const projectId = parseInt(req.params.projectId);
      await reportService.deleteReportConfig(projectId);
      res.json({ message: 'Configuration supprimée avec succès' });
    } catch (error: any) {
      console.error('Erreur deleteReportConfig:', error);
      res.status(500).json({ message: error.message });
    }
  }
);
export default router;