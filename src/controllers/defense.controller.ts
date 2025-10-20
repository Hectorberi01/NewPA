import { Request, Response, NextFunction } from 'express';
import { Repository, DataSource, In } from 'typeorm';
import { DefenseService } from '../services/defense.service';
import { AppDataSource } from '../database/data-source';

export class DefenseController {
  private defenseService: DefenseService;
  private ds: DataSource;
  constructor() {
    this.defenseService = new DefenseService(AppDataSource);
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
async scheduleDefenses(req: Request, res: Response) {
  try {
    const projectId = parseInt(req.params.projectId);
    
    // Destructurer les deux modes possibles
    const { startDateTime, endDateTime, durationPerGroup, location } = req.body;

    // Validation de base
    if (!projectId || isNaN(projectId)) {
      return res.status(400).json({ error: 'projectId invalide' });
    }

    if (!startDateTime || !location) {
      return res.status(400).json({ 
        error: 'startDateTime et location sont requis' 
      });
    }

    // Vérifier qu'on a au moins un des deux modes
    if (!durationPerGroup && !endDateTime) {
      return res.status(400).json({ 
        error: 'Fournissez soit durationPerGroup, soit endDateTime' 
      });
    }

    // Déterminer le mode et passer les données au service
    let result;
    
    if (durationPerGroup && durationPerGroup > 0) {
      // MODE 1: Durée fixe
      result = await this.defenseService.scheduleDefenses(
        projectId,
        new Date(startDateTime),
        durationPerGroup,
        location,
        'fixed_duration'
      );
    } else if (endDateTime) {
      // MODE 2: Plage horaire
      result = await this.defenseService.scheduleDefenses(
        projectId,
        new Date(startDateTime),
        null, // durationPerGroup = null
        location,
        'time_range',
        new Date(endDateTime)
      );
    }

    return res.status(201).json({
      message: 'Défenses planifiées avec succès',
      data: result,
      mode: result.mode
    });
    
  } catch (error) {
    console.error('Erreur scheduleDefenses:', error);
    
    // Gérer les erreurs spécifiques
    if (error instanceof Error) {
      if (error.message.includes('Projet introuvable')) {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Aucun groupe')) {
        return res.status(400).json({ error: error.message });
      }
      if (error.message.includes('Durée')) {
        return res.status(400).json({ error: error.message });
      }
      return res.status(400).json({ error: error.message });
    }
    
    return res.status(500).json({ error: 'Internal Server Error' });
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
  async updateOrder(req: Request, res: Response, next: NextFunction) {
    try {
      const projectId = Number(req.params.projectId);
      const { newOrder } = req.body;
      console.log("updateOrder called with:", { projectId, newOrder });
      //const service = new DefensesService(AppDataSource);
      const updated = await this.defenseService.updateDefenseOrder(projectId, newOrder);

      return res.status(200).json({ message: "Ordre mis à jour", defenses: updated });
    } catch (err: any) {
      console.error("updateOrder error:", err);
      if (err?.code === "BAD_REQUEST" || err?.code === "VALIDATION_ERROR") {
        return res.status(400).json({ message: err.message, details: err.details ?? null });
      }
      if (err?.code === "NOT_FOUND") {
        return res.status(404).json({ message: err.message });
      }
      return next(err);
    }
  }
  // async updateDefenseOrder(req: Request, res: Response) {
  //   try {
  //     const projectId = parseInt(req.params.projectId);
  //     const { newOrder } = req.body;
  //     const defenses = await this.defenseService.updateDefenseOrder(projectId, newOrder);
  //     res.json(defenses);
  //   } catch (error) {
  //     res.status(500).json({ error: 'Internal Server Error' });
  //   }
  // }

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
  async downloadSchedulePDF(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const pdfBuffer = await this.defenseService.generateDefenseSchedulePDF(projectId);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=defense-schedule-${projectId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
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
  async downloadAttendancePDF(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const orderType = (req.query.orderType as 'group' | 'alphabetical') || 'group';
      const pdfBuffer = await this.defenseService.generateAttendanceSheetPDF(projectId, orderType);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=attendance-sheet-${projectId}.pdf`);
      res.send(pdfBuffer);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}