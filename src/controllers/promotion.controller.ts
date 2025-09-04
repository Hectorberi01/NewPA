// controllers/promotion.controller.ts
import { Request, Response } from 'express';
import { PromotionService } from '../services/promotion.service';

export class PromotionController {
  private promotionService: PromotionService;

  constructor() {
    this.promotionService = new PromotionService();
  }

  /**
   * @swagger
   * /api/promotions:
   *   post:
   *     summary: Create a new promotion
   *     tags: [Promotions]
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [name, year]
   *             properties:
   *               name:
   *                 type: string
   *               description:
   *                 type: string
   *               year:
   *                 type: integer
   *     responses:
   *       201:
   *         description: Promotion created successfully
   */
  async createPromotion(req: Request, res: Response) {
    try {
      const teacherId = (req as any).user?.id;
      const promotionData = { ...req.body, teacher: { id: teacherId } };
      const promotion = await this.promotionService.createPromotion(promotionData);
      res.status(201).json(promotion);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/promotions/my:
   *   get:
   *     summary: Get promotions created by current teacher
   *     tags: [Promotions]
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Promotions retrieved successfully
   */
  async getMyPromotions(req: Request, res: Response) {
    try {
      const teacherId = (req as any).user?.id;
      const promotions = await this.promotionService.getPromotionsByTeacher(teacherId);
      res.json(promotions);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  /**
   * @swagger
   * /api/promotions/{id}/students:
   *   post:
   *     summary: Add students to promotion
   *     tags: [Promotions]
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
   *               emails:
   *                 type: array
   *                 items:
   *                   type: string
   *     responses:
   *       200:
   *         description: Students added successfully
   */
  async addStudents(req: Request, res: Response) {
    try {
      const promotionId = parseInt(req.params.id);
      const { emails } = req.body;
      const promotion = await this.promotionService.addStudentsToPromotion(promotionId, emails);
      res.json(promotion);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }


    /**
     * @swagger
     * /api/promotions/{id}/students/import:
     *   post:
     *     summary: Importer des étudiants depuis un fichier
     *     description: |
     *       Importe des étudiants dans une promotion à partir d'un fichier CSV ou Excel.
     *       
     *       **Formats supportés :**
     *       - CSV (.csv) avec séparateur virgule
     *       - Excel (.xlsx, .xls)
     *       
     *       **Structure attendue :**
     *       Le fichier doit contenir au minimum une colonne "email". Les colonnes optionnelles sont "prenom"/"firstname" et "nom"/"lastname".
     *       
     *       **Exemple CSV :**
     *       ```csv
     *       email,prenom,nom
     *       john.doe@example.com,John,Doe
     *       jane.smith@example.com,Jane,Smith
     *       ```
     *       
     *       **Fonctionnalités :**
     *       - Création automatique des comptes étudiants
     *       - Envoi d'emails de bienvenue avec mots de passe temporaires
     *       - Détection des doublons
     *       - Validation des formats d'email
     *       - Rapport détaillé des résultats d'import
     *     tags: [Promotions]
     *     security:
     *       - bearerAuth: []
     *     parameters:
     *       - in: path
     *         name: id
     *         required: true
     *         description: ID de la promotion
     *         schema:
     *           type: integer
     *           minimum: 1
     *         example: 1
     *     requestBody:
     *       required: true
     *       content:
     *         multipart/form-data:
     *           schema:
     *             type: object
     *             required:
     *               - file
     *             properties:
     *               file:
     *                 type: string
     *                 format: binary
     *                 description: |
     *                   Fichier CSV ou Excel contenant les données des étudiants.
     *                   Taille maximum : 10MB
     *           examples:
     *             csv_file:
     *               summary: Fichier CSV
     *               description: Exemple de fichier CSV avec colonnes email, prenom, nom
     *             excel_file:
     *               summary: Fichier Excel
     *               description: Exemple de fichier Excel avec les mêmes colonnes
     *     responses:
     *       200:
     *         description: Import terminé avec succès
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 message:
     *                   type: string
     *                   example: "Import terminé avec succès"
     *                 promotion:
     *                   $ref: '#/components/schemas/Promotion'
     *                 summary:
     *                   type: object
     *                   properties:
     *                     totalProcessed:
     *                       type: integer
     *                       description: Nombre total de lignes traitées
     *                       example: 150
     *                     newStudents:
     *                       type: integer
     *                       description: Nombre de nouveaux étudiants créés
     *                       example: 120
     *                     existingStudents:
     *                       type: integer
     *                       description: Nombre d'étudiants déjà existants ajoutés à la promotion
     *                       example: 25
     *                     errors:
     *                       type: array
     *                       description: Liste des erreurs rencontrées pendant l'import
     *                       items:
     *                         type: string
     *                       example: 
     *                         - "Ligne 15: Format d'email invalide (bad-email)"
     *                         - "Ligne 23: Email en double (duplicate@example.com)"
     *             examples:
     *               success_with_some_errors:
     *                 summary: Import réussi avec quelques erreurs
     *                 value:
     *                   message: "Import terminé avec succès"
     *                   promotion:
     *                     id: 1
     *                     name: "L3 Informatique 2024"
     *                     year: 2024
     *                     studentsCount: 145
     *                   summary:
     *                     totalProcessed: 150
     *                     newStudents: 120
     *                     existingStudents: 25
     *                     errors:
     *                       - "Ligne 15: Format d'email invalide (user@)"
     *                       - "Ligne 23: Email en double (john.doe@example.com)"
     *                       - "Ligne 47: Email manquant"
     *               success_no_errors:
     *                 summary: Import parfait sans erreur
     *                 value:
     *                   message: "Import terminé avec succès"
     *                   promotion:
     *                     id: 1
     *                     name: "L3 Informatique 2024"
     *                     year: 2024
     *                     studentsCount: 100
     *                   summary:
     *                     totalProcessed: 100
     *                     newStudents: 80
     *                     existingStudents: 20
     *                     errors: []
     *       400:
     *         description: Erreur de validation ou fichier manquant
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *             examples:
     *               no_file:
     *                 summary: Aucun fichier fourni
     *                 value:
     *                   error: "Aucun fichier fourni"
     *               invalid_format:
     *                 summary: Format non supporté
     *                 value:
     *                   error: "Format de fichier non supporté: txt"
     *               no_valid_students:
     *                 summary: Aucun étudiant valide
     *                 value:
     *                   error: "Aucun étudiant valide trouvé dans le fichier"
     *       401:
     *         $ref: '#/components/responses/UnauthorizedError'
     *       403:
     *         $ref: '#/components/responses/ForbiddenError'
     *       404:
     *         description: Promotion non trouvée
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *             example:
     *               error: "Promotion not found"
     *       413:
     *         description: Fichier trop volumineux
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *             example:
     *               error: "File too large. Maximum size is 10MB"
     *       415:
     *         description: Type de fichier non supporté
     *         content:
     *           application/json:
     *             schema:
     *               $ref: '#/components/schemas/Error'
     *             example:
     *               error: "Unsupported media type. Only CSV and Excel files are allowed"
     *       500:
     *         $ref: '#/components/responses/InternalServerError'
     */
    async addStudentsFromFile(req: Request, res: Response) {
    try {
      const promotionId = parseInt(req.params.id);
      const file = req.file;

      if (!file) {
        return res.status(400).json({ error: 'Aucun fichier fourni' });
      }

      const result = await this.promotionService.addStudentsUsingFile(promotionId, file);

      res.json({
        message: 'Import terminé avec succès',
        promotion: result.promotion,
        summary: result.summary
      });

    } catch (error) {
      res.status(500).json({ 
        error: error|| 'Erreur lors de l\'import des étudiants' 
      });
    }
  }
}