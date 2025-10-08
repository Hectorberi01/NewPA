"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GroupService = void 0;
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
class GroupService {
    constructor() {
        this.groupRepository = data_source_1.AppDataSource.getRepository(Entities_1.Group);
        this.userRepository = data_source_1.AppDataSource.getRepository(Entities_1.User);
        this.projectRepository = data_source_1.AppDataSource.getRepository(Entities_1.Project);
    }
    async createGroup(projectId, name, memberIds) {
        const project = await this.projectRepository.findOne({ where: { id: projectId } });
        if (!project)
            throw new Error('Project not found');
        const members = await this.userRepository.findByIds(memberIds);
        // Vérifications
        if (project.minGroupSize && members.length < project.minGroupSize) {
            throw new Error(`Group must have at least ${project.minGroupSize} members`);
        }
        if (project.maxGroupSize && members.length > project.maxGroupSize) {
            throw new Error(`Group cannot have more than ${project.maxGroupSize} members`);
        }
        const group = this.groupRepository.create({
            name,
            project,
            members
        });
        return await this.groupRepository.save(group);
    }
    async joinGroup(groupId, studentId) {
        const group = await this.groupRepository.findOne({
            where: { id: groupId },
            relations: ['project', 'members']
        });
        if (!group)
            throw new Error('Group not found');
        const project = group.project;
        if (project.groupFormationRule !== 'free') {
            throw new Error('Students cannot join groups for this project');
        }
        if (project.groupFormationDeadline && new Date() > project.groupFormationDeadline) {
            throw new Error('Group formation deadline has passed');
        }
        const student = await this.userRepository.findOne({ where: { id: studentId } });
        if (!student)
            throw new Error('Student not found');
        if (project.maxGroupSize && group.members.length >= project.maxGroupSize) {
            throw new Error('Group is full');
        }
        if (group.members.some(m => m.id === studentId)) {
            throw new Error('Student is already in this group');
        }
        group.members.push(student);
        return await this.groupRepository.save(group);
    }
    async getGroupsByProject(projectId) {
        return await this.groupRepository.find({
            where: { project: { id: projectId } },
            relations: ['members']
        });
    }
}
exports.GroupService = GroupService;
