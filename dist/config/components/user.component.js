/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           description: Identifiant unique de l'utilisateur
 *         username:
 *           type: string
 *         name:
 *           type: string
 *         surname:
 *           type: string
 *         email:
 *           type: string
 *         phoneNumber:
 *           type: string
 *         address:
 *           type: string
 *         isActive:
 *           type: boolean
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *         role:
 *           type: string
 *           enum: [TEACHER, STUDENT]
 *       required:
 *         - username
 *         - name
 *         - surname
 *         - email
 *         - password
 *         - role
 */
/**
 * @swagger
 * components:
 *   schemas:
 *     CreateUser:
 *       type: object
 *       properties:
 *         name:
 *           type: string
 *           description: Prénom de l'utilisateur
 *         surname:
 *           type: string
 *           description: Nom de famille de l'utilisateur
 *         email:
 *           type: string
 *           format: email
 *           description: Adresse email unique
 *         password:
 *           type: string
 *           format: password
 *           description: Mot de passe de l'utilisateur
 *         role:
 *           type: string
 *           enum: [TEACHER, STUDENT]
 *           description: Rôle de l'utilisateur
 *       required:
 *         - name
 *         - surname
 *         - email
 *         - password
 *         - role
 */
