"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.swaggerUi = exports.specs = void 0;
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
exports.swaggerUi = swagger_ui_express_1.default;
const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Gestionnaire de Projets Étudiants API',
            version: '1.0.0',
            description: `
        API complète pour la gestion de projets étudiants avec fonctionnalités avancées :
        - Gestion des utilisateurs (enseignants/étudiants)
        - Création et gestion de promotions
        - Projets avec groupes configurables
        - Livrables avec validation automatique
        - Rapports collaboratifs en ligne
        - Système de notation multi-critères
        - Planification des soutenances
        - Génération de documents PDF
        - Détection de plagiat automatique
      `,
            contact: {
                name: 'Support API',
                email: 'support@example.com'
            },
            license: {
                name: 'MIT',
                url: 'https://opensource.org/licenses/MIT'
            }
        },
        servers: [
            {
                url: 'http://localhost:3000',
                description: 'Serveur de développement',
            },
            {
                url: 'https://api.student-projects.com',
                description: 'Serveur de production',
            }
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Entrez votre token JWT'
                },
            },
            schemas: {
                // Schémas utilisateur
                User: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        email: { type: 'string', format: 'email', example: 'user@example.com' },
                        firstName: { type: 'string', example: 'John' },
                        lastName: { type: 'string', example: 'Doe' },
                        role: { type: 'string', enum: ['teacher', 'student'], example: 'teacher' },
                        isActive: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                // Schémas promotion
                Promotion: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'L3 Informatique 2024' },
                        description: { type: 'string', example: 'Promotion de licence 3 informatique' },
                        year: { type: 'integer', example: 2024 },
                        createdAt: { type: 'string', format: 'date-time' },
                        teacher: { $ref: '#/components/schemas/User' },
                        students: { type: 'array', items: { $ref: '#/components/schemas/User' } }
                    },
                },
                CreatePromotion: {
                    type: 'object',
                    required: ['name', 'year'],
                    properties: {
                        name: { type: 'string', example: 'L3 Informatique 2024' },
                        description: { type: 'string', example: 'Promotion de licence 3 informatique' },
                        year: { type: 'integer', minimum: 2020, maximum: 2030, example: 2024 },
                    },
                },
                // Schémas projet
                Project: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Projet Machine Learning' },
                        description: { type: 'string', example: 'Développement d\'un modèle de ML' },
                        status: { type: 'string', enum: ['draft', 'visible'], example: 'visible' },
                        minGroupSize: { type: 'integer', example: 2 },
                        maxGroupSize: { type: 'integer', example: 4 },
                        groupFormationRule: { type: 'string', enum: ['manual', 'random', 'free'], example: 'free' },
                        groupFormationDeadline: { type: 'string', format: 'date-time' },
                        createdAt: { type: 'string', format: 'date-time' },
                        teacher: { $ref: '#/components/schemas/User' },
                        promotion: { $ref: '#/components/schemas/Promotion' }
                    },
                },
                CreateProject: {
                    type: 'object',
                    required: ['name', 'description', 'promotionId'],
                    properties: {
                        name: { type: 'string', example: 'Projet Machine Learning' },
                        description: { type: 'string', example: 'Développement d\'un modèle de ML' },
                        promotionId: { type: 'integer', example: 1 },
                        minGroupSize: { type: 'integer', minimum: 1, example: 2 },
                        maxGroupSize: { type: 'integer', minimum: 1, example: 4 },
                        groupFormationRule: { type: 'string', enum: ['manual', 'random', 'free'], example: 'free' },
                        status: { type: 'string', enum: ['draft', 'visible'], example: 'draft' },
                        groupFormationDeadline: { type: 'string', format: 'date-time' },
                    },
                },
                // Schémas groupe
                Group: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Groupe Alpha' },
                        createdAt: { type: 'string', format: 'date-time' },
                        members: { type: 'array', items: { $ref: '#/components/schemas/User' } },
                        project: { $ref: '#/components/schemas/Project' }
                    },
                },
                // Schémas livrable
                Deliverable: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Livrable 1 - Analyse' },
                        description: { type: 'string', example: 'Document d\'analyse du projet' },
                        type: { type: 'string', enum: ['archive', 'git_link'], example: 'archive' },
                        deadline: { type: 'string', format: 'date-time' },
                        allowLateSubmission: { type: 'boolean', example: true },
                        penaltyPerHour: { type: 'integer', example: 1 },
                        createdAt: { type: 'string', format: 'date-time' },
                        project: { $ref: '#/components/schemas/Project' },
                        validationRules: { type: 'array', items: { $ref: '#/components/schemas/DeliverableRule' } }
                    },
                },
                CreateDeliverable: {
                    type: 'object',
                    required: ['name', 'description', 'type', 'deadline', 'projectId'],
                    properties: {
                        name: { type: 'string', example: 'Livrable 1 - Analyse' },
                        description: { type: 'string', example: 'Document d\'analyse du projet' },
                        type: { type: 'string', enum: ['archive', 'git_link'], example: 'archive' },
                        deadline: { type: 'string', format: 'date-time' },
                        projectId: { type: 'integer', example: 1 },
                        allowLateSubmission: { type: 'boolean', example: true },
                        penaltyPerHour: { type: 'integer', minimum: 0, example: 1 },
                    },
                },
                DeliverableRule: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        type: { type: 'string', enum: ['max_size', 'file_presence', 'folder_structure', 'file_content'] },
                        configuration: { type: 'string', example: '{"maxSizeMB": 10}' },
                        errorMessage: { type: 'string', example: 'Le fichier est trop volumineux' }
                    },
                },
                DeliverableSubmission: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        filePath: { type: 'string', example: '/uploads/submission-123.zip' },
                        gitUrl: { type: 'string', example: 'https://github.com/user/project' },
                        submittedAt: { type: 'string', format: 'date-time' },
                        isLate: { type: 'boolean', example: false },
                        penalty: { type: 'integer', example: 0 },
                        validationResults: { type: 'object', example: { max_size: { valid: true } } },
                        similarityScore: { type: 'number', format: 'float', example: 0.15 },
                        group: { $ref: '#/components/schemas/Group' }
                    },
                },
                // Schémas rapport
                Report: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        title: { type: 'string', example: 'Rapport de projet ML' },
                        description: { type: 'string', example: 'Rapport détaillé du projet' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                        project: { $ref: '#/components/schemas/Project' },
                        group: { $ref: '#/components/schemas/Group' },
                        sections: { type: 'array', items: { $ref: '#/components/schemas/ReportSection' } }
                    },
                },
                ReportSection: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        title: { type: 'string', example: 'Introduction' },
                        content: { type: 'string', example: 'Contenu de la section en markdown' },
                        orderIndex: { type: 'integer', example: 1 },
                        createdAt: { type: 'string', format: 'date-time' }
                    },
                },
                // Schémas soutenance
                Defense: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        startTime: { type: 'string', format: 'date-time' },
                        endTime: { type: 'string', format: 'date-time' },
                        orderIndex: { type: 'integer', example: 1 },
                        location: { type: 'string', example: 'Salle 201' },
                        createdAt: { type: 'string', format: 'date-time' },
                        project: { $ref: '#/components/schemas/Project' },
                        group: { $ref: '#/components/schemas/Group' }
                    },
                },
                // Schémas notation
                GradingGrid: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Grille Livrable 1' },
                        type: { type: 'string', enum: ['deliverable', 'report', 'defense'], example: 'deliverable' },
                        weight: { type: 'number', format: 'float', example: 1.0 },
                        description: { type: 'string', example: 'Grille d\'évaluation pour le livrable 1' },
                        createdAt: { type: 'string', format: 'date-time' },
                        project: { $ref: '#/components/schemas/Project' },
                        criteria: { type: 'array', items: { $ref: '#/components/schemas/GradingCriterion' } }
                    },
                },
                GradingCriterion: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        name: { type: 'string', example: 'Qualité du code' },
                        description: { type: 'string', example: 'Évaluation de la qualité du code source' },
                        maxScore: { type: 'number', format: 'float', example: 20.0 },
                        weight: { type: 'number', format: 'float', example: 1.0 },
                        type: { type: 'string', enum: ['group', 'individual'], example: 'group' },
                        hasComments: { type: 'boolean', example: true }
                    },
                },
                Grade: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        totalScore: { type: 'number', format: 'float', example: 16.5 },
                        globalComments: { type: 'string', example: 'Très bon travail dans l\'ensemble' },
                        isValidated: { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        gradingGrid: { $ref: '#/components/schemas/GradingGrid' },
                        group: { $ref: '#/components/schemas/Group' },
                        criterionGrades: { type: 'array', items: { $ref: '#/components/schemas/CriterionGrade' } }
                    },
                },
                CriterionGrade: {
                    type: 'object',
                    properties: {
                        id: { type: 'integer', example: 1 },
                        score: { type: 'number', format: 'float', example: 16.0 },
                        comments: { type: 'string', example: 'Code bien structuré mais quelques optimisations possibles' },
                        criterion: { $ref: '#/components/schemas/GradingCriterion' }
                    },
                },
                // Schémas d'authentification
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'teacher@example.com' },
                        password: { type: 'string', example: 'password123' }
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        token: { type: 'string', example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...' },
                        user: { $ref: '#/components/schemas/User' }
                    },
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['email', 'password', 'firstName', 'lastName'],
                    properties: {
                        email: { type: 'string', format: 'email', example: 'newteacher@example.com' },
                        password: { type: 'string', minLength: 8, example: 'securePassword123' },
                        firstName: { type: 'string', example: 'Jane' },
                        lastName: { type: 'string', example: 'Smith' }
                    },
                },
                // Schémas d'erreur
                Error: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Une erreur est survenue' },
                        details: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    field: { type: 'string' },
                                    message: { type: 'string' }
                                }
                            }
                        }
                    },
                },
                ValidationError: {
                    type: 'object',
                    properties: {
                        error: { type: 'string', example: 'Validation failed' },
                        details: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    type: { type: 'string', example: 'field' },
                                    value: { type: 'string' },
                                    msg: { type: 'string', example: 'Field is required' },
                                    path: { type: 'string', example: 'email' },
                                    location: { type: 'string', example: 'body' }
                                }
                            }
                        }
                    },
                },
                // Schémas de réponse pour les statistiques
                SubmissionSummary: {
                    type: 'object',
                    properties: {
                        totalGroups: { type: 'integer', example: 10 },
                        submittedGroups: { type: 'integer', example: 8 },
                        pendingGroups: { type: 'integer', example: 2 },
                        onTimeSubmissions: { type: 'integer', example: 6 },
                        lateSubmissions: { type: 'integer', example: 2 },
                        submissionRate: { type: 'number', format: 'float', example: 80.0 },
                        submissions: { type: 'array', items: { $ref: '#/components/schemas/DeliverableSubmission' } }
                    },
                },
                SimilarityResult: {
                    type: 'object',
                    properties: {
                        groupId1: { type: 'integer', example: 1 },
                        groupId2: { type: 'integer', example: 2 },
                        similarity: { type: 'number', format: 'float', example: 0.85 }
                    },
                }
            },
            responses: {
                UnauthorizedError: {
                    description: 'Token d\'authentification manquant ou invalide',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                ForbiddenError: {
                    description: 'Accès interdit - permissions insuffisantes',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                NotFoundError: {
                    description: 'Ressource non trouvée',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                },
                ValidationError: {
                    description: 'Erreur de validation des données',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/ValidationError' }
                        }
                    }
                },
                InternalServerError: {
                    description: 'Erreur interne du serveur',
                    content: {
                        'application/json': {
                            schema: { $ref: '#/components/schemas/Error' }
                        }
                    }
                }
            }
        },
        tags: [
            {
                name: 'Authentication',
                description: 'Gestion de l\'authentification et de l\'autorisation'
            },
            {
                name: 'Users',
                description: 'Gestion des utilisateurs (enseignants et étudiants)'
            },
            {
                name: 'Promotions',
                description: 'Gestion des promotions/classes d\'étudiants'
            },
            {
                name: 'Projects',
                description: 'Gestion des projets étudiants'
            },
            {
                name: 'Groups',
                description: 'Gestion des groupes de travail'
            },
            {
                name: 'Deliverables',
                description: 'Gestion des livrables et soumissions'
            },
            {
                name: 'Reports',
                description: 'Gestion des rapports collaboratifs'
            },
            {
                name: 'Defenses',
                description: 'Gestion des soutenances et planification'
            },
            {
                name: 'Grading',
                description: 'Système de notation et évaluation'
            }
        ]
    },
    apis: [
        './src/controllers/*.ts',
        './src/routes/*.ts',
        './src/entities/*.ts'
    ],
};
const specs = (0, swagger_jsdoc_1.default)(options);
exports.specs = specs;
