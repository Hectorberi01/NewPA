"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GradingService = void 0;
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
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
        const grid = this.gradingGridRepository.create(gridData);
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
    async getGradingGridById(id) {
        return await this.gradingGridRepository.findOne({
            where: { id },
            relations: ['criteria', 'project', 'grades']
        });
    }
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
    async updateCriterion(id, criterionData) {
        const criterion = await this.criterionRepository.findOne({ where: { id } });
        if (!criterion)
            throw new Error('Criterion not found');
        Object.assign(criterion, criterionData);
        return await this.criterionRepository.save(criterion);
    }
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
    async getGradingGridsByProject(projectId) {
        return await this.gradingGridRepository.find({
            where: { project: { id: projectId } },
            relations: ['criteria'],
            order: { createdAt: 'ASC' }
        });
    }
    async gradeGroup(gradingGridId, groupId, criterionGrades, globalComments) {
        const grid = await this.gradingGridRepository.findOne({
            where: { id: gradingGridId },
            relations: ['criteria']
        });
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
            relations: ['criterionGrades']
        });
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
        // Créer les nouvelles notes de critères
        const criterionGradeEntities = [];
        let totalScore = 0;
        let maxPossibleScore = 0;
        for (const criterionGradeData of criterionGrades) {
            const criterion = grid.criteria.find(c => c.id === criterionGradeData.criterionId);
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
            criterionGradeEntities.push(criterionGrade);
            // Calculer le score total pondéré
            totalScore += criterionGradeData.score * criterion.weight;
            maxPossibleScore += criterion.maxScore * criterion.weight;
        }
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
            //order: { 'group.name': 'ASC', 'gradingGrid.name': 'ASC' }
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
    async validateGrades(gradeIds) {
        const grades = await this.gradeRepository.findByIds(gradeIds);
        for (const grade of grades) {
            grade.isValidated = true;
        }
        return await this.gradeRepository.save(grades);
    }
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
                totalWeight += grade.gradingGrid.weight;
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
    async exportGradesToCSV(projectId) {
        const summary = await this.getProjectGradingSummary(projectId);
        let csv = 'Groupe,Étudiants';
        // En-têtes des grilles de notation
        summary.gradingGrids.forEach((grid) => {
            csv += `,${grid.name}`;
        });
        csv += ',Note Finale\n';
        // Données des groupes
        summary.groups.forEach((group) => {
            csv += `${group.name},"${group.members.map((m) => `${m.firstName} ${m.lastName}`).join(', ')}"`;
            // Notes par grille
            summary.gradingGrids.forEach((grid) => {
                const grade = group.grades.find((g) => g.gridName === grid.name);
                csv += `,${grade ? grade.totalScore.toFixed(2) : 'Non noté'}`;
            });
            csv += `,${group.finalGrade.toFixed(2)}\n`;
        });
        return csv;
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
}
exports.GradingService = GradingService;
