"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefenseService = void 0;
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
const pdf_generator_service_1 = require("../utils/pdf-generator.service");
class DefenseService {
    constructor() {
        this.defenseRepository = data_source_1.AppDataSource.getRepository(Entities_1.Defense);
        this.groupRepository = data_source_1.AppDataSource.getRepository(Entities_1.Group);
    }
    async scheduleDefenses(projectId, startDateTime, durationPerGroup // en minutes
    ) {
        const groups = await this.groupRepository.find({
            where: { project: { id: projectId } },
            relations: ['members']
        });
        const defenses = [];
        let currentTime = new Date(startDateTime);
        for (let i = 0; i < groups.length; i++) {
            const endTime = new Date(currentTime);
            endTime.setMinutes(endTime.getMinutes() + durationPerGroup);
            const defense = this.defenseRepository.create({
                project: { id: projectId },
                group: groups[i],
                startTime: new Date(currentTime),
                endTime: endTime,
                orderIndex: i + 1
            });
            defenses.push(await this.defenseRepository.save(defense));
            // Préparer l'heure suivante (avec pause de 5 minutes)
            currentTime.setMinutes(currentTime.getMinutes() + durationPerGroup + 5);
        }
        return defenses;
    }
    async updateDefenseOrder(projectId, newOrder) {
        const defenses = await this.defenseRepository.find({
            where: { project: { id: projectId } },
            relations: ['group']
        });
        for (const orderUpdate of newOrder) {
            const defense = defenses.find(d => d.group.id === orderUpdate.groupId);
            if (defense) {
                defense.orderIndex = orderUpdate.orderIndex;
                await this.defenseRepository.save(defense);
            }
        }
        return await this.defenseRepository.find({
            where: { project: { id: projectId } },
            relations: ['group', 'group.members'],
            order: { orderIndex: 'ASC' }
        });
    }
    async generateDefenseSchedulePDF(projectId) {
        const defenses = await this.defenseRepository.find({
            where: { project: { id: projectId } },
            relations: ['group', 'group.members', 'project'],
            order: { orderIndex: 'ASC' }
        });
        return await pdf_generator_service_1.PDFGeneratorService.generateDefenseSchedule(defenses, defenses[0]?.project?.name || 'Projet');
    }
    async generateAttendanceSheetPDF(projectId, orderType) {
        const groups = await this.groupRepository.find({
            where: { project: { id: projectId } },
            relations: ['members', 'project']
        });
        return await pdf_generator_service_1.PDFGeneratorService.generateAttendanceSheet(groups, groups[0]?.project?.name || 'Projet', orderType);
    }
    async getDefensesByProject(projectId) {
        return await this.defenseRepository.find({
            where: { project: { id: projectId } },
            relations: ['group', 'group.members'],
            order: { orderIndex: 'ASC' }
        });
    }
    async getDefenseByGroup(projectId, groupId) {
        return await this.defenseRepository.findOne({
            where: {
                project: { id: projectId },
                group: { id: groupId }
            },
            relations: ['group', 'group.members']
        });
    }
    async updateDefense(id, defenseData) {
        const defense = await this.defenseRepository.findOne({ where: { id } });
        if (!defense)
            throw new Error('Defense not found');
        Object.assign(defense, defenseData);
        return await this.defenseRepository.save(defense);
    }
    async deleteDefense(id) {
        const defense = await this.defenseRepository.findOne({ where: { id } });
        if (!defense)
            throw new Error('Defense not found');
        await this.defenseRepository.remove(defense);
    }
}
exports.DefenseService = DefenseService;
