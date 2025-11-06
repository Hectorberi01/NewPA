"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliverableController = void 0;
const deliverable_service_1 = require("../services/deliverable.service");
const client_s3_1 = require("@aws-sdk/client-s3");
const aws_config_1 = require("../config/aws.config");
class DeliverableController {
    constructor() {
        this.deliverableService = new deliverable_service_1.DeliverableService();
    }
    async getGroupSubmission(req, res) {
        try {
            console.log('Params received:', req.params);
            const deliverableId = parseInt(req.params.deliverableId);
            const groupId = parseInt(req.params.groupId);
            // Validation des paramètres
            if (isNaN(deliverableId) || isNaN(groupId)) {
                return res.status(400).json({
                    error: 'Invalid parameters',
                    details: `deliverableId: ${req.params.deliverableId}, groupId: ${req.params.groupId}`
                });
            }
            console.log(`Fetching submission for deliverable ${deliverableId}, group ${groupId}`);
            const submission = await this.deliverableService.getGroupSubmission(deliverableId, groupId);
            if (!submission) {
                console.log('No submission found');
                return res.status(404).json({
                    error: 'Submission not found',
                    message: `No submission found for deliverable ${deliverableId} and group ${groupId}`
                });
            }
            console.log('Submission found:', submission.id);
            res.json(submission);
        }
        catch (error) {
            console.error('Error in getGroupSubmission:', error);
            res.status(500).json({
                error: 'Internal Server Error',
                message: error.message,
                details: 'Check server logs for more information'
            });
        }
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
    async validateDeliverable(req, res) {
        try {
            const deliverableId = parseInt(req.params.id);
            const { groupId, gitUrl } = req.body;
            const file = req.file;
            if (!groupId) {
                res.status(400).json({ error: 'Group ID is required' });
                return;
            }
            const validationResults = await this.deliverableService.validateDeliverableBeforeSubmit(deliverableId, parseInt(groupId), file, gitUrl);
            res.json(validationResults);
        }
        catch (error) {
            res.status(500).json({ error: error.message });
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
            console.log(req.body);
            const deliverableId = parseInt(req.params.id);
            const { groupId, gitUrl } = req.body;
            let submissionData = { gitUrl };
            if (req.file) {
                //submissionData.filePath = req.file.path;
                submissionData.filePath = req.file.location;
                submissionData.fileKey = req.file.key;
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
            res.status(500).json({ error: error.message || 'Internal Server Error' });
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
    async download(req, res, next) {
        try {
            const submissionId = Number(req.params.id);
            if (!Number.isFinite(submissionId)) {
                return res.status(400).json({ message: "Invalid id" });
            }
            const { bucketName, key } = await this.deliverableService.downloadSubmission(submissionId);
            const command = new client_s3_1.GetObjectCommand({
                Bucket: bucketName,
                Key: key,
            });
            const data = await aws_config_1.s3Client.send(command);
            // Définir les bons headers
            res.setHeader("Content-Type", data.ContentType || "application/octet-stream");
            res.setHeader("Content-Disposition", `attachment; filename="${key.split("/").pop()}"`);
            // Stream du contenu S3 vers la réponse HTTP
            const stream = data.Body;
            stream.pipe(res);
        }
        catch (error) {
            console.error("Error downloading file:", error);
            res.status(500).json({ message: "Error downloading file" });
        }
    }
}
exports.DeliverableController = DeliverableController;
