import { Request, Response, NextFunction } from 'express';
import { DeliverableService } from '../services/deliverable.service';
import { uploadMiddleware } from '../middleware/upload.middleware';

export class DeliverableController {
  private deliverableService: DeliverableService;

  constructor() {
    this.deliverableService = new DeliverableService();
  }

  /**
   * @swagger
   * /api/deliverables:
   *   post:
   *     summary: Create a new deliverable
   *     tags: [Deliverables]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/CreateDeliverable'
   *     responses:
   *       201:
   *         description: Deliverable created successfully
   */
  async createDeliverable(req: Request, res: Response) {
    try {
      const deliverable = await this.deliverableService.createDeliverable(req.body);
      res.status(201).json(deliverable);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/deliverables/{id}:
   *   put:
   *     summary: Update a deliverable
   *     tags: [Deliverables]
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
   *             $ref: '#/components/schemas/CreateDeliverable'
   *     responses:
   *       200:
   *         description: Deliverable updated successfully
   */
  async updateDeliverable(req: Request, res: Response) {
    try {
      const deliverableId = parseInt(req.params.id);
      const deliverable = await this.deliverableService.updateDeliverable(deliverableId, req.body);
      res.json(deliverable);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/deliverables/{id}/rules:
   *   post:
   *     summary: Add validation rule to deliverable
   *     tags: [Deliverables]
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
   *             required: [type, configuration]
   *             properties:
   *               type:
   *                 type: string
   *                 enum: [max_size, file_presence, folder_structure, file_content]
   *               configuration:
   *                 type: string
   *                 description: JSON string with rule configuration
   *               errorMessage:
   *                 type: string
   *     responses:
   *       201:
   *         description: Validation rule added successfully
   */
  async addValidationRule(req: Request, res: Response) {
    try {
      const deliverableId = parseInt(req.params.id);
      const rule = await this.deliverableService.addValidationRule(deliverableId, req.body);
      res.status(201).json(rule);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/deliverables/{id}/submit:
   *   post:
   *     summary: Submit a deliverable
   *     tags: [Deliverables]
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
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               groupId:
   *                 type: integer
   *               file:
   *                 type: string
   *                 format: binary
   *               gitUrl:
   *                 type: string
   *     responses:
   *       201:
   *         description: Deliverable submitted successfully
   */
  async submitDeliverable(req: Request, res: Response) {
    try {
      console.log(req.body);
      const deliverableId = parseInt(req.params.id);
      const { groupId, gitUrl } = req.body;
      
      let submissionData: any = { gitUrl };
      
      if (req.file) {
        submissionData.filePath = req.file.path;
      }

      const submission = await this.deliverableService.submitDeliverable(
        deliverableId, 
        parseInt(groupId), 
        submissionData
      );
      res.status(201).json(submission);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/deliverables/{id}/submissions:
   *   get:
   *     summary: Get all submissions for a deliverable
   *     tags: [Deliverables]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Submissions retrieved successfully
   */
  async getSubmissions(req: Request, res: Response) {
    try {
      const deliverableId = parseInt(req.params.id);
      const submissions = await this.deliverableService.getDeliverableSubmissions(deliverableId);
      res.json(submissions);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/deliverables/{id}/summary:
   *   get:
   *     summary: Get submission summary for a deliverable
   *     tags: [Deliverables]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Submission summary retrieved successfully
   */
  async getSubmissionSummary(req: Request, res: Response) {
    try {
      const deliverableId = parseInt(req.params.id);
      const summary = await this.deliverableService.getSubmissionSummary(deliverableId);
      res.json(summary);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/deliverables/{id}/analyze-similarity:
   *   post:
   *     summary: Analyze similarity between submissions
   *     tags: [Deliverables]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: Similarity analysis completed
   */
  async analyzeSimilarity(req: Request, res: Response) {
    try {
      const deliverableId = parseInt(req.params.id);
      const results = await this.deliverableService.analyzeSimilarity(deliverableId);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/deliverables/{id}/send-reminders:
   *   post:
   *     summary: Send deadline reminders
   *     tags: [Deliverables]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     requestBody:
   *       required: false
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               daysBefore:
   *                 type: integer
   *                 default: 2
   *     responses:
   *       200:
   *         description: Reminders sent successfully
   */
  async sendDeadlineReminders(req: Request, res: Response) {
    try {
      const deliverableId = parseInt(req.params.id);
      const { daysBefore = 2 } = req.body;
      
      await this.deliverableService.sendDeadlineReminders(deliverableId, daysBefore);
      res.json({ message: 'Reminders sent successfully' });
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/deliverables/projects/{projectId}/deliverables:
   *   get:
   *     summary: Get all deliverables for a project
   *     tags: [Deliverables]
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
   *         description: Deliverables retrieved successfully
   */
  async getProjectDeliverables(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const deliverables = await this.deliverableService.getDeliverablesByProject(projectId);
      res.json(deliverables);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/deliverables/submissions/{id}/download:
   *   get:
   *     summary: Download a submission file
   *     tags: [Deliverables]
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: integer
   *     responses:
   *       200:
   *         description: File downloaded successfully
   *         content:
   *           application/octet-stream:
   *             schema:
   *               type: string
   *               format: binary
   *       404:
   *         description: Submission or file not found  
   */
  async download(req: Request, res: Response, next: NextFunction) {
    try {
      const submissionId = Number(req.params.id);
      if (!Number.isFinite(submissionId)) return res.status(400).json({ message: "Invalid id" });

      const { filePath, filename } =  await this.deliverableService.downloadSubmission(submissionId);

      // Option A: utiliser res.download (set Content-Type, Content-Disposition automatiquement)
      return res.download(filePath, filename, (err) => {
        if (err) {
          console.error("Error sending file:", err);
          if (!res.headersSent) res.status(500).json({ message: "Error sending file" });
        }
      });

      // Option B: stream manuel (décommenter si tu préfères)
      /*
      res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(filename)}"`);
      const stream = fs.createReadStream(filePath);
      stream.pipe(res);
      stream.on("error", (e) => {
        console.error(e);
        if (!res.headersSent) res.status(500).end();
      });
      */
    } catch (err: any) {
      if (err.message === "Submission not found") return res.status(404).json({ message: err.message });
      if (err.message === "No file associated with this submission") return res.status(404).json({ message: err.message });
      if (err.message === "File not found") return res.status(404).json({ message: "File not found on disk" });
      next(err);
    }
  }
}