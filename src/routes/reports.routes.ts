import { Router } from "express";
import { ReportController } from "../controllers/report.controller";
import { authMiddleware, requireTeacher } from "../middleware/auth.middleware";

const router = Router();
const controller = new ReportController();

// ✅ Spécifiques en premier
router.get("/projects/:projectId", authMiddleware, requireTeacher, controller.getReportsByProject.bind(controller));
router.post("/projects/:projectId/report-config", authMiddleware, requireTeacher, controller.saveReportConfig.bind(controller));
router.get("/projects/:projectId/report-config", authMiddleware, controller.getReportConfig.bind(controller));

router.get("/groups/:groupId/projects/:projectId", authMiddleware, controller.getGroupReport.bind(controller));
router.post("/groups/:groupId/projects/:projectId/submit", authMiddleware, controller.submitReport.bind(controller));

// ❗ Puis seulement les génériques
router.get("/:reportId", authMiddleware, controller.getReportById.bind(controller));
router.delete("/:reportId", authMiddleware, requireTeacher, controller.deleteReport.bind(controller));
router.put("/sections/:id/content", authMiddleware, controller.updateSection.bind(controller));
router.post("/", authMiddleware, controller.createReport.bind(controller));

export default router;
