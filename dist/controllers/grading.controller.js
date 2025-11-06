"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingController = void 0;
const grading_service_1 = require("../services/grading.service");
class GradingController {
    constructor() {
        this.getGradingGridsByProject = async (req, res) => {
            try {
                const projectId = parseInt(req.params.projectId);
                const type = req.query.type;
                let grids;
                if (type) {
                    grids = await this.gradingService.getGradingGridsByProjectAndType(projectId, type);
                }
                else {
                    grids = await this.gradingService.getGradingGridsByProject(projectId);
                }
                res.json(grids);
            }
            catch (error) {
                console.error('Erreur getGradingGridsByProject:', error);
                res.status(500).json({ message: error.message });
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
    // Dans GradingController - AJOUTEZ CETTE MÉTHODE
    async getGradingSessionsByProject(req, res) {
        try {
            const { projectId } = req.params;
            const { type } = req.query;
            if (!projectId) {
                return res.status(400).json({ error: 'projectId est requis' });
            }
            const sessions = await this.gradingService.getGradingSessions(Number(projectId), type);
            res.json(sessions);
        }
        catch (error) {
            console.error('Erreur getGradingSessionsByProject:', error);
            res.status(500).json({ error: error.message });
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
    async updateGridWeights(req, res) {
        try {
            const { projectId } = req.params;
            const { weights } = req.body;
            // ✅ Validation des paramètres
            if (!projectId || isNaN(parseInt(projectId))) {
                return res.status(400).json({
                    message: 'ID de projet invalide'
                });
            }
            if (!Array.isArray(weights) || weights.length === 0) {
                return res.status(400).json({
                    message: 'Le paramètre "weights" doit être un tableau non vide'
                });
            }
            // ✅ Validation du format des weights
            for (const weight of weights) {
                if (!weight.id || typeof weight.weight !== 'number') {
                    return res.status(400).json({
                        message: 'Format invalide : chaque élément doit avoir {id: number, weight: number}'
                    });
                }
            }
            // ✅ Vérifier que la somme des poids = 1
            const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
            if (Math.abs(totalWeight - 1) > 0.01) {
                return res.status(400).json({
                    message: `La somme des poids doit être égale à 1.00 (actuellement ${totalWeight.toFixed(3)})`
                });
            }
            // ✅ Convertir le format du frontend vers le backend
            const weightsData = weights.map((w) => ({
                gridId: w.id,
                weight: w.weight
            }));
            // ✅ Appel au service
            const updatedGrids = await this.gradingService.updateGridWeights(parseInt(projectId), weightsData);
            res.json({
                message: 'Pondérations mises à jour avec succès',
                grids: updatedGrids
            });
        }
        catch (error) {
            console.error('❌ Erreur updateGridWeights:', error);
            // Gestion des erreurs spécifiques
            if (error.message.includes('n\'appartient pas')) {
                return res.status(404).json({
                    message: error.message
                });
            }
            res.status(500).json({
                message: error.message || 'Erreur serveur lors de la mise à jour des pondérations'
            });
        }
    }
    async getGradingSession(req, res) {
        try {
            const { projectId, type, gridId, groupId } = req.query;
            // ✅ Accepte soit (projectId + type) soit (gridId + groupId)
            if (projectId && type) {
                // Récupération par projet et type
                const sessions = await this.gradingService.getGradingSessions(Number(projectId), type);
                return res.json(sessions);
            }
            else if (gridId && groupId) {
                // Récupération spécifique par grille et groupe
                const session = await this.gradingService.getGradingSessionByGridAndGroup(Number(gridId), Number(groupId));
                return res.json(session ? [session] : []);
            }
            else {
                return res.status(400).json({
                    error: 'Soit (projectId et type) soit (gridId et groupId) sont requis'
                });
            }
        }
        catch (error) {
            console.error('Erreur getGradingSession:', error);
            res.status(500).json({ error: error.message });
        }
    }
    // Dans GradingController
    async getGradingSessionById(req, res) {
        try {
            const { id } = req.params;
            const session = await this.gradingService.getGradingSessionById(Number(id));
            if (!session) {
                return res.status(404).json({ error: 'Session non trouvée' });
            }
            res.json(session);
        }
        catch (error) {
            console.error('Erreur getGradingSessionById:', error);
            res.status(500).json({ error: error.message });
        }
    }
    async createOrUpdateGradingSession(req, res) {
        try {
            const sessionData = req.body;
            const session = await this.gradingService.createOrUpdateGradingSession(sessionData);
            res.json(session);
        }
        catch (error) {
            console.error('Erreur createOrUpdateGradingSession:', error);
            res.status(500).json({ error: error.message });
        }
    }
}
exports.GradingController = GradingController;
