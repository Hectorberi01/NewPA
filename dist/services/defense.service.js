"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DefenseService = void 0;
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
const pdf_generator_service_1 = require("../utils/pdf-generator.service");
class DefenseService {
    constructor(ds) {
        this.defenseRepository = data_source_1.AppDataSource.getRepository(Entities_1.Defense);
        this.groupRepository = data_source_1.AppDataSource.getRepository(Entities_1.Group);
        this.ds = ds ?? data_source_1.AppDataSource;
        if (!this.ds)
            throw new Error("DataSource not provided");
    }
    async scheduleDefenses(projectId, startDateTime, durationPerGroup, location, mode = 'fixed_duration', endDateTime) {
        // Validation
        if (!projectId || isNaN(projectId)) {
            throw new Error('projectId invalide');
        }
        if (!startDateTime || !(startDateTime instanceof Date)) {
            throw new Error('startDateTime invalide');
        }
        if (!location || location.trim() === '') {
            throw new Error('location est requis');
        }
        // Vérifier que le projet existe
        const project = await this.ds.getRepository(Entities_1.Project).findOne({
            where: { id: projectId }
        });
        if (!project) {
            throw new Error('Projet introuvable');
        }
        // Récupérer tous les groupes du projet
        const groups = await this.ds.getRepository(Entities_1.Group).find({
            where: { project: { id: projectId } },
            relations: ['members'],
            order: { createdAt: 'ASC' }
        });
        if (groups.length === 0) {
            throw new Error('Aucun groupe trouvé pour ce projet');
        }
        let calculatedDurationPerGroup;
        // Déterminer la durée par groupe selon le mode
        if (mode === 'fixed_duration') {
            if (!durationPerGroup || durationPerGroup <= 0) {
                throw new Error('durationPerGroup doit être > 0 en mode fixed_duration');
            }
            calculatedDurationPerGroup = durationPerGroup;
        }
        else if (mode === 'time_range') {
            if (!endDateTime || !(endDateTime instanceof Date)) {
                throw new Error('endDateTime invalide en mode time_range');
            }
            if (endDateTime <= startDateTime) {
                throw new Error('La date de fin doit être après la date de début');
            }
            const totalMinutes = Math.floor((endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60));
            calculatedDurationPerGroup = Math.floor(totalMinutes / groups.length);
            if (calculatedDurationPerGroup < 10) {
                throw new Error(`Durée calculée trop courte (${calculatedDurationPerGroup} min pour ${groups.length} groupes). ` +
                    `Augmentez la plage horaire ou réduisez le nombre de groupes.`);
            }
        }
        else {
            throw new Error('Mode invalide');
        }
        // Créer les défenses
        const defenses = [];
        const durationMs = calculatedDurationPerGroup * 60 * 1000;
        for (let i = 0; i < groups.length; i++) {
            const defenseStartTime = new Date(startDateTime.getTime() + i * durationMs);
            const defenseEndTime = new Date(defenseStartTime.getTime() + durationMs);
            const defense = this.ds.getRepository(Entities_1.Defense).create({
                project,
                group: groups[i],
                startTime: defenseStartTime,
                endTime: defenseEndTime,
                location,
                orderIndex: i + 1
            });
            defenses.push(defense);
        }
        // Sauvegarder les défenses
        const savedDefenses = await this.ds.getRepository(Entities_1.Defense).save(defenses);
        return {
            defenses: savedDefenses,
            mode,
            calculatedDurationPerGroup,
            totalGroups: groups.length,
            message: `${groups.length} défenses planifiées avec succès`
        };
    }
    // async updateDefenseOrder(projectId: number, newOrder: { groupId: number; orderIndex: number }[]): Promise<Defense[]> {
    //   const defenses = await this.defenseRepository.find({
    //     where: { project: { id: projectId } },
    //     relations: ['group']
    //   });
    //   for (const orderUpdate of newOrder) {
    //     const defense = defenses.find(d => d.group.id === orderUpdate.groupId);
    //     if (defense) {
    //       defense.orderIndex = orderUpdate.orderIndex;
    //       await this.defenseRepository.save(defense);
    //     }
    //   }
    //   return await this.defenseRepository.find({
    //     where: { project: { id: projectId } },
    //     relations: ['group', 'group.members'],
    //     order: { orderIndex: 'ASC' }
    //   });
    // }
    /**
     * Met à jour l'ordre des défenses pour un projet.
     * newOrder: [{ groupId, orderIndex }, ...]
     */
    async updateDefenseOrder(projectId, newOrder) {
        if (!Number.isFinite(projectId)) {
            const e = new Error("projectId invalide");
            e.code = "BAD_REQUEST";
            throw e;
        }
        if (!Array.isArray(newOrder) || newOrder.length === 0) {
            const e = new Error("newOrder doit être un tableau non vide");
            e.code = "BAD_REQUEST";
            throw e;
        }
        // Validation basique des éléments
        for (const item of newOrder) {
            if (!Number.isFinite(item.groupId) || !Number.isFinite(item.orderIndex)) {
                const e = new Error("Chaque élément doit contenir groupId et orderIndex numériques");
                e.code = "BAD_REQUEST";
                throw e;
            }
        }
        const qr = this.ds.createQueryRunner();
        await qr.connect();
        await qr.startTransaction();
        try {
            const project = await qr.manager.getRepository(Entities_1.Project).findOne({
                where: { id: projectId },
                relations: ["defenses"],
            });
            if (!project) {
                const e = new Error("Projet introuvable");
                e.code = "NOT_FOUND";
                throw e;
            }
            const defenses = await qr.manager.getRepository(Entities_1.Defense).find({
                where: { project: { id: projectId } },
                relations: ["group"],
                order: { orderIndex: "ASC" },
            });
            const defenseByGroup = new Map();
            defenses.forEach(d => {
                if (d.group && typeof d.group.id === "number") {
                    defenseByGroup.set(d.group.id, d);
                }
            });
            const unknownGroupIds = newOrder
                .map(i => i.groupId)
                .filter(gid => !defenseByGroup.has(gid));
            if (unknownGroupIds.length > 0) {
                const e = new Error("Certains groupId ne font pas partie du projet");
                e.code = "VALIDATION_ERROR";
                e.details = { unknownGroupIds };
                throw e;
            }
            // Récupérer les paramètres de planification
            const firstDefense = defenses[0];
            if (!firstDefense || !firstDefense.startTime) {
                const e = new Error("Aucune défense planifiée trouvée pour ce projet");
                e.code = "NOT_FOUND";
                throw e;
            }
            // Calculer la durée par groupe
            const durationMs = new Date(firstDefense.endTime).getTime() - new Date(firstDefense.startTime).getTime();
            // Récupérer l'heure de début initiale
            const initialStartTime = new Date(Math.min(...defenses.map(d => new Date(d.startTime).getTime())));
            // IMPORTANT: Trier par orderIndex ET normaliser à 1, 2, 3, 4, 5...
            const sortedNewOrder = [...newOrder]
                .sort((a, b) => a.orderIndex - b.orderIndex)
                .map((item, index) => ({
                ...item,
                orderIndex: index + 1 // Normaliser: 1, 2, 3, 4, 5...
            }));
            // Appliquer les updates avec recalcul des heures
            const repo = qr.manager.getRepository(Entities_1.Defense);
            for (const item of sortedNewOrder) {
                const defense = defenseByGroup.get(item.groupId);
                // Calculer les nouvelles heures basées sur la POSITION (index + 1)
                // Position 1 -> index 0 -> pas de décalage
                // Position 2 -> index 1 -> 1 * durationMs de décalage
                const newStartTime = new Date(initialStartTime.getTime() + (item.orderIndex - 1) * durationMs);
                const newEndTime = new Date(newStartTime.getTime() + durationMs);
                // Mettre à jour
                defense.orderIndex = item.orderIndex;
                defense.startTime = newStartTime;
                defense.endTime = newEndTime;
                await repo.save(defense);
            }
            await qr.commitTransaction();
            // Recharger et renvoyer la liste triée
            const updated = await this.ds.getRepository(Entities_1.Defense).find({
                where: { project: { id: projectId } },
                relations: ["group", "group.members"],
                order: { orderIndex: "ASC" },
            });
            return updated;
        }
        catch (err) {
            await qr.rollbackTransaction();
            throw err;
        }
        finally {
            await qr.release();
        }
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
