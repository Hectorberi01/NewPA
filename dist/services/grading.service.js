"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingService = void 0;
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
const typeorm_1 = require("typeorm");
class GradingService {
    constructor() {
        this.gradingGridRepository = data_source_1.AppDataSource.getRepository(Entities_1.GradingGrid);
        this.criterionRepository = data_source_1.AppDataSource.getRepository(Entities_1.GradingCriterion);
        this.gradeRepository = data_source_1.AppDataSource.getRepository(Entities_1.Grade);
        this.criterionGradeRepository = data_source_1.AppDataSource.getRepository(Entities_1.CriterionGrade);
        this.groupRepository = data_source_1.AppDataSource.getRepository(Entities_1.Group);
        this.projectRepository = data_source_1.AppDataSource.getRepository(Entities_1.Project);
    }
    async createGradingGrid(gridData) {
        if (!gridData.projectId) {
            throw new Error("projectId manquant pour la création de la grille");
        }
        const project = await this.projectRepository.findOne({ where: { id: gridData.projectId } });
        if (!project) {
            throw new Error(`Projet avec l'ID ${gridData.projectId} introuvable`);
        }
        const grid = this.gradingGridRepository.create({
            name: gridData.name,
            description: gridData.description,
            type: gridData.type,
            weight: gridData.weight,
            project,
        });
        return await this.gradingGridRepository.save(grid);
    }
    async updateGradingGrid(id, gridData) {
        const grid = await this.gradingGridRepository.findOne({
            where: { id },
            relations: ['criteria']
        });
        if (!grid)
            throw new Error('Grading grid not found');
        Object.assign(grid, gridData);
        return await this.gradingGridRepository.save(grid);
    }
    // Suppression d'une grille de notation
    async deleteGradingGrid(id) {
        const grid = await this.gradingGridRepository.findOne({
            where: { id },
            relations: ['criteria', 'grades']
        });
        if (!grid)
            throw new Error('Grading grid not found');
        // Supprimer d'abord les grades associés
        if (grid.grades && grid.grades.length > 0) {
            await this.gradeRepository.remove(grid.grades);
        }
        // Supprimer les critères
        if (grid.criteria && grid.criteria.length > 0) {
            await this.criterionRepository.remove(grid.criteria);
        }
        // Supprimer la grille
        await this.gradingGridRepository.remove(grid);
    }
    // Récupérer une grille de notation par ID
    async getGradingGridById(id) {
        return await this.gradingGridRepository.findOne({
            where: { id },
            relations: ['criteria', 'project', 'grades']
        });
    }
    // Ajout d'un critère à une grille de notation
    async addCriterion(gridId, criterionData) {
        const grid = await this.gradingGridRepository.findOne({ where: { id: gridId } });
        if (!grid)
            throw new Error('Grading grid not found');
        const criterion = this.criterionRepository.create({
            ...criterionData,
            gradingGrid: grid
        });
        return await this.criterionRepository.save(criterion);
    }
    // Mise à jour d'un critère de notation
    async updateCriterion(id, criterionData) {
        const criterion = await this.criterionRepository.findOne({ where: { id } });
        if (!criterion)
            throw new Error('Criterion not found');
        Object.assign(criterion, criterionData);
        return await this.criterionRepository.save(criterion);
    }
    // Dans GradingService - AJOUTEZ CETTE MÉTHODE
    async getGradingSessionByGridAndGroup(gridId, groupId) {
        const grade = await this.gradeRepository.findOne({
            where: {
                gradingGrid: { id: gridId },
                group: { id: groupId }
            },
            relations: [
                'gradingGrid',
                'gradingGrid.criteria',
                'group',
                'criterionGrades',
                'criterionGrades.criterion'
            ]
        });
        if (!grade) {
            return null;
        }
        return {
            id: grade.id,
            gridId: grade.gradingGrid.id,
            groupId: grade.group.id,
            entries: grade.criterionGrades?.map(cg => ({
                id: cg.id,
                criterionId: cg.criterion.id,
                groupId: grade.group.id,
                score: cg.score,
                comment: cg.comments || '',
                gradedBy: 0,
                status: grade.isValidated ? 'validated' : 'draft'
            })) || [],
            globalComment: grade.globalComments || '',
            totalScore: grade.totalScore || 0,
            status: grade.isValidated ? 'validated' : 'draft',
            gradedBy: 0,
            gradedAt: grade.updatedAt
        };
    }
    // Suppression d'un critère de notation
    async deleteCriterion(id) {
        const criterion = await this.criterionRepository.findOne({
            where: { id },
            relations: ['criterionGrades']
        });
        if (!criterion)
            throw new Error('Criterion not found');
        // Supprimer les notes associées à ce critère
        if (criterion.criterionGrades && criterion.criterionGrades.length > 0) {
            await this.criterionGradeRepository.remove(criterion.criterionGrades);
        }
        await this.criterionRepository.remove(criterion);
    }
    // Récupérer toutes les grilles de notation d'un projet
    async getGradingGridsByProject(projectId) {
        return await this.gradingGridRepository.find({
            where: { project: { id: projectId } },
            relations: ['criteria'],
            order: { createdAt: 'ASC' }
        });
    }
    // Noter un groupe pour une grille de notation
    async gradeGroup(gradingGridId, groupId, criterionGrades, globalComments) {
        const grid = await this.gradingGridRepository.findOne({
            where: { id: gradingGridId },
            relations: [
                'criteria',
            ]
        });
        console.log('Found grading grid:', grid);
        if (!grid)
            throw new Error('Grading grid not found');
        const group = await this.groupRepository.findOne({ where: { id: groupId } });
        if (!group)
            throw new Error('Group not found');
        // Vérifier si une note existe déjà
        let grade = await this.gradeRepository.findOne({
            where: {
                gradingGrid: { id: gradingGridId },
                group: { id: groupId }
            },
            relations: [
                'criterionGrades',
            ]
        });
        console.log('Existing grade:', grade);
        if (!grade) {
            grade = this.gradeRepository.create({
                gradingGrid: grid,
                group: group,
                globalComments
            });
        }
        else {
            grade.globalComments = globalComments;
            // Supprimer les anciennes notes de critères
            if (grade.criterionGrades && grade.criterionGrades.length > 0) {
                await this.criterionGradeRepository.remove(grade.criterionGrades);
            }
        }
        const savedGrade = await this.gradeRepository.save(grade);
        console.log('Saved grade:', savedGrade);
        // Créer les nouvelles notes de critères
        const criterionGradeEntities = [];
        let totalScore = 0;
        let maxPossibleScore = 0;
        for (const criterionGradeData of criterionGrades) {
            console.log('Processing criterion grade data:', criterionGradeData);
            const criterion = grid.criteria.find(c => c.id === criterionGradeData.criterionId);
            console.log('Found criterion:', criterion);
            if (!criterion) {
                throw new Error(`Criterion with id ${criterionGradeData.criterionId} not found in this grading grid`);
            }
            // Valider le score
            if (criterionGradeData.score > criterion.maxScore) {
                throw new Error(`Score ${criterionGradeData.score} exceeds maximum ${criterion.maxScore} for criterion ${criterion.name}`);
            }
            const criterionGrade = this.criterionGradeRepository.create({
                grade: savedGrade,
                criterion: criterion,
                score: criterionGradeData.score,
                comments: criterionGradeData.comments
            });
            console.log('Created criterion grade:', criterionGrade);
            criterionGradeEntities.push(criterionGrade);
            // Calculer le score total pondéré
            totalScore += criterionGradeData.score * criterion.weight;
            maxPossibleScore += criterion.maxScore * criterion.weight;
        }
        console.log('Criterion grades to save:', criterionGradeEntities);
        await this.criterionGradeRepository.save(criterionGradeEntities);
        // Calculer et sauvegarder le score total
        savedGrade.totalScore = maxPossibleScore > 0 ? (totalScore / maxPossibleScore) * 20 : 0; // Score sur 20
        await this.gradeRepository.save(savedGrade);
        const result = await this.gradeRepository.findOne({
            where: { id: savedGrade.id },
            relations: ['criterionGrades', 'criterionGrades.criterion', 'gradingGrid', 'group']
        });
        if (!result) {
            throw new Error('Grade not found after saving');
        }
        return result;
    }
    // Récupérer les notes d'un groupe
    async getGradesByGroup(groupId) {
        return await this.gradeRepository.find({
            where: { group: { id: groupId } },
            relations: ['gradingGrid', 'criterionGrades', 'criterionGrades.criterion'],
            order: { createdAt: 'ASC' }
        });
    }
    async getGradesByProject(projectId) {
        return await this.gradeRepository.find({
            where: { gradingGrid: { project: { id: projectId } } },
            relations: [
                'gradingGrid',
                'group',
                'group.members',
                'criterionGrades',
                'criterionGrades.criterion'
            ],
        });
    }
    async getGradeById(gradeId) {
        return await this.gradeRepository.findOne({
            where: { id: gradeId },
            relations: [
                'gradingGrid',
                'group',
                'group.members',
                'criterionGrades',
                'criterionGrades.criterion'
            ]
        });
    }
    // Valider une ou plusieurs notes
    async validateGrades(gradeIds) {
        const grades = await this.gradeRepository.findByIds(gradeIds);
        for (const grade of grades) {
            grade.isValidated = true;
        }
        return await this.gradeRepository.save(grades);
    }
    // Calculer la note finale d'un projet pour un groupe
    async calculateProjectGrade(projectId, groupId) {
        const grades = await this.gradeRepository.find({
            where: {
                group: { id: groupId },
                gradingGrid: { project: { id: projectId } }
            },
            relations: ['gradingGrid', 'criterionGrades']
        });
        let weightedSum = 0;
        let totalWeight = 0;
        for (const grade of grades) {
            if (grade.isValidated && grade.totalScore !== null) {
                weightedSum += (grade.totalScore ?? 0) * grade.gradingGrid.weight;
                totalWeight += grade.gradingGrid?.weight;
            }
        }
        return totalWeight > 0 ? weightedSum / totalWeight : 0;
    }
    async getProjectGradingSummary(projectId) {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['groups', 'groups.members']
        });
        if (!project)
            throw new Error('Project not found');
        const gradingGrids = await this.getGradingGridsByProject(projectId);
        const allGrades = await this.getGradesByProject(projectId);
        const summary = {
            project: {
                id: project.id,
                name: project.name
            },
            gradingGrids: gradingGrids.map(grid => ({
                id: grid.id,
                name: grid.name,
                type: grid.type,
                weight: grid.weight
            })),
            groups: await Promise.all(project.groups.map(async (group) => {
                const groupGrades = allGrades.filter(g => g.group.id === group.id);
                const finalGrade = await this.calculateProjectGrade(projectId, group.id);
                return {
                    id: group.id,
                    name: group.name,
                    members: group.members.map(member => ({
                        id: member.id,
                        firstName: member.firstName,
                        lastName: member.lastName,
                        email: member.email
                    })),
                    grades: groupGrades.map(grade => ({
                        id: grade.id,
                        gridName: grade.gradingGrid.name,
                        gridType: grade.gradingGrid.type,
                        totalScore: grade.totalScore,
                        isValidated: grade.isValidated,
                        globalComments: grade.globalComments
                    })),
                    finalGrade,
                    isComplete: groupGrades.length === gradingGrids.length && groupGrades.every(g => g.isValidated)
                };
            }))
        };
        return summary;
    }
    async getGradingStatistics(projectId) {
        const grades = await this.getGradesByProject(projectId);
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['groups']
        });
        if (!project)
            throw new Error('Project not found');
        const totalGroups = project.groups.length;
        const gradedGroups = new Set(grades.map(g => g.group.id)).size;
        const validatedGrades = grades.filter(g => g.isValidated).length;
        const totalGrades = grades.length;
        const scores = grades
            .filter(g => g.totalScore !== null)
            .map(g => g.totalScore);
        const statistics = {
            totalGroups,
            gradedGroups,
            ungradedGroups: totalGroups - gradedGroups,
            gradingProgress: totalGroups > 0 ? (gradedGroups / totalGroups) * 100 : 0,
            validatedGrades,
            pendingValidation: totalGrades - validatedGrades,
            validationProgress: totalGrades > 0 ? (validatedGrades / totalGrades) * 100 : 0
        };
        if (scores.length > 0) {
            statistics.scoreStatistics = {
                average: scores.filter((s) => typeof s === 'number').reduce((a, b) => a + b, 0) / (scores.filter((s) => typeof s === 'number').length || 1),
                minimum: Math.min(...scores.filter((s) => typeof s === 'number')),
                maximum: Math.max(...scores.filter((s) => typeof s === 'number')),
                median: this.calculateMedian(scores.filter((s) => typeof s === 'number')),
                distribution: this.calculateScoreDistribution(scores.filter((s) => typeof s === 'number'))
            };
        }
        return statistics;
    }
    async updateGridWeights(projectId, weights) {
        const gridIds = weights.map(w => w.gridId);
        const grids = await this.gradingGridRepository.find({
            where: {
                id: (0, typeorm_1.In)(gridIds),
                project: { id: projectId }
            },
            relations: ['project']
        });
        if (grids.length !== weights.length) {
            const foundIds = grids.map(g => g.id);
            const missingIds = gridIds.filter(id => !foundIds.includes(id));
            throw new Error(`Les grilles suivantes n'appartiennent pas au projet ${projectId}: ${missingIds.join(', ')}`);
        }
        const updatedGrids = [];
        await this.gradingGridRepository.manager.transaction(async (manager) => {
            for (const { gridId, weight } of weights) {
                await manager.update(Entities_1.GradingGrid, { id: gridId }, { weight });
                // Récupérer la grille mise à jour
                const updatedGrid = await manager.findOne(Entities_1.GradingGrid, {
                    where: { id: gridId },
                    relations: ['project', 'criteria']
                });
                if (updatedGrid) {
                    updatedGrids.push(updatedGrid);
                }
            }
        });
        return updatedGrids;
    }
    calculateMedian(scores) {
        const sorted = scores.sort((a, b) => a - b);
        const mid = Math.floor(sorted.length / 2);
        if (sorted.length % 2 === 0) {
            return (sorted[mid - 1] + sorted[mid]) / 2;
        }
        else {
            return sorted[mid];
        }
    }
    calculateScoreDistribution(scores) {
        const ranges = [
            { min: 0, max: 4, label: '0-4' },
            { min: 4, max: 8, label: '4-8' },
            { min: 8, max: 12, label: '8-12' },
            { min: 12, max: 16, label: '12-16' },
            { min: 16, max: 20, label: '16-20' }
        ];
        const distribution = ranges.map(range => ({
            range: range.label,
            count: scores.filter(score => score >= range.min && score < range.max).length
        }));
        return distribution;
    }
    async duplicateGradingGrid(gridId, newName, newProjectId) {
        const originalGrid = await this.gradingGridRepository.findOne({
            where: { id: gridId },
            relations: ['criteria', 'project']
        });
        if (!originalGrid)
            throw new Error('Grading grid not found');
        // Créer la nouvelle grille
        const newGrid = this.gradingGridRepository.create({
            name: newName,
            type: originalGrid.type,
            weight: originalGrid.weight,
            description: originalGrid.description,
            project: newProjectId ? { id: newProjectId } : originalGrid.project
        });
        const savedGrid = await this.gradingGridRepository.save(newGrid);
        // Dupliquer les critères
        for (const criterion of originalGrid.criteria) {
            const newCriterion = this.criterionRepository.create({
                name: criterion.name,
                description: criterion.description,
                maxScore: criterion.maxScore,
                weight: criterion.weight,
                type: criterion.type,
                hasComments: criterion.hasComments,
                gradingGrid: savedGrid
            });
            await this.criterionRepository.save(newCriterion);
        }
        const duplicatedGrid = await this.getGradingGridById(savedGrid.id);
        if (!duplicatedGrid) {
            throw new Error('Duplicated grading grid not found');
        }
        return duplicatedGrid;
    }
    async getOrCreateGradingSession(gridId, groupId) {
        // Chercher une session existante
        const existingGrade = await this.gradeRepository.findOne({
            where: {
                gradingGrid: { id: gridId },
                group: { id: groupId }
            },
            relations: [
                'gradingGrid',
                'gradingGrid.criteria',
                'group',
                'criterionGrades',
                'criterionGrades.criterion'
            ]
        });
        if (existingGrade) {
            return existingGrade;
        }
        return null;
    }
    async saveGradingSession(gridId, groupId, sessionData, gradeId) {
        const grid = await this.gradingGridRepository.findOne({
            where: { id: gridId },
            relations: ['criteria']
        });
        if (!grid)
            throw new Error('Grading grid not found');
        const group = await this.groupRepository.findOne({
            where: { id: groupId }
        });
        if (!group)
            throw new Error('Group not found');
        let grade;
        if (gradeId && gradeId > 0) {
            const existingGrade = await this.gradeRepository.findOne({
                where: { id: gradeId },
                relations: ['criterionGrades']
            });
            if (!existingGrade)
                throw new Error('Grade not found');
            grade = existingGrade;
            grade.globalComments = sessionData.globalComment;
            grade.totalScore = sessionData.totalScore;
            grade.isValidated = sessionData.status === 'validated';
            // Supprimer les anciennes notes de critères
            if (grade.criterionGrades && grade.criterionGrades.length > 0) {
                await this.criterionGradeRepository.remove(grade.criterionGrades);
            }
        }
        else {
            grade = this.gradeRepository.create({
                gradingGrid: grid,
                group: group,
                globalComments: sessionData.globalComment,
                totalScore: sessionData.totalScore,
                isValidated: sessionData.status === 'validated'
            });
        }
        const savedGrade = await this.gradeRepository.save(grade);
        // Créer les notes de critères
        const criterionGrades = [];
        for (const entry of sessionData.entries) {
            const criterion = grid.criteria.find(c => c.id === entry.criterionId);
            if (!criterion)
                continue;
            const criterionGrade = this.criterionGradeRepository.create({
                grade: savedGrade,
                criterion: criterion,
                score: entry.score,
                comments: entry.comment
            });
            criterionGrades.push(criterionGrade);
        }
        await this.criterionGradeRepository.save(criterionGrades);
        // Recharger avec toutes les relations
        const result = await this.gradeRepository.findOne({
            where: { id: savedGrade.id },
            relations: [
                'gradingGrid',
                'gradingGrid.criteria',
                'group',
                'criterionGrades',
                'criterionGrades.criterion'
            ]
        });
        if (!result)
            throw new Error('Grade not found after saving');
        return result;
    }
    async getStudentGrades(userId) {
        const gradeRepo = data_source_1.AppDataSource.getRepository(Entities_1.Grade);
        const userRepo = data_source_1.AppDataSource.getRepository(Entities_1.User);
        const user = await userRepo.findOne({
            where: { id: userId },
            relations: ['groups', 'groups.project']
        });
        if (!user || !user.groups) {
            return [];
        }
        const groupIds = user.groups.map(g => g.id);
        const grades = await gradeRepo.find({
            where: {
                group: { id: (0, typeorm_1.In)(groupIds) },
                isValidated: true
            },
            relations: [
                'group',
                'group.project',
                'gradingGrid',
                'criterionGrades',
                'criterionGrades.criterion'
            ],
            order: {
                updatedAt: 'DESC'
            }
        });
        return grades.map(grade => ({
            id: grade.id,
            projectName: grade.group.project.name,
            projectId: grade.group.project.id,
            groupName: grade.group.name,
            type: grade.gradingGrid.type,
            title: grade.gradingGrid.name,
            grade: grade.totalScore || 0,
            maxGrade: this.calculateMaxScore(grade.gradingGrid),
            feedback: grade.globalComments,
            gradedAt: grade.updatedAt,
            criteria: grade.criterionGrades?.map(cg => ({
                name: cg.criterion.name,
                score: cg.score,
                maxScore: cg.criterion.maxScore,
                comments: cg.comments,
                weight: cg.criterion.weight
            })) || []
        }));
    }
    async getStudentProjectGrades(userId, projectId) {
        const gradeRepo = data_source_1.AppDataSource.getRepository(Entities_1.Grade);
        const groupRepo = data_source_1.AppDataSource.getRepository(Entities_1.Group);
        const group = await groupRepo
            .createQueryBuilder('group')
            .innerJoin('group.members', 'member')
            .innerJoin('group.project', 'project')
            .where('member.id = :userId', { userId })
            .andWhere('project.id = :projectId', { projectId })
            .getOne();
        if (!group) {
            return [];
        }
        // Récupérer les notes validées pour ce groupe
        const grades = await gradeRepo.find({
            where: {
                group: { id: group.id },
                isValidated: true
            },
            relations: [
                'group',
                'group.project',
                'gradingGrid',
                'criterionGrades',
                'criterionGrades.criterion'
            ],
            order: {
                gradingGrid: { type: 'ASC' },
                updatedAt: 'DESC'
            }
        });
        return grades.map(grade => ({
            id: grade.id,
            type: grade.gradingGrid.type,
            title: grade.gradingGrid.name,
            description: grade.gradingGrid.description,
            grade: grade.totalScore || 0,
            maxGrade: this.calculateMaxScore(grade.gradingGrid),
            weight: grade.gradingGrid.weight,
            feedback: grade.globalComments,
            gradedAt: grade.updatedAt,
            criteria: grade.criterionGrades?.map(cg => ({
                id: cg.id,
                name: cg.criterion.name,
                description: cg.criterion.description,
                score: cg.score,
                maxScore: cg.criterion.maxScore,
                weight: cg.criterion.weight,
                comments: cg.comments
            })) || []
        }));
    }
    async getGradeDetailsForStudent(userId, gradeId) {
        const gradeRepo = data_source_1.AppDataSource.getRepository(Entities_1.Grade);
        const grade = await gradeRepo.findOne({
            where: {
                id: gradeId,
                isValidated: true
            },
            relations: [
                'group',
                'group.members',
                'group.project',
                'gradingGrid',
                'gradingGrid.criteria',
                'criterionGrades',
                'criterionGrades.criterion'
            ]
        });
        if (!grade) {
            return null;
        }
        const isMember = grade.group.members.some(m => m.id === userId);
        if (!isMember) {
            throw new Error('Accès non autorisé à cette note');
        }
        return {
            id: grade.id,
            projectName: grade.group.project.name,
            groupName: grade.group.name,
            gridName: grade.gradingGrid.name,
            type: grade.gradingGrid.type,
            totalScore: grade.totalScore,
            maxScore: this.calculateMaxScore(grade.gradingGrid),
            weight: grade.gradingGrid.weight,
            globalComments: grade.globalComments,
            gradedAt: grade.updatedAt,
            criteria: grade.criterionGrades?.map(cg => ({
                id: cg.id,
                name: cg.criterion.name,
                description: cg.criterion.description,
                score: cg.score,
                maxScore: cg.criterion.maxScore,
                weight: cg.criterion.weight,
                comments: cg.comments,
                percentage: (cg.score / cg.criterion.maxScore) * 100
            }))
        };
    }
    calculateMaxScore(grid) {
        if (!grid.criteria || grid.criteria.length === 0) {
            return 20; // Valeur par défaut
        }
        return grid.criteria.reduce((sum, criterion) => {
            return sum + (criterion.maxScore * criterion.weight);
        }, 0);
    }
    async getGradingSessions(projectId, type) {
        const query = this.gradeRepository
            .createQueryBuilder('grade')
            .leftJoinAndSelect('grade.gradingGrid', 'gradingGrid')
            .leftJoinAndSelect('grade.group', 'group')
            .leftJoinAndSelect('grade.criterionGrades', 'criterionGrades')
            .leftJoinAndSelect('criterionGrades.criterion', 'criterion')
            .leftJoinAndSelect('gradingGrid.criteria', 'criteria')
            .where('gradingGrid.projectId = :projectId', { projectId });
        if (type) {
            query.andWhere('gradingGrid.type = :type', { type });
        }
        const grades = await query.getMany();
        return grades.map(grade => ({
            id: grade.id,
            gridId: grade.gradingGrid.id,
            groupId: grade.group.id,
            entries: grade.criterionGrades?.map(cg => ({
                id: cg.id,
                criterionId: cg.criterion.id,
                groupId: grade.group.id,
                score: cg.score,
                comment: cg.comments || '',
                gradedBy: 0, // À adapter selon votre modèle
                status: grade.isValidated ? 'validated' : 'draft'
            })) || [],
            globalComment: grade.globalComments || '',
            totalScore: grade.totalScore || 0,
            status: grade.isValidated ? 'validated' : 'draft',
            gradedBy: 0, // À adapter selon votre modèle
            gradedAt: grade.updatedAt
        }));
    }
    async getGradingSessionById(id) {
        const grade = await this.gradeRepository.findOne({
            where: { id },
            relations: [
                'gradingGrid',
                'gradingGrid.criteria',
                'group',
                'criterionGrades',
                'criterionGrades.criterion'
            ]
        });
        if (!grade) {
            return null;
        }
        return {
            id: grade.id,
            gridId: grade.gradingGrid.id,
            groupId: grade.group.id,
            entries: grade.criterionGrades?.map(cg => ({
                id: cg.id,
                criterionId: cg.criterion.id,
                groupId: grade.group.id,
                score: cg.score,
                comment: cg.comments || '',
                gradedBy: 0,
                status: grade.isValidated ? 'validated' : 'draft'
            })) || [],
            globalComment: grade.globalComments || '',
            totalScore: grade.totalScore || 0,
            status: grade.isValidated ? 'validated' : 'draft',
            gradedBy: 0,
            gradedAt: grade.updatedAt
        };
    }
    async createOrUpdateGradingSession(sessionData) {
        const { id, gridId, groupId, entries, globalComment, totalScore, status } = sessionData;
        const grid = await this.gradingGridRepository.findOne({
            where: { id: gridId },
            relations: ['criteria']
        });
        if (!grid) {
            throw new Error('Grading grid not found');
        }
        const group = await this.groupRepository.findOne({
            where: { id: groupId }
        });
        if (!group) {
            throw new Error('Group not found');
        }
        let grade;
        if (id && id > 0) {
            grade = await this.gradeRepository.findOne({
                where: { id },
                relations: ['criterionGrades']
            });
            if (!grade) {
                throw new Error('Grade not found');
            }
            grade.globalComments = globalComment;
            grade.totalScore = totalScore;
            grade.isValidated = status === 'validated';
            if (grade.criterionGrades && grade.criterionGrades.length > 0) {
                await this.criterionGradeRepository.remove(grade.criterionGrades);
            }
        }
        else {
            grade = this.gradeRepository.create({
                gradingGrid: grid,
                group: group,
                globalComments: globalComment,
                totalScore: totalScore,
                isValidated: status === 'validated'
            });
        }
        const savedGrade = await this.gradeRepository.save(grade);
        const criterionGrades = [];
        for (const entry of entries) {
            const criterion = grid.criteria.find(c => c.id === entry.criterionId);
            if (!criterion) {
                console.warn(`Criterion with id ${entry.criterionId} not found in grid ${gridId}`);
                continue;
            }
            const criterionGrade = this.criterionGradeRepository.create({
                grade: savedGrade,
                criterion: criterion,
                score: entry.score,
                comments: entry.comment || ''
            });
            criterionGrades.push(criterionGrade);
        }
        if (criterionGrades.length > 0) {
            await this.criterionGradeRepository.save(criterionGrades);
        }
        const result = await this.gradeRepository.findOne({
            where: { id: savedGrade.id },
            relations: [
                'gradingGrid',
                'gradingGrid.criteria',
                'group',
                'criterionGrades',
                'criterionGrades.criterion'
            ]
        });
        if (!result) {
            throw new Error('Grade not found after saving');
        }
        return {
            id: result.id,
            gridId: result.gradingGrid.id,
            groupId: result.group.id,
            entries: result.criterionGrades?.map(cg => ({
                id: cg.id,
                criterionId: cg.criterion.id,
                groupId: result.group.id,
                score: cg.score,
                comment: cg.comments || '',
                gradedBy: 0,
                status: result.isValidated ? 'validated' : 'draft'
            })) || [],
            globalComment: result.globalComments || '',
            totalScore: result.totalScore || 0,
            status: result.isValidated ? 'validated' : 'draft',
            gradedBy: 0,
            gradedAt: result.updatedAt
        };
    }
    async getGradingGridsByProjectAndType(projectId, type) {
        return await this.gradingGridRepository.find({
            where: {
                project: { id: projectId },
                type: type
            },
            relations: ['criteria'],
            order: { createdAt: 'ASC' }
        });
    }
}
exports.GradingService = GradingService;
