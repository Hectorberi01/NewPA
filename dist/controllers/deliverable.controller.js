"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliverableController = void 0;
const deliverable_service_1 = require("../services/deliverable.service");
class DeliverableController {
    constructor() {
        this.deliverableService = new deliverable_service_1.DeliverableService();
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
    async createDeliverable(req, res) {
        try {
            const deliverable = await this.deliverableService.createDeliverable(req.body);
            res.status(201).json(deliverable);
        }
        catch (error) {
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
    async updateDeliverable(req, res) {
        try {
            const deliverableId = parseInt(req.params.id);
            const deliverable = await this.deliverableService.updateDeliverable(deliverableId, req.body);
            res.json(deliverable);
        }
        catch (error) {
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
    async addValidationRule(req, res) {
        try {
            const deliverableId = parseInt(req.params.id);
            const rule = await this.deliverableService.addValidationRule(deliverableId, req.body);
            res.status(201).json(rule);
        }
        catch (error) {
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
    async submitDeliverable(req, res) {
        try {
            const deliverableId = parseInt(req.params.id);
            const { groupId, gitUrl } = req.body;
            let submissionData = { gitUrl };
            if (req.file) {
                submissionData.filePath = req.file.path;
            }
            const submission = await this.deliverableService.submitDeliverable(deliverableId, parseInt(groupId), submissionData);
            res.status(201).json(submission);
        }
        catch (error) {
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
    async getSubmissions(req, res) {
        try {
            const deliverableId = parseInt(req.params.id);
            const submissions = await this.deliverableService.getDeliverableSubmissions(deliverableId);
            res.json(submissions);
        }
        catch (error) {
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
    async getSubmissionSummary(req, res) {
        try {
            const deliverableId = parseInt(req.params.id);
            const summary = await this.deliverableService.getSubmissionSummary(deliverableId);
            res.json(summary);
        }
        catch (error) {
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
    async analyzeSimilarity(req, res) {
        try {
            const deliverableId = parseInt(req.params.id);
            const results = await this.deliverableService.analyzeSimilarity(deliverableId);
            res.json(results);
        }
        catch (error) {
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
    async sendDeadlineReminders(req, res) {
        try {
            const deliverableId = parseInt(req.params.id);
            const { daysBefore = 2 } = req.body;
            await this.deliverableService.sendDeadlineReminders(deliverableId, daysBefore);
            res.json({ message: 'Reminders sent successfully' });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/{projectId}/deliverables:
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
    async getProjectDeliverables(req, res) {
        try {
            const projectId = parseInt(req.params.projectId);
            const deliverables = await this.deliverableService.getDeliverablesByProject(projectId);
            res.json(deliverables);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
}
exports.DeliverableController = DeliverableController;
