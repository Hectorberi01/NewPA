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
        await this.createRandomGroups(savedProject.id);
        // Si le projet est visible, notifier les étudiants
        if (savedProject.status === 'visible') {
            await this.notifyStudentsNewProject(savedProject);
        }
        if (savedProject.groupFormationRule == 'random') {
            //await this.createRandomGroups(savedProject.id);
            await this.assignUnassignedStudents(savedProject.id);
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
        if (!wasVisible && updatedProject.status === 'visible') {
            for (const student of project.promotion.students) {
                this.emailService.sendProjectVisibleEmail(student.email, student.firstName, updatedProject.name);
            }
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
    async getProjectsByIdForStudent(studentId, projectId, options) {
        const skip = options?.skip;
        const take = options?.take;
        try {
            const qb = this.projectRepository
                .createQueryBuilder('project')
                .leftJoinAndSelect('project.teacher', 'teacher')
                .leftJoinAndSelect('project.deliverables', 'deliverables')
                .leftJoinAndSelect('deliverables.validationRules', 'deliverableValidationRules')
                .leftJoinAndSelect('deliverables.submissions', 'deliverableSubmissions')
                .leftJoinAndSelect('deliverableSubmissions.group', 'submissionGroup')
                .leftJoinAndSelect('project.groups', 'groups')
                .leftJoinAndSelect('groups.members', 'members')
                .leftJoinAndSelect('groups.deliverableSubmissions', 'groupDeliverableSubmissions')
                .leftJoinAndSelect('groupDeliverableSubmissions.deliverable', 'gdsDeliverable')
                .leftJoinAndSelect('groups.reports', 'groupReports')
                .leftJoinAndSelect('groupReports.sections', 'groupReportSections')
                .leftJoinAndSelect('groups.defenses', 'groupDefenses')
                .leftJoinAndSelect('groups.grades', 'groupGrades')
                .leftJoinAndSelect('project.reports', 'projectReports')
                .leftJoinAndSelect('projectReports.sections', 'projectReportSections')
                .leftJoinAndSelect('projectReports.group', 'reportGroup')
                .leftJoinAndSelect('project.defenses', 'defenses')
                .leftJoinAndSelect('project.gradingGrids', 'gradingGrids')
                .where('project.status = :status', { status: 'visible' })
                .andWhere('project.id = :projectId', { projectId })
                .andWhere(qb => {
                const subQuery = qb
                    .subQuery()
                    .select('1')
                    .from('group', 'g')
                    .innerJoin('g.members', 'm')
                    .where('g.projectId = project.id')
                    .andWhere('m.id = :studentId')
                    .getQuery();
                return `EXISTS ${subQuery}`;
            })
                .setParameter('studentId', studentId)
                .orderBy('project.createdAt', 'DESC');
            if (typeof skip === 'number')
                qb.skip(skip);
            if (typeof take === 'number')
                qb.take(take);
            const project = await qb.getOne();
            if (!project) {
                throw new Error('Project not found or student not authorized');
            }
            return project;
        }
        catch (err) {
            throw err;
        }
    }
    async getProjectsByTeacher(teacherId) {
        return await this.projectRepository.find({
            where: { teacher: { id: teacherId } },
            relations: ['promotion', 'promotion.students', 'groups', 'deliverables'],
            order: { createdAt: 'DESC' }
        });
    }
    async getProjectsByStudent(studentId, options) {
        const skip = options?.skip;
        const take = options?.take;
        try {
            const qb = this.projectRepository
                .createQueryBuilder('project')
                // relations principales
                .leftJoinAndSelect('project.promotion', 'promotion')
                .leftJoinAndSelect('promotion.students', 'promotionStudents')
                .leftJoinAndSelect('project.teacher', 'teacher')
                .leftJoinAndSelect('project.deliverables', 'deliverables')
                .leftJoinAndSelect('deliverables.validationRules', 'deliverableValidationRules')
                .leftJoinAndSelect('deliverables.submissions', 'deliverableSubmissions')
                .leftJoinAndSelect('deliverableSubmissions.group', 'submissionGroup') // si besoin d'accéder au groupe depuis la soumission
                // groups et sous-relations
                .leftJoinAndSelect('project.groups', 'groups')
                .leftJoinAndSelect('groups.members', 'members')
                .leftJoinAndSelect('groups.deliverableSubmissions', 'groupDeliverableSubmissions')
                .leftJoinAndSelect('groupDeliverableSubmissions.deliverable', 'gdsDeliverable')
                .leftJoinAndSelect('groups.reports', 'groupReports')
                .leftJoinAndSelect('groupReports.sections', 'groupReportSections')
                .leftJoinAndSelect('groups.defenses', 'groupDefenses')
                .leftJoinAndSelect('groups.grades', 'groupGrades')
                // reports liés au projet (indépendants des groupes) et leurs sections
                .leftJoinAndSelect('project.reports', 'projectReports')
                .leftJoinAndSelect('projectReports.sections', 'projectReportSections')
                // defenses et gradingGrids au niveau du projet
                .leftJoinAndSelect('project.defenses', 'defenses')
                .leftJoinAndSelect('project.gradingGrids', 'gradingGrids')
                // Filtre : projet visible
                .where('project.status = :status', { status: 'visible' })
                // Filtre : l'étudiant appartient soit à la promotion, soit à un groupe du projet
                .andWhere(new typeorm_1.Brackets(qb => {
                qb.where('promotionStudents.id = :studentId', { studentId })
                    .orWhere('members.id = :studentId', { studentId });
            }))
                // éviter doublons
                .distinct(true)
                // tri
                .orderBy('project.createdAt', 'DESC');
            // pagination si fournie (optionnel)
            if (typeof skip === 'number')
                qb.skip(skip);
            if (typeof take === 'number')
                qb.take(take);
            return await qb.getMany();
        }
        catch (err) {
            throw err;
        }
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
        if (project.groups.length > 0) {
            await this.groupRepository.remove(project.groups);
        }
        const students = project.promotion.students.filter(s => s.isActive);
        console.log(`Active students in promotion:`, students.map(s => s.id));
        const maxGroupSize = project.maxGroupSize || 4;
        const minGroupSize = project.minGroupSize || 2;
        const groups = [];
        const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
        let currentIndex = 0;
        let groupNumber = 1;
        console.log(`Generating groups for project "${project}" with ${shuffledStudents.length} students`);
        while (currentIndex < shuffledStudents.length) {
            const remainingStudents = shuffledStudents.length - currentIndex;
            const remainingGroups = Math.ceil(remainingStudents / maxGroupSize);
            let groupSize = Math.min(maxGroupSize, remainingStudents);
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
        if (project.groups.length > 0) {
            await this.groupRepository.remove(project.groups);
        }
        const groups = [];
        for (const groupData of groupsData) {
            const members = await this.userRepository.findByIds(groupData.memberIds);
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
        const allStudents = project.promotion.students;
        const assignedStudentIds = new Set(project.groups.flatMap(group => group.members.map(member => member.id)));
        const unassignedStudents = allStudents.filter(student => !assignedStudentIds.has(student.id) && student.isActive);
        if (unassignedStudents.length === 0)
            return;
        const existingGroups = [...project.groups];
        let currentGroupIndex = 0;
        for (const student of unassignedStudents) {
            if (existingGroups.length === 0) {
                const newGroup = this.groupRepository.create({
                    name: `Groupe ${project.groups.length + 1}`,
                    project,
                    members: [student]
                });
                await this.groupRepository.save(newGroup);
            }
            else {
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
        return await this.projectRepository.manager.transaction(async (transactionalEntityManager) => {
            const project = await transactionalEntityManager.findOne(Entities_1.Project, {
                where: { id },
                relations: ['groups', 'gradingGrids', 'deliverables', 'reports', 'defenses']
            });
            if (!project)
                throw new Error('Project not found');
            const groups = project.groups;
            const groupIds = groups.map(g => g.id);
            const grades = await transactionalEntityManager.find(Entities_1.Grade, { where: { group: { id: (0, typeorm_1.In)(groupIds) } } });
            const gradeIds = grades.map(g => g.id);
            await transactionalEntityManager.delete(Entities_1.CriterionGrade, { grade: { id: (0, typeorm_1.In)(gradeIds) } });
            await transactionalEntityManager.delete(Entities_1.Grade, { id: (0, typeorm_1.In)(gradeIds) });
            const grids = project.gradingGrids;
            const gridIds = grids.map(g => g.id);
            await transactionalEntityManager.delete(Entities_1.GradingCriterion, { gradingGrid: { id: (0, typeorm_1.In)(gridIds) } });
            await transactionalEntityManager.delete(Entities_1.GradingGrid, { id: (0, typeorm_1.In)(gridIds) });
            const deliverables = project.deliverables;
            const deliverableIds = deliverables.map(d => d.id);
            await transactionalEntityManager.delete(Entities_1.DeliverableRule, { deliverable: { id: (0, typeorm_1.In)(deliverableIds) } });
            await transactionalEntityManager.delete(Entities_1.Deliverable, { id: (0, typeorm_1.In)(deliverableIds) });
            await transactionalEntityManager.delete(Entities_1.DeliverableSubmission, { group: { id: (0, typeorm_1.In)(groupIds) } });
            const reports = await transactionalEntityManager.find(Entities_1.Report, { where: { project: { id } } });
            const reportIds = reports.map(r => r.id);
            await transactionalEntityManager.delete(Entities_1.ReportSection, { report: { id: (0, typeorm_1.In)(reportIds) } });
            await transactionalEntityManager.delete(Entities_1.Report, { id: (0, typeorm_1.In)(reportIds) });
            await transactionalEntityManager.delete(Entities_1.Defense, { project: { id } });
            if (groupIds.length > 0) {
                await transactionalEntityManager.query(`DELETE FROM group_members_user WHERE groupId IN (${groupIds.join(',')})`);
            }
            await transactionalEntityManager.delete(Entities_1.Group, { id: (0, typeorm_1.In)(groupIds) });
            await transactionalEntityManager.delete(Entities_1.Project, { id });
        });
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
            const payloadGroupIds = new Set(payload.groups.map((g) => g.id));
            const invalidGroupIds = [...payloadGroupIds].filter((id) => !groupsById.has(id));
            if (invalidGroupIds.length > 0) {
                const err = new Error("Certains groupes ne font pas partie du projet");
                err.code = "VALIDATION_ERROR";
                err.details = { invalidGroupIds };
                throw err;
            }
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
            const userRepo = qr.manager.getRepository(Entities_1.User);
            const allUserIds = [...requestedIds];
            const users = allUserIds.length
                ? await userRepo.find({ where: { id: (0, typeorm_1.In)(allUserIds) } })
                : [];
            const usersById = new Map(users.map((u) => [u.id, u]));
            let affectedLinks = 0;
            for (const g of project.groups) {
                const desired = payload.groups.find((x) => x.id === g.id)?.memberIds ?? [];
                const current = (g.members ?? []).map((m) => m.id);
                const toAdd = desired.filter((id) => !current.includes(id));
                const toRemove = current.filter((id) => !desired.includes(id));
                if (toAdd.length === 0 && toRemove.length === 0)
                    continue;
                const validAdd = toAdd.filter((id) => usersById.has(id));
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
