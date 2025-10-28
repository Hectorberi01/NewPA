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
router.get('/projects/:projectId', authMiddleware, requireTeacher, async (req, res) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const reports = await reportService.getReportsByProject(projectId);
    res.json(reports);
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});

// Exporter un rapport en PDF
router.get('/:reportId/export', authMiddleware, async (req, res) => {
  try {
    const reportId = parseInt(req.params.reportId);
    const report = await reportService.getReportById(reportId);

    if (!report) {
      return res.status(404).json({ message: 'Rapport non trouvé' });
    }

    // Créer le PDF
    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=rapport-${reportId}.pdf`);

    doc.pipe(res);

    // Titre
    doc.fontSize(20).text(report.title, { align: 'center' });
    doc.moveDown();
    doc.fontSize(12).text(`Groupe: ${report.group?.name}`, { align: 'center' });
    doc.moveDown(2);

    // Sections
    report.sections
      ?.sort((a, b) => a.orderIndex - b.orderIndex)
      .forEach(section => {
        doc.fontSize(16).text(section.title);
        doc.moveDown(0.5);
        doc.fontSize(11).text(section.content || 'Section non complétée');
        doc.moveDown(2);
      });

    doc.end();
  } catch (error: any) {
    res.status(500).json({ message: error.message });
  }
});


export default router;