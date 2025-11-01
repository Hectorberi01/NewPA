import { Request, Response } from 'express';
import { GradingService } from '../services/grading.service';

export class GradingController {
  private gradingService: GradingService;

  constructor() {
    this.gradingService = new GradingService();
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
  async createGradingGrid(req: Request, res: Response) {
    try {
      console.log('Creating grading grid with data:', req.body);
      const grid = await this.gradingService.createGradingGrid(req.body);
      res.status(201).json(grid);
    } catch (error) {
      res.status(500).json({ error: error});
    }
  }
  async calculateProjectGrade(req: Request, res: Response) {
    try {
      const projectId = parseInt(req.params.projectId);
      const groupId = parseInt(req.params.groupId);
      const finalGrade = await this.gradingService.calculateProjectGrade(projectId, groupId);
      res.json(finalGrade);
    } catch (error) {
      res.status(500).json({ error: error});
    }
  }
// Dans GradingController - AJOUTEZ CETTE MÉTHODE
async getGradingSessionsByProject(req: Request, res: Response) {
  try {
    const { projectId } = req.params;
    const { type } = req.query;
    
    if (!projectId) {
      return res.status(400).json({ error: 'projectId est requis' });
    }

    const sessions = await this.gradingService.getGradingSessions(
      Number(projectId), 
      type as string
    );
    
    res.json(sessions);
  } catch (error: any) {
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
  async gradeGroup(req: Request, res: Response) {
    try {
      const { gradingGridId, groupId, criterionGrades } = req.body;
      const grade = await this.gradingService.gradeGroup(gradingGridId, groupId, criterionGrades);
      res.status(201).json(grade);
    } catch (error) {
      res.status(500).json({ error: error });
    }
  }
  
getGradingGridsByProject = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.projectId);
    const type = req.query.type as 'deliverable' | 'report' | 'defense' | undefined;

    let grids;
    
    if (type) {
      grids = await this.gradingService.getGradingGridsByProjectAndType(projectId, type);
    } else {
      grids = await this.gradingService.getGradingGridsByProject(projectId);
    }

    res.json(grids);
  } catch (error: any) {
    console.error('Erreur getGradingGridsByProject:', error);
    res.status(500).json({ message: error.message });
  }
};
  getGradeById = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const grade = await this.gradingService.getGradeById(id);

      res.json(grade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };
 async updateGridWeights(req: Request, res: Response) {
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
      const totalWeight = weights.reduce((sum: number, w: any) => sum + w.weight, 0);
      
      if (Math.abs(totalWeight - 1) > 0.01) {
        return res.status(400).json({ 
          message: `La somme des poids doit être égale à 1.00 (actuellement ${totalWeight.toFixed(3)})` 
        });
      }

      // ✅ Convertir le format du frontend vers le backend
      const weightsData = weights.map((w: any) => ({
        gridId: w.id,
        weight: w.weight
      }));

      // ✅ Appel au service
      const updatedGrids = await this.gradingService.updateGridWeights(
        parseInt(projectId), 
        weightsData
      );

      res.json({
        message: 'Pondérations mises à jour avec succès',
        grids: updatedGrids
      });
    } catch (error: any) {
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
  getProjectGradingGrids = async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const grids = await this.gradingService.getGradingGridsByProject(projectId);
      res.json(grids);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getGradingGrid = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const grid = await this.gradingService.getGradingGridById(id);
      
      if (!grid) {
        return res.status(404).json({ error: 'Grading grid not found' });
      }
      
      res.json(grid);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  updateGradingGrid = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const grid = await this.gradingService.updateGradingGrid(id, req.body);
      res.json(grid);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  deleteGradingGrid = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await this.gradingService.deleteGradingGrid(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

 

  addCriterion = async (req: Request, res: Response) => {
    try {
      const gridId = parseInt(req.params.gridId);
      const criterion = await this.gradingService.addCriterion(gridId, req.body);
      res.status(201).json(criterion);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  updateCriterion = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const criterion = await this.gradingService.updateCriterion(id, req.body);
      res.json(criterion);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  deleteCriterion = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      await this.gradingService.deleteCriterion(id);
      res.status(204).send();
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  

  getGroupGrades = async (req: Request, res: Response) => {
    try {
      const groupId = parseInt(req.params.groupId);
      const grades = await this.gradingService.getGradesByGroup(groupId);
      res.json(grades);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getProjectGrades = async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const grades = await this.gradingService.getGradesByProject(projectId);
      res.json(grades);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getGrade = async (req: Request, res: Response) => {
    try {
      const id = parseInt(req.params.id);
      const grade = await this.gradingService.getGradeById(id);
      
      if (!grade) {
        return res.status(404).json({ error: 'Grade not found' });
      }
      
      res.json(grade);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  validateGrades = async (req: Request, res: Response) => {
    try {
      const { gradeIds } = req.body;
      const grades = await this.gradingService.validateGrades(gradeIds);
      res.json(grades);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getGradingSummary = async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const summary = await this.gradingService.getProjectGradingSummary(projectId);
      res.json(summary);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

  getGradingStatistics = async (req: Request, res: Response) => {
    try {
      const projectId = parseInt(req.params.projectId);
      const stats = await this.gradingService.getGradingStatistics(projectId);
      res.json(stats);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  };

async getGradingSession(req: Request, res: Response) {
  try {
    const { projectId, type, gridId, groupId } = req.query;
    
    // ✅ Accepte soit (projectId + type) soit (gridId + groupId)
    if (projectId && type) {
      // Récupération par projet et type
      const sessions = await this.gradingService.getGradingSessions(
        Number(projectId), 
        type as string
      );
      return res.json(sessions);
    } 
    else if (gridId && groupId) {
      // Récupération spécifique par grille et groupe
      const session = await this.gradingService.getGradingSessionByGridAndGroup(
        Number(gridId),
        Number(groupId)
      );
      return res.json(session ? [session] : []);
    }
    else {
      return res.status(400).json({ 
        error: 'Soit (projectId et type) soit (gridId et groupId) sont requis' 
      });
    }
  } catch (error: any) {
    console.error('Erreur getGradingSession:', error);
    res.status(500).json({ error: error.message });
  }
}


// Dans grading.controller.ts

/**
 * Récupère toutes les notes d'un étudiant
 */
getStudentGrades = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id; // ID de l'étudiant connecté
    const grades = await this.gradingService.getStudentGrades(userId);
    res.json(grades);
  } catch (error: any) {
    console.error('Erreur getStudentGrades:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère les notes d'un étudiant pour un projet spécifique
 */
getStudentProjectGrades = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const projectId = parseInt(req.params.projectId);
    
    const grades = await this.gradingService.getStudentProjectGrades(userId, projectId);
    res.json(grades);
  } catch (error: any) {
    console.error('Erreur getStudentProjectGrades:', error);
    res.status(500).json({ error: error.message });
  }
};

/**
 * Récupère les détails d'une note spécifique
 */
getGradeDetails = async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user.id;
    const gradeId = parseInt(req.params.gradeId);
    
    const grade = await this.gradingService.getGradeDetailsForStudent(userId, gradeId);
    
    if (!grade) {
      return res.status(404).json({ error: 'Note non trouvée' });
    }
    
    res.json(grade);
  } catch (error: any) {
    console.error('Erreur getGradeDetails:', error);
    res.status(500).json({ error: error.message });
  }
};
// Dans GradingController



async getGradingSessionById(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const session = await this.gradingService.getGradingSessionById(Number(id));
    
    if (!session) {
      return res.status(404).json({ error: 'Session non trouvée' });
    }
    
    res.json(session);
  } catch (error: any) {
    console.error('Erreur getGradingSessionById:', error);
    res.status(500).json({ error: error.message });
  }
}

async createOrUpdateGradingSession(req: Request, res: Response) {
  try {
    const sessionData = req.body;
    
    const session = await this.gradingService.createOrUpdateGradingSession(sessionData);
    
    res.json(session);
  } catch (error: any) {
    console.error('Erreur createOrUpdateGradingSession:', error);
    res.status(500).json({ error: error.message });
  }
}
}