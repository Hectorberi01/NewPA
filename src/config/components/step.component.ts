/**
 * @swagger
 * components:
 *   schemas:
 *     Step:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Identifiant unique de l'étape
 *         name:
 *           type: string
 *           description: Nom de l'étape
 *         description:
 *           type: string
 *           description: Description de l'étape
 *         projectId:
 *           type: integer
 *           description: Identifiant du projet auquel l'étape appartient
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Date de création de l'étape
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de mise à jour de l'étape
 */