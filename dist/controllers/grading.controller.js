"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingController = void 0;
const grading_service_1 = require("../services/grading.service");
class GradingController {
    constructor() {
        this.getGradingGridsByProject = async (req, res) => {
            try {
                const projectId = parseInt(req.params.projectId);
                const grids = await this.gradingService.getGradingGridsByProject(projectId);
                res.json(grids);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.getGradeById = async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const grade = await this.gradingService.getGradeById(id);
                res.json(grade);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.getProjectGradingGrids = async (req, res) => {
            try {
                const projectId = parseInt(req.params.projectId);
                const grids = await this.gradingService.getGradingGridsByProject(projectId);
                res.json(grids);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.getGradingGrid = async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const grid = await this.gradingService.getGradingGridById(id);
                if (!grid) {
                    return res.status(404).json({ error: 'Grading grid not found' });
                }
                res.json(grid);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.updateGradingGrid = async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const grid = await this.gradingService.updateGradingGrid(id, req.body);
                res.json(grid);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.deleteGradingGrid = async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                await this.gradingService.deleteGradingGrid(id);
                res.status(204).send();
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.duplicateGradingGrid = async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const { newName, newProjectId } = req.body;
                const duplicatedGrid = await this.gradingService.duplicateGradingGrid(id, newName, newProjectId);
                res.status(201).json(duplicatedGrid);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.addCriterion = async (req, res) => {
            try {
                const gridId = parseInt(req.params.gridId);
                const criterion = await this.gradingService.addCriterion(gridId, req.body);
                res.status(201).json(criterion);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.updateCriterion = async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const criterion = await this.gradingService.updateCriterion(id, req.body);
                res.json(criterion);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.deleteCriterion = async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                await this.gradingService.deleteCriterion(id);
                res.status(204).send();
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.getGroupGrades = async (req, res) => {
            try {
                const groupId = parseInt(req.params.groupId);
                const grades = await this.gradingService.getGradesByGroup(groupId);
                res.json(grades);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.getProjectGrades = async (req, res) => {
            try {
                const projectId = parseInt(req.params.projectId);
                const grades = await this.gradingService.getGradesByProject(projectId);
                res.json(grades);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.getGrade = async (req, res) => {
            try {
                const id = parseInt(req.params.id);
                const grade = await this.gradingService.getGradeById(id);
                if (!grade) {
                    return res.status(404).json({ error: 'Grade not found' });
                }
                res.json(grade);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.validateGrades = async (req, res) => {
            try {
                const { gradeIds } = req.body;
                const grades = await this.gradingService.validateGrades(gradeIds);
                res.json(grades);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.getGradingSummary = async (req, res) => {
            try {
                const projectId = parseInt(req.params.projectId);
                const summary = await this.gradingService.getProjectGradingSummary(projectId);
                res.json(summary);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.getGradingStatistics = async (req, res) => {
            try {
                const projectId = parseInt(req.params.projectId);
                const stats = await this.gradingService.getGradingStatistics(projectId);
                res.json(stats);
            }
            catch (error) {
                res.status(400).json({ error: error.message });
            }
        };
        this.getGradingSession = async (req, res) => {
            try {
                const { gridId, groupId } = req.query;
                if (!gridId || !groupId) {
                    return res.status(400).json({
                        message: 'gridId et groupId sont requis'
                    });
                }
                const session = await this.gradingService.getOrCreateGradingSession(Number(gridId), Number(groupId));
                if (!session) {
                    return res.status(404).json({
                        message: 'Aucune session trouvée'
                    });
                }
                // Transformer en format frontend
                const response = {
                    id: session.id,
                    gridId: session.gradingGrid.id,
                    groupId: session.group.id,
                    entries: session.criterionGrades?.map(cg => ({
                        id: cg.id,
                        criterionId: cg.criterion.id,
                        groupId: session.group.id,
                        score: cg.score,
                        comment: cg.comments || '',
                        gradedBy: 0, // À adapter selon votre logique d'authentification
                        gradedAt: session.createdAt,
                        status: session.isValidated ? 'validated' : 'draft'
                    })) || [],
                    globalComment: session.globalComments || '',
                    totalScore: session.totalScore || 0,
                    status: session.isValidated ? 'validated' : 'draft',
                    gradedBy: 0,
                    gradedAt: session.createdAt,
                    validatedAt: session.isValidated ? session.updatedAt : undefined
                };
                res.json(response);
            }
            catch (error) {
                console.error('Erreur getGradingSession:', error);
                res.status(500).json({ message: error.message });
            }
        };
        this.createOrUpdateGradingSession = async (req, res) => {
            try {
                const { gridId, groupId, entries, globalComment, totalScore, status } = req.body;
                if (!gridId || !groupId || !entries) {
                    return res.status(400).json({
                        message: 'gridId, groupId et entries sont requis'
                    });
                }
                const savedGrade = await this.gradingService.saveGradingSession(gridId, groupId, {
                    entries,
                    globalComment,
                    totalScore,
                    status: status || 'draft'
                }, req.body.id > 0 ? req.body.id : undefined);
                // Transformer en format frontend
                const response = {
                    id: savedGrade.id,
                    gridId: savedGrade.gradingGrid.id,
                    groupId: savedGrade.group.id,
                    entries: savedGrade.criterionGrades?.map(cg => ({
                        id: cg.id,
                        criterionId: cg.criterion.id,
                        groupId: savedGrade.group.id,
                        score: cg.score,
                        comment: cg.comments || '',
                        gradedBy: 0,
                        gradedAt: savedGrade.createdAt,
                        status: savedGrade.isValidated ? 'validated' : 'draft'
                    })) || [],
                    globalComment: savedGrade.globalComments || '',
                    totalScore: savedGrade.totalScore || 0,
                    status: savedGrade.isValidated ? 'validated' : 'draft',
                    gradedBy: 0,
                    gradedAt: savedGrade.createdAt,
                    validatedAt: savedGrade.isValidated ? savedGrade.updatedAt : undefined
                };
                res.json(response);
            }
            catch (error) {
                console.error('Erreur createOrUpdateGradingSession:', error);
                res.status(500).json({ message: error.message });
            }
        };
        // Dans grading.controller.ts
        /**
         * Récupère toutes les notes d'un étudiant
         */
        this.getStudentGrades = async (req, res) => {
            try {
                const userId = req.user.id; // ID de l'étudiant connecté
                const grades = await this.gradingService.getStudentGrades(userId);
                res.json(grades);
            }
            catch (error) {
                console.error('Erreur getStudentGrades:', error);
                res.status(500).json({ error: error.message });
            }
        };
        /**
         * Récupère les notes d'un étudiant pour un projet spécifique
         */
        this.getStudentProjectGrades = async (req, res) => {
            try {
                const userId = req.user.id;
                const projectId = parseInt(req.params.projectId);
                const grades = await this.gradingService.getStudentProjectGrades(userId, projectId);
                res.json(grades);
            }
            catch (error) {
                console.error('Erreur getStudentProjectGrades:', error);
                res.status(500).json({ error: error.message });
            }
        };
        /**
         * Récupère les détails d'une note spécifique
         */
        this.getGradeDetails = async (req, res) => {
            try {
                const userId = req.user.id;
                const gradeId = parseInt(req.params.gradeId);
                const grade = await this.gradingService.getGradeDetailsForStudent(userId, gradeId);
                if (!grade) {
                    return res.status(404).json({ error: 'Note non trouvée' });
                }
                res.json(grade);
            }
            catch (error) {
                console.error('Erreur getGradeDetails:', error);
                res.status(500).json({ error: error.message });
            }
        };
        this.gradingService = new grading_service_1.GradingService();
    }
    /**
     * @swagger
     * /api/grading/grids:
     *   post:
     *     summary: Create a new grading grid
     *     tags: [Grading]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [name, type, projectId]
     *             properties:
     *               name:
     *                 type: string
     *               type:
     *                 type: string
     *                 enum: [deliverable, report, defense]
     *               projectId:
     *                 type: integer
     *               weight:
     *                 type: number
     *                 default: 1.0
     *               description:
     *                 type: string
     *     responses:
     *       201:
     *         description: Grading grid created successfully
     */
    async createGradingGrid(req, res) {
        try {
            console.log('Creating grading grid with data:', req.body);
            const grid = await this.gradingService.createGradingGrid(req.body);
            res.status(201).json(grid);
        }
        catch (error) {
            res.status(500).json({ error: error });
        }
    }
    async calculateProjectGrade(req, res) {
        try {
            const projectId = parseInt(req.params.projectId);
            const groupId = parseInt(req.params.groupId);
            const finalGrade = await this.gradingService.calculateProjectGrade(projectId, groupId);
            res.json(finalGrade);
        }
        catch (error) {
            res.status(500).json({ error: error });
        }
    }
    /**
     * @swagger
     * /api/grading/grade:
     *   post:
     *     summary: Grade a group
     *     tags: [Grading]
     *     security:
     *       - bearerAuth: []
     *     requestBody:
     *       required: true
     *       content:
     *         application/json:
     *           schema:
     *             type: object
     *             required: [gradingGridId, groupId, criterionGrades]
     *             properties:
     *               gradingGridId:
     *                 type: integer
     *               groupId:
     *                 type: integer
     *               criterionGrades:
     *                 type: array
     *                 items:
     *                   type: object
     *                   properties:
     *                     criterionId:
     *                       type: integer
     *                     score:
     *                       type: number
     *                     comments:
     *                       type: string
     *     responses:
     *       201:
     *         description: Grade assigned successfully
     */
    async gradeGroup(req, res) {
        try {
            const { gradingGridId, groupId, criterionGrades } = req.body;
            const grade = await this.gradingService.gradeGroup(gradingGridId, groupId, criterionGrades);
            res.status(201).json(grade);
        }
        catch (error) {
            res.status(500).json({ error: error });
        }
    }
}
exports.GradingController = GradingController;
