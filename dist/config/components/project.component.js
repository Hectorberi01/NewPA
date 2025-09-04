/**
 * @swagger
 * components:
 *   schemas:
 *     Project:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Identifiant unique du projet
 *         title:
 *           type: string
 *           description: Nom du projet
 *         description:
 *           type: string
 *           description: Description du projet
 *         startDate:
 *           type: string
 *           format: date
 *           description: Date de début du projet
 *         endDate:
 *           type: string
 *           format: date
 *           description: Date de fin du projet
 *        status:
 *          type: string
 *          description: Statut du projet
 *        promotionId:
 *          type: integer
 *          description: Identifiant de la promotion associée au projet
 * *        createdAt:
 *           type: string
 *           format: date-time
 *           description: Date de création du projet
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Date de mise à jour du projet
 *         Livrablesrules:
 *           type: object
 *           description: Règles des livrables du projet
 *           additionalProperties: true
 *       required:
 *         - title
 *         - description
 *         - promotionId
 *         - status
 */
