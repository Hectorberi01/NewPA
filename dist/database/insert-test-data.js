"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// insert-test-data.ts
const data_source_1 = require("./data-source");
const Entities_1 = require("../entities/Entities");
async function insertTestData() {
    try {
        await data_source_1.AppDataSource.initialize();
        console.log('Connexion à la base de données établie');
        // Démarrer une transaction
        const queryRunner = data_source_1.AppDataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();
        try {
            // 1. Insertion des Users
            console.log('Insertion des utilisateurs...');
            const userRepository = queryRunner.manager.getRepository(Entities_1.User);
            const users = await userRepository.save([
                {
                    email: "prof.dupont@univ.fr",
                    firstName: "Jean",
                    lastName: "Dupont",
                    password: "$2b$10$hashedpassword1",
                    role: "teacher",
                    isActive: true,
                },
                {
                    email: "etudiant.martin@univ.fr",
                    firstName: "Marie",
                    lastName: "Martin",
                    password: "$2b$10$hashedpassword2",
                    role: "student",
                    isActive: true,
                },
                {
                    email: "etudiant.leroy@univ.fr",
                    firstName: "Pierre",
                    lastName: "Leroy",
                    password: "$2b$10$hashedpassword3",
                    role: "student",
                    isActive: true,
                },
                {
                    email: "etudiant.dubois@univ.fr",
                    firstName: "Sophie",
                    lastName: "Dubois",
                    password: "$2b$10$hashedpassword4",
                    role: "student",
                    isActive: true,
                }
            ]);
            // 2. Insertion de la Promotion
            console.log('Insertion des promotions...');
            const promotionRepository = queryRunner.manager.getRepository(Entities_1.Promotion);
            const promotion = await promotionRepository.save({
                name: "Master Informatique 2024",
                description: "Promotion de Master en Informatique pour l'année 2024",
                year: 2024,
                teacher: users[0], // Prof. Dupont
            });
            // 3. Lier les étudiants à la promotion (relation ManyToMany)
            promotion.students = [users[1], users[2], users[3]]; // Les 3 étudiants
            await promotionRepository.save(promotion);
            // 4. Insertion des Projects
            console.log('Insertion des projets...');
            const projectRepository = queryRunner.manager.getRepository(Entities_1.Project);
            const projects = await projectRepository.save([
                {
                    name: "Application de Gestion de Projets",
                    description: "Développement d'une application web de gestion de projets étudiants",
                    status: "visible",
                    minGroupSize: 2,
                    maxGroupSize: 3,
                    groupFormationRule: "manual",
                    groupFormationDeadline: new Date("2024-02-15"),
                    teacher: users[0],
                    promotion: promotion,
                },
                {
                    name: "Système de Recommandation",
                    description: "Implémentation d'un algorithme de recommandation collaboratif",
                    status: "draft",
                    minGroupSize: 2,
                    maxGroupSize: 2,
                    groupFormationRule: "random",
                    groupFormationDeadline: new Date("2024-03-01"),
                    teacher: users[0],
                    promotion: promotion,
                }
            ]);
            // 5. Insertion des Groups
            console.log('Insertion des groupes...');
            const groupRepository = queryRunner.manager.getRepository(Entities_1.Group);
            const groups = await groupRepository.save([
                {
                    name: "Groupe Alpha",
                    project: projects[0],
                    members: [users[1], users[2]], // Marie et Pierre
                },
                {
                    name: "Groupe Beta",
                    project: projects[0],
                    members: [users[3]], // Sophie seule
                }
            ]);
            // 6. Insertion des Deliverables
            console.log('Insertion des livrables...');
            const deliverableRepository = queryRunner.manager.getRepository(Entities_1.Deliverable);
            const deliverables = await deliverableRepository.save([
                {
                    name: "Spécifications fonctionnelles",
                    description: "Document détaillant les spécifications du projet",
                    type: "archive",
                    deadline: new Date("2024-02-20"),
                    allowLateSubmission: true,
                    penaltyPerHour: 1,
                    project: projects[0],
                },
                {
                    name: "Code Source V1",
                    description: "Première version du code source avec fonctionnalités de base",
                    type: "git_link",
                    deadline: new Date("2024-03-15"),
                    allowLateSubmission: false,
                    penaltyPerHour: 0,
                    project: projects[0],
                }
            ]);
            // 7. Insertion des DeliverableRules
            console.log('Insertion des règles de livrable...');
            const ruleRepository = queryRunner.manager.getRepository(Entities_1.DeliverableRule);
            await ruleRepository.save([
                {
                    type: "max_size",
                    configuration: '{"maxSizeMB": 10}',
                    errorMessage: "Le fichier ne doit pas dépasser 10MB",
                    deliverable: deliverables[0],
                },
                {
                    type: "file_presence",
                    configuration: '{"requiredFiles": ["specifications.pdf", "README.md"]}',
                    errorMessage: "Les fichiers specifications.pdf et README.md sont requis",
                    deliverable: deliverables[0],
                }
            ]);
            // 8. Insertion des DeliverableSubmissions
            console.log('Insertion des soumissions...');
            const submissionRepository = queryRunner.manager.getRepository(Entities_1.DeliverableSubmission);
            await submissionRepository.save({
                filePath: "/uploads/specs_groupe_alpha.zip",
                submittedAt: new Date("2024-02-19"),
                isLate: false,
                penalty: 0,
                validationResults: { "max_size": "passed", "file_presence": "passed" },
                deliverable: deliverables[0],
                group: groups[0],
            });
            // 9. Insertion des Reports
            console.log('Insertion des rapports...');
            const reportRepository = queryRunner.manager.getRepository(Entities_1.Report);
            const report = await reportRepository.save({
                title: "Rapport de Conception",
                description: "Rapport détaillant l'architecture et les choix techniques",
                project: projects[0],
                group: groups[0],
            });
            // 10. Insertion des ReportSections
            console.log('Insertion des sections de rapport...');
            const sectionRepository = queryRunner.manager.getRepository(Entities_1.ReportSection);
            await sectionRepository.save([
                {
                    title: "Introduction",
                    content: "Ce projet vise à développer une application de gestion...",
                    orderIndex: 1,
                    report: report,
                },
                {
                    title: "Architecture",
                    content: "L'application utilise une architecture microservices...",
                    orderIndex: 2,
                    report: report,
                }
            ]);
            // 11. Insertion des Defenses
            console.log('Insertion des soutenances...');
            const defenseRepository = queryRunner.manager.getRepository(Entities_1.Defense);
            await defenseRepository.save({
                startTime: new Date("2024-06-10T09:00:00"),
                endTime: new Date("2024-06-10T09:30:00"),
                orderIndex: 1,
                location: "Salle A101",
                project: projects[0],
                group: groups[0],
            });
            // 12. Insertion du système de notation
            console.log('Insertion du système de notation...');
            const gridRepository = queryRunner.manager.getRepository(Entities_1.GradingGrid);
            const gradingGrids = await gridRepository.save([
                {
                    name: "Grille d'évaluation du projet",
                    type: "deliverable",
                    weight: 0.6,
                    description: "Évaluation globale du projet",
                    project: projects[0],
                },
                {
                    name: "Grille de soutenance",
                    type: "defense",
                    weight: 0.4,
                    description: "Évaluation de la présentation orale",
                    project: projects[0],
                }
            ]);
            const criterionRepository = queryRunner.manager.getRepository(Entities_1.GradingCriterion);
            const criteria = await criterionRepository.save([
                {
                    name: "Qualité du code",
                    description: "Lisibilité, structure, commentaires",
                    maxScore: 20,
                    weight: 1.0,
                    type: "group",
                    hasComments: true,
                    gradingGrid: gradingGrids[0],
                },
                {
                    name: "Fonctionnalités implémentées",
                    description: "Respect des spécifications",
                    maxScore: 30,
                    weight: 1.0,
                    type: "group",
                    hasComments: false,
                    gradingGrid: gradingGrids[0],
                }
            ]);
            const gradeRepository = queryRunner.manager.getRepository(Entities_1.Grade);
            const grade = await gradeRepository.save({
                totalScore: 42.5,
                globalComments: "Bon travail global, quelques améliorations possibles sur la documentation",
                isValidated: true,
                gradingGrid: gradingGrids[0],
                group: groups[0],
            });
            const criterionGradeRepository = queryRunner.manager.getRepository(Entities_1.CriterionGrade);
            await criterionGradeRepository.save([
                {
                    score: 18,
                    comments: "Code bien structuré mais manque de commentaires",
                    grade: grade,
                    criterion: criteria[0],
                },
                {
                    score: 24.5,
                    comments: null,
                    grade: grade,
                    criterion: criteria[1],
                }
            ]);
            // Valider la transaction
            await queryRunner.commitTransaction();
            console.log('✅ Données de test insérées avec succès!');
        }
        catch (error) {
            // Annuler la transaction en cas d'erreur
            await queryRunner.rollbackTransaction();
            console.error('❌ Erreur lors de l\'insertion:', error);
            throw error;
        }
        finally {
            await queryRunner.release();
        }
    }
    catch (error) {
        console.error('❌ Erreur de connexion:', error);
    }
    finally {
        await data_source_1.AppDataSource.destroy();
    }
}
// Exécuter le script
insertTestData();
