// services/grading.service.ts - IMPLÉMENTATION COMPLÈTE
import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { GradingGrid,GradingCriterion,Grade ,CriterionGrade,Group,Project, User} from '../entities/Entities';

import { In } from 'typeorm';

interface createGradingGridDTO {
  name: string;
  type: 'deliverable' | 'report' | 'defense';
  projectId: number;
  weight?: number;
  description?: string;
}



export class GradingService {
  private gradingGridRepository: Repository<GradingGrid>;
  private criterionRepository: Repository<GradingCriterion>;
  private gradeRepository: Repository<Grade>;
  private criterionGradeRepository: Repository<CriterionGrade>;
  private groupRepository: Repository<Group>;
  private projectRepository: Repository<Project>;

  constructor() {
    this.gradingGridRepository = AppDataSource.getRepository(GradingGrid);
    this.criterionRepository = AppDataSource.getRepository(GradingCriterion);
    this.gradeRepository = AppDataSource.getRepository(Grade);
    this.criterionGradeRepository = AppDataSource.getRepository(CriterionGrade);
    this.groupRepository = AppDataSource.getRepository(Group);
    this.projectRepository = AppDataSource.getRepository(Project);
  }

async createGradingGrid(gridData: any): Promise<GradingGrid> {
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


  async updateGradingGrid(id: number, gridData: any): Promise<GradingGrid> {
    const grid = await this.gradingGridRepository.findOne({
      where: { id },
      relations: ['criteria']
    });
    
    if (!grid) throw new Error('Grading grid not found');

    Object.assign(grid, gridData);
    return await this.gradingGridRepository.save(grid);
  }

  // Suppression d'une grille de notation
  async deleteGradingGrid(id: number): Promise<void> {
    const grid = await this.gradingGridRepository.findOne({
      where: { id },
      relations: ['criteria', 'grades']
    });
    
    if (!grid) throw new Error('Grading grid not found');

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
  async getGradingGridById(id: number): Promise<GradingGrid | null> {
    return await this.gradingGridRepository.findOne({
      where: { id },
      relations: ['criteria', 'project', 'grades']
    });
  }

  // Ajout d'un critère à une grille de notation
  async addCriterion(gridId: number, criterionData: Partial<GradingCriterion>): Promise<GradingCriterion> {
    const grid = await this.gradingGridRepository.findOne({ where: { id: gridId } });
    if (!grid) throw new Error('Grading grid not found');

    const criterion = this.criterionRepository.create({
      ...criterionData,
      gradingGrid: grid
    });

    return await this.criterionRepository.save(criterion);
  }

  // Mise à jour d'un critère de notation
  async updateCriterion(id: number, criterionData: Partial<GradingCriterion>): Promise<GradingCriterion> {
    const criterion = await this.criterionRepository.findOne({ where: { id } });
    if (!criterion) throw new Error('Criterion not found');

    Object.assign(criterion, criterionData);
    return await this.criterionRepository.save(criterion);
  }
// Dans GradingService - AJOUTEZ CETTE MÉTHODE
async getGradingSessionByGridAndGroup(gridId: number, groupId: number): Promise<any> {
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
  async deleteCriterion(id: number): Promise<void> {
    const criterion = await this.criterionRepository.findOne({
      where: { id },
      relations: ['criterionGrades']
    });
    
    if (!criterion) throw new Error('Criterion not found');

    // Supprimer les notes associées à ce critère
    if (criterion.criterionGrades && criterion.criterionGrades.length > 0) {
      await this.criterionGradeRepository.remove(criterion.criterionGrades);
    }

    await this.criterionRepository.remove(criterion);
  }

  // Récupérer toutes les grilles de notation d'un projet
  async getGradingGridsByProject(projectId: number): Promise<GradingGrid[]> {
    return await this.gradingGridRepository.find({
      where: { project: { id: projectId } },
      relations: ['criteria'],
      order: { createdAt: 'ASC' }
    });
  }

  // Noter un groupe pour une grille de notation
  async gradeGroup(
    gradingGridId: number,
    groupId: number,
    criterionGrades: { criterionId: number; score: number; comments?: string }[],
    globalComments?: string
  ): Promise<Grade> {

    const grid = await this.gradingGridRepository.findOne({
      where: { id: gradingGridId },
      relations: [
        'criteria',
      ]
    });

    console.log('Found grading grid:', grid);
    
    if (!grid) throw new Error('Grading grid not found');

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) throw new Error('Group not found');

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
    } else {
      grade.globalComments = globalComments;
      // Supprimer les anciennes notes de critères
      if (grade.criterionGrades && grade.criterionGrades.length > 0) {
        await this.criterionGradeRepository.remove(grade.criterionGrades);
      }
    }

    const savedGrade = await this.gradeRepository.save(grade);
    console.log('Saved grade:', savedGrade);
    // Créer les nouvelles notes de critères
    const criterionGradeEntities: CriterionGrade[] = [];
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
  async getGradesByGroup(groupId: number): Promise<Grade[]> {
    return await this.gradeRepository.find({
      where: { group: { id: groupId } },
      relations: ['gradingGrid', 'criterionGrades', 'criterionGrades.criterion'],
      order: { createdAt: 'ASC' }
    });
  }

  // Récupérer les notes d'un projet
  async getGradesByProject(projectId: number): Promise<Grade[]> {
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

  // Récupérer une note par son ID
  async getGradeById(gradeId: number): Promise<Grade | null> {
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
  async validateGrades(gradeIds: number[]): Promise<Grade[]> {
    const grades = await this.gradeRepository.findByIds(gradeIds);
    
    for (const grade of grades) {
      grade.isValidated = true;
    }

    return await this.gradeRepository.save(grades);
  }

  // Calculer la note finale d'un projet pour un groupe
  async calculateProjectGrade(projectId: number, groupId: number): Promise<number> {
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

  async getProjectGradingSummary(projectId: number): Promise<any> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['groups', 'groups.members']
    });

    if (!project) throw new Error('Project not found');

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



   async getGradingStatistics(projectId: number): Promise<any> {
    const grades = await this.getGradesByProject(projectId);
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['groups']
    });

    if (!project) throw new Error('Project not found');

    const totalGroups = project.groups.length;
    const gradedGroups = new Set(grades.map(g => g.group.id)).size;
    const validatedGrades = grades.filter(g => g.isValidated).length;
    const totalGrades = grades.length;

    const scores = grades
      .filter(g => g.totalScore !== null)
      .map(g => g.totalScore);

    const statistics: {
      totalGroups: number;
      gradedGroups: number;
      ungradedGroups: number;
      gradingProgress: number;
      validatedGrades: number;
      pendingValidation: number;
      validationProgress: number;
      scoreStatistics?: {
        average: number;
        minimum: number;
        maximum: number;
        median: number;
        distribution: any;
      };
    } = {
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
        average: scores.filter((s): s is number => typeof s === 'number').reduce((a, b) => a + b, 0) / (scores.filter((s): s is number => typeof s === 'number').length || 1),
        minimum: Math.min(...scores.filter((s): s is number => typeof s === 'number')),
        maximum: Math.max(...scores.filter((s): s is number => typeof s === 'number')),
        median: this.calculateMedian(scores.filter((s): s is number => typeof s === 'number')),
        distribution: this.calculateScoreDistribution(scores.filter((s): s is number => typeof s === 'number'))
      };
    }

    return statistics;
  }

async updateGridWeights(
    projectId: number, 
    weights: { gridId: number; weight: number }[]
  ): Promise<GradingGrid[]> {
    // 🔍 Récupérer toutes les grilles du projet
    const gridIds = weights.map(w => w.gridId);
    
    const grids = await this.gradingGridRepository.find({
      where: { 
        id: In(gridIds),
        project: { id: projectId }
      },
      relations: ['project']
    });

    // ✅ Vérifier que toutes les grilles existent et appartiennent au projet
    if (grids.length !== weights.length) {
      const foundIds = grids.map(g => g.id);
      const missingIds = gridIds.filter(id => !foundIds.includes(id));
      throw new Error(
        `Les grilles suivantes n'appartiennent pas au projet ${projectId}: ${missingIds.join(', ')}`
      );
    }

    // ✅ Mise à jour en transaction (tout ou rien)
    const updatedGrids: GradingGrid[] = [];
    
    await this.gradingGridRepository.manager.transaction(async (manager) => {
      for (const { gridId, weight } of weights) {
        await manager.update(GradingGrid, { id: gridId }, { weight });
        
        // Récupérer la grille mise à jour
        const updatedGrid = await manager.findOne(GradingGrid, { 
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
  private calculateMedian(scores: number[]): number {
    const sorted = scores.sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    
    if (sorted.length % 2 === 0) {
      return (sorted[mid - 1] + sorted[mid]) / 2;
    } else {
      return sorted[mid];
    }
  }

  private calculateScoreDistribution(scores: number[]): any {
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

  async duplicateGradingGrid(gridId: number, newName: string, newProjectId?: number): Promise<GradingGrid> {
    const originalGrid = await this.gradingGridRepository.findOne({
      where: { id: gridId },
      relations: ['criteria', 'project']
    });

    if (!originalGrid) throw new Error('Grading grid not found');

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



// Dans grading.service.ts

async getOrCreateGradingSession(
  gridId: number, 
  groupId: number
): Promise<Grade | null> {
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

  // Si pas de session, retourner null
  // Le frontend créera une nouvelle session
  return null;
}

async saveGradingSession(
  gridId: number,
  groupId: number,
  sessionData: {
    entries: Array<{
      id?: number;
      criterionId: number;
      score: number;
      comment?: string;
    }>;
    globalComment?: string;
    totalScore: number;
    status: 'draft' | 'validated';
  },
  gradeId?: number
): Promise<Grade> {
  const grid = await this.gradingGridRepository.findOne({
    where: { id: gridId },
    relations: ['criteria']
  });
  
  if (!grid) throw new Error('Grading grid not found');

  const group = await this.groupRepository.findOne({ 
    where: { id: groupId } 
  });
  
  if (!group) throw new Error('Group not found');

  let grade: Grade;

  if (gradeId && gradeId > 0) {
    // Mise à jour d'une session existante
    const existingGrade = await this.gradeRepository.findOne({
      where: { id: gradeId },
      relations: ['criterionGrades']
    });

    if (!existingGrade) throw new Error('Grade not found');

    grade = existingGrade;
    grade.globalComments = sessionData.globalComment;
    grade.totalScore = sessionData.totalScore;
    grade.isValidated = sessionData.status === 'validated';

    // Supprimer les anciennes notes de critères
    if (grade.criterionGrades && grade.criterionGrades.length > 0) {
      await this.criterionGradeRepository.remove(grade.criterionGrades);
    }
  } else {
    // Création d'une nouvelle session
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
  const criterionGrades: CriterionGrade[] = [];

  for (const entry of sessionData.entries) {
    const criterion = grid.criteria.find(c => c.id === entry.criterionId);
    if (!criterion) continue;

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

  if (!result) throw new Error('Grade not found after saving');
  return result;
}

// Dans grading.service.ts


async getStudentGrades(userId: number) {
  const gradeRepo = AppDataSource.getRepository(Grade);
  
  // Récupérer tous les groupes de l'étudiant
  const userRepo = AppDataSource.getRepository(User);
  const user = await userRepo.findOne({
    where: { id: userId },
    relations: ['groups', 'groups.project']
  });
  
  if (!user || !user.groups) {
    return [];
  }
  
  const groupIds = user.groups.map(g => g.id);
  
  // Récupérer toutes les notes validées pour ces groupes
  const grades = await gradeRepo.find({
    where: {
      group: { id: In(groupIds) },
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
  
  // Formater les données pour le frontend
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

async getStudentProjectGrades(userId: number, projectId: number) {
  const gradeRepo = AppDataSource.getRepository(Grade);
  
  // Trouver le groupe de l'étudiant pour ce projet
  const groupRepo = AppDataSource.getRepository(Group);
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

async getGradeDetailsForStudent(userId: number, gradeId: number) {
  const gradeRepo = AppDataSource.getRepository(Grade);
  
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
  
  // Vérifier que l'étudiant fait partie du groupe
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

private calculateMaxScore(grid: GradingGrid): number {
  if (!grid.criteria || grid.criteria.length === 0) {
    return 20; // Valeur par défaut
  }
  
  return grid.criteria.reduce((sum, criterion) => {
    return sum + (criterion.maxScore * criterion.weight);
  }, 0);
}

// Ajoutez ces méthodes dans votre GradingService

/**
 * Récupère toutes les sessions de notation pour un projet
 */
async getGradingSessions(projectId: number, type?: string): Promise<any[]> {
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

  // Transformer les données pour correspondre au format attendu par le frontend
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

/**
 * Récupère une session de notation par son ID
 */
async getGradingSessionById(id: number): Promise<any> {
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

/**
 * Crée ou met à jour une session de notation (pour la route POST/PUT /sessions)
 */
async createOrUpdateGradingSession(sessionData: {
  id?: number;
  gridId: number;
  groupId: number;
  entries: Array<{
    id?: number;
    criterionId: number;
    score: number;
    comment?: string;
  }>;
  globalComment?: string;
  totalScore: number;
  status: 'draft' | 'validated';
}): Promise<any> {
  const { id, gridId, groupId, entries, globalComment, totalScore, status } = sessionData;

  // Vérifier que la grille existe
  const grid = await this.gradingGridRepository.findOne({
    where: { id: gridId },
    relations: ['criteria']
  });
  
  if (!grid) {
    throw new Error('Grading grid not found');
  }

  // Vérifier que le groupe existe
  const group = await this.groupRepository.findOne({ 
    where: { id: groupId } 
  });
  
  if (!group) {
    throw new Error('Group not found');
  }

  let grade: Grade;

  if (id && id > 0) {
    // Mise à jour d'une session existante
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

    // Supprimer les anciennes notes de critères
    if (grade.criterionGrades && grade.criterionGrades.length > 0) {
      await this.criterionGradeRepository.remove(grade.criterionGrades);
    }
  } else {
    // Création d'une nouvelle session
    grade = this.gradeRepository.create({
      gradingGrid: grid,
      group: group,
      globalComments: globalComment,
      totalScore: totalScore,
      isValidated: status === 'validated'
    });
  }

  const savedGrade = await this.gradeRepository.save(grade);

  // Créer les notes de critères
  const criterionGrades: CriterionGrade[] = [];

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

  // Recharger avec toutes les relations pour le retour
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

  // Retourner au format session
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

/**
 * Récupère les grilles de notation par type
 */
async getGradingGridsByProjectAndType(projectId: number, type: 'deliverable' | 'report' | 'defense'): Promise<GradingGrid[]> {
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