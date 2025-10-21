"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectController = void 0;
const project_service_1 = require("../services/project.service");
class ProjectController {
    constructor() {
        this.projectService = new project_service_1.ProjectService();
    }
    /**
     * @swagger
     * /api/projects:
     *   post:
     *     summary: Create a new project
     *     tags: [Projects]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             $ref: '#/components/schemas/CreateProject'
     *     responses:
     *       201:
     *         description: Project created successfully
     */
    async createProject(req, res) {
        try {
            const teacherId = req.user?.id;
            const projectData = { ...req.body, teacher: { id: teacherId } };
            console.log("Creating project with data:", projectData);
            const project = await this.projectService.createProject(projectData);
            res.status(201).json(project);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/{id}:
     *   get:
     *     summary: Get project by ID
     *     tags: [Projects]
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
     *         description: Project retrieved successfully
     */
    async getProjectById(req, res) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            const projectId = parseInt(req.params.id);
            let project;
            console.log(projectId);
            console.log(userId);
            console.log(userRole);
            if (userRole === 'student') {
                project = await this.projectService.getProjectsByIdForStudent(userId, projectId);
            }
            else {
                project = await this.projectService.getProjectById(projectId);
            }
            if (!project) {
                return res.status(404).json({ error: 'Project not found' });
            }
            res.json(project);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/{id}:
     *   put:
     *     summary: Update a project
     *     tags: [Projects]
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
     *             $ref: '#/components/schemas/CreateProject'
     *     responses:
     *       200:
     *         description: Project updated successfully
     */
    async updateProject(req, res) {
        try {
            const projectId = parseInt(req.params.id);
            const project = await this.projectService.updateProject(projectId, req.body);
            res.json(project);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/my:
     *   get:
     *     summary: Get projects for current user
     *     tags: [Projects]
     *     security:
     *       - bearerAuth: []
     *     responses:
     *       200:
     *         description: Projects retrieved successfully
     */
    async getMyProjects(req, res) {
        try {
            const userId = req.user?.id;
            const userRole = req.user?.role;
            if (!userId || !userRole) {
                return res.status(401).json({ error: 'Unauthorized' });
            }
            let projects;
            if (userRole === 'teacher') {
                projects = await this.projectService.getProjectsByTeacher(userId);
            }
            else {
                projects = await this.projectService.getProjectsByStudent(userId);
            }
            res.json(projects);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/{id}/groups/generate:
     *   post:
     *     summary: Generate random groups for a project
     *     tags: [Projects]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       201:
     *         description: Groups generated successfully
     */
    async generateRandomGroups(req, res) {
        try {
            const projectId = parseInt(req.params.id);
            const groups = await this.projectService.generateRandomGroups(projectId);
            res.status(201).json(groups);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/{id}/groups/manual:
     *   post:
     *     summary: Create manual groups for a project
     *     tags: [Projects]
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
     *             properties:
     *               groups:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     name:
     *                       type: string
     *                     memberIds:
     *                       type: array
     *                       items:
     *                         type: integer
     *     responses:
     *       201:
     *         description: Manual groups created successfully
     */
    async generateManualGroups(req, res) {
        try {
            const projectId = parseInt(req.params.id);
            const { groups: groupsData } = req.body;
            const groups = await this.projectService.generateManualGroups(projectId, groupsData);
            res.status(201).json(groups);
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/{id}/assign-unassigned:
     *   post:
     *     summary: Assign unassigned students to groups
     *     tags: [Projects]
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
     *         description: Unassigned students assigned successfully
     */
    async assignUnassignedStudents(req, res) {
        try {
            const projectId = parseInt(req.params.id);
            await this.projectService.assignUnassignedStudents(projectId);
            res.json({ message: 'Unassigned students have been distributed to groups' });
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/{id}:
     *   delete:
     *     summary: Delete a project
     *     tags: [Projects]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         schema:
     *           type: integer
     *     responses:
     *       204:
     *         description: Project deleted successfully
     */
    async deleteProject(req, res) {
        try {
            const projectId = parseInt(req.params.id);
            await this.projectService.deleteProject(projectId);
            res.status(204).send();
        }
        catch (error) {
            res.status(500).json({ error: 'Internal Server Error' });
        }
    }
    /**
     * @swagger
     * /api/projects/{projectId}/groups:
     *   put:
     *     summary: Save grouping (assign students to groups) for a project
     *     tags: [Projects]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: projectId
     *         required: true
     *         schema: { type: integer }
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [groups, unassignedIds]
     *             properties:
     *               groups:
     *                 type: array
     *                 items:
     *                   type: object
     *                   required: [id, memberIds]
     *                   properties:
     *                     id: { type: integer }
     *                     memberIds:
     *                       type: array
     *                       items: { type: integer }
     *               unassignedIds:
     *                 type: array
     *                 items: { type: integer }
     *           examples:
     *             example:
     *               value:
     *                 groups:
     *                   - id: 1
     *                     memberIds: [12, 15, 27]
     *                   - id: 2
     *                     memberIds: [31]
     *                 unassignedIds: [8, 9]
     *     responses:
     *       200:
     *         description: Grouping saved
     *       400:
     *         description: Validation error (duplicates, capacity exceeded, etc.)
     *       404:
     *         description: Project not found
     */
    async saveGrouping(req, res) {
        try {
            const projectId = Number(req.params.projectId);
            if (!Number.isFinite(projectId)) {
                return res.status(400).json({ message: "projectId invalide" });
            }
            const body = req.body;
            if (!body || !Array.isArray(body.groups) || !Array.isArray(body.unassignedIds)) {
                return res.status(400).json({ message: "Payload invalide" });
            }
            //const service =  new ProjectsService(AppDataSource);
            //const result = await service.saveGrouping(projectId, body);
            const result = await this.projectService.saveGrouping(projectId, body);
            return res.status(200).json({
                message: "Répartition enregistrée",
                ...result, // { updatedGroups, affectedLinks }
            });
        }
        catch (err) {
            if (err?.code === "CAPACITY_EXCEEDED") {
                return res.status(400).json({ message: err.message, details: err.details });
            }
            if (err?.code === "VALIDATION_ERROR") {
                return res.status(400).json({ message: err.message, details: err.details });
            }
            if (err?.code === "NOT_FOUND") {
                return res.status(404).json({ message: err.message });
            }
        }
    }
}
exports.ProjectController = ProjectController;
