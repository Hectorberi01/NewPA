"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProjectService = void 0;
const typeorm_1 = require("typeorm");
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
const email_service_1 = require("../utils/email.service");
class ProjectService {
    constructor() {
        this.ds = data_source_1.AppDataSource;
        this.projectRepository = data_source_1.AppDataSource.getRepository(Entities_1.Project);
        this.groupRepository = data_source_1.AppDataSource.getRepository(Entities_1.Group);
        this.userRepository = data_source_1.AppDataSource.getRepository(Entities_1.User);
        this.promotionRepository = data_source_1.AppDataSource.getRepository(Entities_1.Promotion);
        this.emailService = new email_service_1.EmailService();
    }
    async createProject(projectData) {
        const project = this.projectRepository.create(projectData);
        const savedProject = await this.projectRepository.save(project);
        // Si le projet est visible, notifier les étudiants
        if (savedProject.status === 'visible') {
            await this.notifyStudentsNewProject(savedProject);
        }
        if (savedProject.groupFormationRule === 'random') {
            await this.createRandomGroups(savedProject.id);
        }
        return savedProject;
    }
    async updateProject(id, projectData) {
        const project = await this.projectRepository.findOne({
            where: { id },
            relations: ['promotion', 'promotion.students']
        });
        if (!project)
            throw new Error('Project not found');
        const wasVisible = project.status === 'visible';
        Object.assign(project, projectData);
        const updatedProject = await this.projectRepository.save(project);
        // Si le projet devient visible, notifier les étudiants
        if (!wasVisible && updatedProject.status === 'visible') {
            await this.notifyStudentsNewProject(updatedProject);
        }
        return updatedProject;
    }
    async getProjectById(id) {
        return await this.projectRepository.findOne({
            where: { id },
            relations: [
                'teacher',
                'promotion',
                'promotion.students',
                'groups',
                'groups.members',
                'deliverables',
                'deliverables.submissions',
                'deliverables.submissions.group',
                'deliverables.validationRules',
                'reports',
                'reports.sections',
                'reports.group',
                'defenses',
                'defenses.group',
                'gradingGrids',
                'gradingGrids.criteria'
            ]
        });
    }
    async getProjectsByTeacher(teacherId) {
        return await this.projectRepository.find({
            where: { teacher: { id: teacherId } },
            relations: ['promotion', 'promotion.students', 'groups', 'deliverables'],
            order: { createdAt: 'DESC' }
        });
    }
    async getProjectsByStudent(studentId) {
        return await this.projectRepository
            .createQueryBuilder('project')
            .innerJoin('project.promotion', 'promotion')
            .innerJoin('promotion.students', 'student')
            .leftJoinAndSelect('project.deliverables', 'deliverables')
            .leftJoinAndSelect('project.groups', 'groups')
            .leftJoinAndSelect('groups.members', 'members')
            .where('student.id = :studentId', { studentId })
            .andWhere('project.status = :status', { status: 'visible' })
            .orderBy('project.createdAt', 'DESC')
            .getMany();
    }
    async generateRandomGroups(projectId) {
        console.log(`Generating random groups for project ID: ${projectId}`);
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['promotion', 'promotion.students', 'groups']
        });
        console.log('Project details:', project);
        if (!project)
            throw new Error('Project not found');
        if (project.groupFormationRule !== 'random') {
            throw new Error('Random group generation not allowed for this project');
        }
        console.log(`Removing existing groups for project "${project}"`);
        // Supprimer les groupes existants
        if (project.groups.length > 0) {
            await this.groupRepository.remove(project.groups);
        }
        const students = project.promotion.students.filter(s => s.isActive);
        console.log(`Active students in promotion:`, students.map(s => s.id));
        const maxGroupSize = project.maxGroupSize || 4;
        const minGroupSize = project.minGroupSize || 2;
        const groups = [];
        // Mélanger les étudiants
        const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
        let currentIndex = 0;
        let groupNumber = 1;
        console.log(`Generating groups for project "${project}" with ${shuffledStudents.length} students`);
        while (currentIndex < shuffledStudents.length) {
            const remainingStudents = shuffledStudents.length - currentIndex;
            const remainingGroups = Math.ceil(remainingStudents / maxGroupSize);
            // Calculer la taille optimale pour ce groupe
            let groupSize = Math.min(maxGroupSize, remainingStudents);
            // Éviter d'avoir un dernier groupe trop petit
            if (remainingGroups === 2 && remainingStudents < minGroupSize + maxGroupSize) {
                groupSize = Math.ceil(remainingStudents / 2);
            }
            const groupMembers = shuffledStudents.slice(currentIndex, currentIndex + groupSize);
            console.log(`Forming group ${groupNumber} with members:`, groupMembers.map(m => m.id));
            const group = this.groupRepository.create({
                name: `Groupe ${groupNumber}`,
                project,
                members: groupMembers
            });
            console.log(`Creating group "${group.name}" with members:`, groupMembers.map(m => m.id));
            groups.push(await this.groupRepository.save(group));
            currentIndex += groupSize;
            groupNumber++;
        }
        return groups;
    }
    async createRandomGroups(projectId) {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['promotion', 'promotion.students', 'groups']
        });
        console.log('Project details:', project);
        if (!project)
            throw new Error('Project not found');
        console.log(`Removing existing groups for project "${project}"`);
        // Supprimer les groupes existants
        if (project.groups.length > 0) {
            await this.groupRepository.remove(project.groups);
        }
        const students = project.promotion.students.filter(s => s.isActive);
        console.log(`Active students in promotion:`, students.map(s => s.id));
        const maxGroupSize = project.maxGroupSize || 4;
        const minGroupSize = project.minGroupSize || 2;
        const groups = [];
        // Mélanger les étudiants
        const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
        let currentIndex = 0;
        let groupNumber = 1;
        console.log(`Generating groups for project "${project}" with ${shuffledStudents.length} students`);
        while (currentIndex < shuffledStudents.length) {
            const remainingStudents = shuffledStudents.length - currentIndex;
            const remainingGroups = Math.ceil(remainingStudents / maxGroupSize);
            // Calculer la taille optimale pour ce groupe
            let groupSize = Math.min(maxGroupSize, remainingStudents);
            // Éviter d'avoir un dernier groupe trop petit
            if (remainingGroups === 2 && remainingStudents < minGroupSize + maxGroupSize) {
                groupSize = Math.ceil(remainingStudents / 2);
            }
            const groupMembers = shuffledStudents.slice(currentIndex, currentIndex + groupSize);
            console.log(`Forming group ${groupNumber} with members:`, groupMembers.map(m => m.id));
            const group = this.groupRepository.create({
                name: `Groupe ${groupNumber}`,
                project,
            });
            console.log(`Creating group "${group.name}" with members:`, groupMembers.map(m => m.id));
            groups.push(await this.groupRepository.save(group));
            currentIndex += groupSize;
            groupNumber++;
        }
        return groups;
        //return this.generateRandomGroups(projectId);
    }
    async generateManualGroups(projectId, groupsData) {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['groups']
        });
        if (!project)
            throw new Error('Project not found');
        if (project.groupFormationRule !== 'manual') {
            throw new Error('Manual group generation not allowed for this project');
        }
        // Supprimer les groupes existants
        if (project.groups.length > 0) {
            await this.groupRepository.remove(project.groups);
        }
        const groups = [];
        for (const groupData of groupsData) {
            const members = await this.userRepository.findByIds(groupData.memberIds);
            // Vérifications
            if (project.minGroupSize && members.length < project.minGroupSize) {
                throw new Error(`Group "${groupData.name}" must have at least ${project.minGroupSize} members`);
            }
            if (project.maxGroupSize && members.length > project.maxGroupSize) {
                throw new Error(`Group "${groupData.name}" cannot have more than ${project.maxGroupSize} members`);
            }
            const group = this.groupRepository.create({
                name: groupData.name,
                project,
                members
            });
            groups.push(await this.groupRepository.save(group));
        }
        return groups;
    }
    async assignUnassignedStudents(projectId) {
        const project = await this.projectRepository.findOne({
            where: { id: projectId },
            relations: ['promotion', 'promotion.students', 'groups', 'groups.members']
        });
        if (!project)
            throw new Error('Project not found');
        // Trouver les étudiants non assignés
        const allStudents = project.promotion.students;
        const assignedStudentIds = new Set(project.groups.flatMap(group => group.members.map(member => member.id)));
        const unassignedStudents = allStudents.filter(student => !assignedStudentIds.has(student.id) && student.isActive);
        if (unassignedStudents.length === 0)
            return;
        // Distribuer les étudiants non assignés dans les groupes existants
        const existingGroups = [...project.groups];
        let currentGroupIndex = 0;
        for (const student of unassignedStudents) {
            if (existingGroups.length === 0) {
                // Créer un nouveau groupe si aucun groupe n'existe
                const newGroup = this.groupRepository.create({
                    name: `Groupe ${project.groups.length + 1}`,
                    project,
                    members: [student]
                });
                await this.groupRepository.save(newGroup);
            }
            else {
                // Ajouter à un groupe existant
                const targetGroup = existingGroups[currentGroupIndex];
                if (!project.maxGroupSize || targetGroup.members.length < project.maxGroupSize) {
                    targetGroup.members.push(student);
                    await this.groupRepository.save(targetGroup);
                }
                currentGroupIndex = (currentGroupIndex + 1) % existingGroups.length;
            }
        }
    }
    async deleteProject(id) {
        const project = await this.projectRepository.findOne({ where: { id } });
        if (!project)
            throw new Error('Project not found');
        await this.projectRepository.remove(project);
    }
    async notifyStudentsNewProject(project) {
        if (!project.promotion?.students)
            return;
        const emailPromises = project.promotion.students.map(student => this.emailService.sendProjectNotificationEmail(student.email, project.name, project.description));
        await Promise.allSettled(emailPromises);
    }
    async saveGrouping(projectId, payload) {
        const qr = this.ds.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();
        try {
            // 1) Charger projet + groupes + membres + promo/étudiants (contrôle appartenance)
            const project = await qr.manager.getRepository(Entities_1.Project).findOne({
                where: { id: projectId },
                relations: [
                    "groups",
                    "groups.members",
                    "promotion",
                    "promotion.students",
                ],
            });
            if (!project) {
                const err = new Error("Projet introuvable");
                err.code = "NOT_FOUND";
                throw err;
            }
            const groupsById = new Map();
            project.groups.forEach((g) => groupsById.set(g.id, g));
            // 2) Validation de base payload
            const payloadGroupIds = new Set(payload.groups.map((g) => g.id));
            // (optionnel) s'assurer que tous les groupes du payload appartiennent au projet
            const invalidGroupIds = [...payloadGroupIds].filter((id) => !groupsById.has(id));
            if (invalidGroupIds.length > 0) {
                const err = new Error("Certains groupes ne font pas partie du projet");
                err.code = "VALIDATION_ERROR";
                err.details = { invalidGroupIds };
                throw err;
            }
            // 3) Vérifier l'appartenance des étudiants à la promotion du projet
            const allowedStudentIds = new Set((project.promotion?.students ?? []).map((s) => s.id));
            const requestedIds = new Set([
                ...payload.unassignedIds,
                ...payload.groups.flatMap((g) => g.memberIds),
            ]);
            const outside = [...requestedIds].filter((id) => !allowedStudentIds.has(id));
            if (outside.length > 0) {
                const err = new Error("Des étudiants ne sont pas dans la promotion du projet");
                err.code = "VALIDATION_ERROR";
                err.details = { studentIdsNotInPromotion: outside };
                throw err;
            }
            // 4) Unicité : un étudiant ne peut être dans deux groupes à la fois
            const allAssigned = payload.groups.flatMap((g) => g.memberIds);
            const dupCheck = new Map();
            const duplicates = [];
            allAssigned.forEach((sid) => {
                dupCheck.set(sid, (dupCheck.get(sid) ?? 0) + 1);
            });
            dupCheck.forEach((count, sid) => count > 1 && duplicates.push(sid));
            if (duplicates.length) {
                const err = new Error("Un étudiant est assigné à plusieurs groupes");
                err.code = "VALIDATION_ERROR";
                err.details = { duplicates };
                throw err;
            }
            // 5) Capacité : chaque groupe <= capacity
            const overCapacity = payload.groups
                .map((g) => ({ g, entity: groupsById.get(g.id) }))
                .filter(({ g, entity }) => g.memberIds.length > project.maxGroupSize)
                .map(({ g, entity }) => ({ groupId: g.id, capacity: project.maxGroupSize, requested: g.memberIds.length }));
            if (overCapacity.length) {
                const err = new Error("Capacité de groupe dépassée");
                err.code = "CAPACITY_EXCEEDED";
                err.details = { overCapacity };
                throw err;
            }
            // 6) Construire l'état cible + calculer add/remove par groupe
            const userRepo = qr.manager.getRepository(Entities_1.User);
            // Charger tous les utilisateurs impliqués (optimisation requête)
            const allUserIds = [...requestedIds];
            const users = allUserIds.length
                ? await userRepo.find({ where: { id: (0, typeorm_1.In)(allUserIds) } })
                : [];
            const usersById = new Map(users.map((u) => [u.id, u]));
            let affectedLinks = 0;
            // Pour chaque groupe du projet, on aligne l'état avec le payload
            for (const g of project.groups) {
                const desired = payload.groups.find((x) => x.id === g.id)?.memberIds ?? [];
                const current = (g.members ?? []).map((m) => m.id);
                const toAdd = desired.filter((id) => !current.includes(id));
                const toRemove = current.filter((id) => !desired.includes(id));
                if (toAdd.length === 0 && toRemove.length === 0)
                    continue;
                // Vérif finale (au cas où) : pas d'IDs inconnus
                const validAdd = toAdd.filter((id) => usersById.has(id));
                // Mettre à jour la relation ManyToMany (clear+add partiel)
                if (toRemove.length) {
                    await qr.manager
                        .createQueryBuilder()
                        .relation(Entities_1.Group, "members")
                        .of(g.id)
                        .remove(toRemove);
                    affectedLinks += toRemove.length;
                }
                if (validAdd.length) {
                    const addUsers = validAdd.map((id) => usersById.get(id));
                    await qr.manager
                        .createQueryBuilder()
                        .relation(Entities_1.Group, "members")
                        .of(g.id)
                        .add(addUsers);
                    affectedLinks += validAdd.length;
                }
            }
            await qr.commitTransaction();
            return { updatedGroups: project.groups.length, affectedLinks };
        }
        catch (e) {
            await qr.rollbackTransaction();
            throw e;
        }
        finally {
            await qr.release();
        }
    }
}
exports.ProjectService = ProjectService;
