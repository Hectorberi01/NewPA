import { Request, Response } from "express";
import { ReportService } from "../services/report.service";
import { AuthenticatedRequest } from "../middleware/auth.middleware";

export class ReportController {
  private reportService : ReportService;

  constructor() {
    this.reportService = new ReportService();
  }

  /**
   * @swagger
   * /api/reports:
   *   post:
   *     summary: Créer un rapport
   *     tags: [Reports]
   *     security: [{ bearerAuth: [] }]
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
   *       201: { description: Rapport créé avec succès }
   */
  async createReport(req: Request, res: Response) {
    try {
      const { projectId, groupId, title, description } = req.body;
      const report = await this.reportService.createReport(projectId, groupId, title, description);
      res.status(201).json(report);
    } catch (error: any) {
      console.error("Erreur createReport:", error);
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * @swagger
   * /api/reports/{reportId}:
   *   get:
   *     summary: Récupérer un rapport par ID
   *     tags: [Reports]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: reportId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200: { description: Rapport trouvé }
   *       404: { description: Rapport non trouvé }
   */
  async getReportById(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.reportId);
      const report = await this.reportService.getReportById(reportId);
      if (!report) return res.status(404).json({ message: "Rapport non trouvé" });
      res.json(report);
    } catch (error: any) {
      console.error("Erreur getReportById:", error);
      res.status(500).json({ message: error.message });
    }
  }

  /**
   * @swagger
   * /api/reports/{reportId}:
   *   delete:
   *     summary: Supprimer un rapport
   *     tags: [Reports]
   *     security: [{ bearerAuth: [] }]
   *     parameters:
   *       - in: path
   *         name: reportId
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200: { description: Rapport supprimé }
   */
  async deleteReport(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.reportId);
      await this.reportService.deleteReport(reportId);
      res.json({ message: "Rapport supprimé avec succès" });
    } catch (error: any) {
      console.error("Erreur deleteReport:", error);
      res.status(500).json({ message: error.message });
    }
  }

  /**
 * @swagger
 * /api/reports/projects/{projectId}:
 *   get:
 *     summary: Obtenir tous les rapports d’un projet
 *     description: Retourne la liste complète des rapports liés à un projet spécifique.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du projet
 *     responses:
 *       200:
 *         description: Liste des rapports du projet
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 4
 *                   title:
 *                     type: string
 *                     example: "Rapport de stage"
 *                   description:
 *                     type: string
 *                     example: "Analyse du projet et résultats"
 *                   status:
 *                     type: string
 *                     example: "draft"
 *                   projectId:
 *                     type: integer
 *                     example: 1
 *                   groupId:
 *                     type: integer
 *                     example: 1
 *       404:
 *         description: Aucun rapport trouvé pour ce projet
 */
  async getReportsByProject(req: AuthenticatedRequest, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const reports = await this.reportService.getReportsByProject(projectId);
      return res.json(reports);

    } catch (error: any) {
      console.error("Erreur getReportsByProject:", error);
      return res.status(500).json({ message: error.message });
    }
  }

  /**
 * @swagger
 * /api/reports/groups/{groupId}/projects/{projectId}:
 *   get:
 *     summary: Récupérer le rapport d’un groupe pour un projet
 *     description: Retourne le rapport associé à un groupe et un projet donnés.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du groupe
 *         example: 1
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du projet
 *         example: 1
 *     responses:
 *       200:
 *         description: Rapport du groupe pour le projet
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 4
 *                 title:
 *                   type: string
 *                   example: "titre1"
 *                 description:
 *                   type: string
 *                   example: "CONTENU 1"
 *                 status:
 *                   type: string
 *                   example: "draft"
 *                 submittedAt:
 *                   type: string
 *                   nullable: true
 *                   example: null
 *                 projectId:
 *                   type: integer
 *                   example: 1
 *                 groupId:
 *                   type: integer
 *                   example: 1
 *                 sections:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                       title:
 *                         type: string
 *                       content:
 *                         type: string
 *                       orderIndex:
 *                         type: integer
 *       404:
 *         description: Rapport non trouvé
 */
  async getGroupReport(req: Request, res: Response) {
    console.log("getGroupReport called with params:", req.params);
    try {
      const { groupId, projectId } = req.params;
      const report = await this.reportService.getGroupReport(parseInt(projectId), parseInt(groupId));
      console.log("Report fetched:", report);
      res.json(report);
    } catch (error: any) {
      console.error("Erreur getGroupReport:", error);
      res.status(500).json({ message: error.message });
    }
  }

  /**
 * @swagger
 * /api/reports/projects/{projectId}/report-config:
 *   post:
 *     summary: Sauvegarder la configuration du rapport
 *     description: Crée ou met à jour la configuration de rapport d’un projet (enseignant uniquement).
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du projet
 *         example: 1
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               isEnabled:
 *                 type: boolean
 *                 example: true
 *               instructions:
 *                 type: string
 *                 example: "Chaque groupe doit soumettre un rapport au format Markdown avant la date limite."
 *               format:
 *                 type: string
 *                 enum: [markdown, html]
 *                 example: "markdown"
 *               deadline:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-01T23:59:00Z"
 *               sections:
 *                 type: array
 *                 description: Liste des sections de rapport configurées
 *                 items:
 *                   type: object
 *                   properties:
 *                     title:
 *                       type: string
 *                       example: "Introduction"
 *                     orderIndex:
 *                       type: integer
 *                       example: 1
 *     responses:
 *       200:
 *         description: Configuration de rapport sauvegardée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReportConfig"
 *       400:
 *         description: Paramètres invalides
 *       500:
 *         description: Erreur interne du serveur
 */

  async saveReportConfig(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const config = await this.reportService.saveReportConfig(projectId, req.body);
      res.json(config);
    } catch (error: any) {
      console.error("Erreur saveReportConfig:", error);
      res.status(500).json({ message: error.message });
    }
  }

  /**
 * @swagger
 * /api/reports/projects/{projectId}/report-config:
 *   get:
 *     summary: Récupérer la configuration du rapport d’un projet
 *     description: |
 *       Retourne la configuration actuelle du rapport pour un projet donné.  
 *       Si aucune configuration n'existe, renvoie un objet par défaut avec `"isEnabled": false`.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID du projet dont on souhaite obtenir la configuration
 *         example: 1
 *     responses:
 *       200:
 *         description: Configuration du rapport récupérée avec succès
 *         content:
 *           application/json:
 *             schema:
 *               oneOf:
 *                 - $ref: '#/components/schemas/ReportConfig'
 *                 - type: object
 *                   properties:
 *                     isEnabled:
 *                       type: boolean
 *                       example: false
 *                     sections:
 *                       type: array
 *                       items:
 *                         type: object
 *                       example: []
 *                     format:
 *                       type: string
 *                       example: markdown
 *                     projectId:
 *                       type: integer
 *                       example: 1
 *       404:
 *         description: Aucune configuration trouvée pour ce projet
 *       500:
 *         description: Erreur interne du serveur
 */
  async getReportConfig(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const config = await this.reportService.getReportConfig(projectId);
      if (!config) {
        return res.json({ isEnabled: false, sections: [], format: "markdown", projectId });
      }
      res.json(config);
    } catch (error: any) {
      console.error("Erreur getReportConfig:", error);
      res.status(500).json({ message: error.message });
    }
  }

  /**
 * @swagger
 * /api/reports/sections/{sectionConfigId}/content:
 *   put:
 *     summary: Mettre à jour le contenu d’une section de rapport
 *     description: Met à jour le contenu et les informations d’une section spécifique de rapport, liée à une configuration donnée.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: sectionConfigId
 *         required: true
 *         description: ID de la configuration de section à modifier
 *         schema:
 *           type: integer
 *           example: 3
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               content:
 *                 type: string
 *                 example: "Mise à jour du contenu de la section Introduction."
 *               sectionTitle:
 *                 type: string
 *                 example: "Introduction"
 *               orderIndex:
 *                 type: integer
 *                 example: 1
 *               groupId:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Section de rapport mise à jour avec succès
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ReportSection"
 *       400:
 *         description: Paramètres invalides
 *       404:
 *         description: Section introuvable
 *       500:
 *         description: Erreur interne du serveur
 */

  async updateSection(req: Request, res: Response) {
    try {
      const reportId = parseInt(req.params.id);
      const { sectionTitle, content, orderIndex } = req.body;
      const updated = await this.reportService.updateReportSection(reportId, sectionTitle, content, orderIndex);
      res.json(updated);
    } catch (error: any) {
      console.error("Erreur updateSection:", error);
      res.status(500).json({ message: error.message });
    }
  }

  /**
 * @swagger
 * /api/reports/groups/{groupId}/projects/{projectId}/submit:
 *   post:
 *     summary: Soumettre le rapport d'un groupe pour un projet
 *     description: Marque le rapport d'un groupe comme soumis pour le projet correspondant.
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: groupId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: ID du groupe
 *       - in: path
 *         name: projectId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *         description: ID du projet
 *     responses:
 *       200:
 *         description: Rapport soumis avec succès
 *       404:
 *         description: Rapport introuvable
 *       500:
 *         description: Erreur interne du serveur
 */
  async submitReport(req: Request, res: Response) {
    try {
      const { groupId, projectId } = req.params;
      const submitted = await this.reportService.submitReport(parseInt(projectId), parseInt(groupId));
      res.json(submitted);
    } catch (error: any) {
      console.error("Erreur submitReport:", error);
      res.status(500).json({ message: error.message });
    }
  }
}
