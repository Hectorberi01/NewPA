"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const report_controller_1 = require("../controllers/report.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const router = (0, express_1.Router)();
const controller = new report_controller_1.ReportController();
// ✅ Spécifiques en premier
router.get("/projects/:projectId", auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, controller.getReportsByProject.bind(controller));
router.post("/projects/:projectId/report-config", auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, controller.saveReportConfig.bind(controller));
router.get("/projects/:projectId/report-config", auth_middleware_1.authMiddleware, controller.getReportConfig.bind(controller));
router.get("/groups/:groupId/projects/:projectId", auth_middleware_1.authMiddleware, controller.getGroupReport.bind(controller));
router.post("/groups/:groupId/projects/:projectId/submit", auth_middleware_1.authMiddleware, controller.submitReport.bind(controller));
// ❗ Puis seulement les génériques
router.get("/:reportId", auth_middleware_1.authMiddleware, controller.getReportById.bind(controller));
router.delete("/:reportId", auth_middleware_1.authMiddleware, auth_middleware_1.requireTeacher, controller.deleteReport.bind(controller));
router.put("/:id/sections", auth_middleware_1.authMiddleware, controller.updateSection.bind(controller));
router.post("/", auth_middleware_1.authMiddleware, controller.createReport.bind(controller));
exports.default = router;
