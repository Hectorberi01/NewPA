"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
class ReportService {
    constructor() {
        this.reportRepository = data_source_1.AppDataSource.getRepository(Entities_1.Report);
        this.sectionRepository = data_source_1.AppDataSource.getRepository(Entities_1.ReportSection);
        this.configRepository = data_source_1.AppDataSource.getRepository(Entities_1.ReportConfig);
        this.sectionConfigRepository = data_source_1.AppDataSource.getRepository(Entities_1.ReportSectionConfig);
    }
    async saveReportConfig(projectId, configData) {
        let config = await this.configRepository.findOne({
            where: { projectId },
            relations: ['sections']
        });
        if (config) {
            config.isEnabled = configData.isEnabled;
            config.format = configData.format || 'markdown';
            config.instructions = configData.instructions;
            config.deadline = configData.deadline;
        }
        else {
            config = this.configRepository.create({
                projectId,
                isEnabled: configData.isEnabled,
                format: configData.format || 'markdown',
                instructions: configData.instructions,
                deadline: configData.deadline
            });
        }
        await this.configRepository.save(config);
        const existingSections = config.sections || [];
        const incomingSections = Array.isArray(configData.sections) ? configData.sections : [];
        for (const sectionData of incomingSections) {
            if (sectionData.id) {
                // Mettre à jour une section existante
                await this.sectionConfigRepository.update(sectionData.id, {
                    title: sectionData.title,
                    description: sectionData.description,
                    required: sectionData.required !== false,
                    wordLimit: sectionData.wordLimit,
                    order: sectionData.order || 0
                });
            }
            else {
                // Créer une nouvelle section
                const section = this.sectionConfigRepository.create({
                    configId: config.id,
                    title: sectionData.title,
                    description: sectionData.description,
                    required: sectionData.required !== false,
                    wordLimit: sectionData.wordLimit,
                    order: sectionData.order || 0
                });
                await this.sectionConfigRepository.save(section);
            }
        }
        const incomingIds = incomingSections.filter(s => s.id).map(s => s.id);
        const toDelete = existingSections
            .filter(s => !incomingIds.includes(s.id))
            .map(s => s.id);
        if (toDelete.length > 0) {
            await this.sectionConfigRepository.delete(toDelete);
        }
        const updatedConfig = await this.configRepository.findOne({
            where: { id: config.id },
            relations: ['sections']
        });
        return updatedConfig;
    }
    async getReportConfig(projectId) {
        return await this.configRepository.findOne({
            where: { projectId },
            relations: ['sections']
        });
    }
    async getGroupReport(projectId, groupId) {
        let report = await this.reportRepository.findOne({
            where: {
                projectId,
                groupId
            },
            relations: ['sections']
        });
        if (!report) {
            // Créer le rapport avec les sections vides
            const config = await this.getReportConfig(projectId);
            report = this.reportRepository.create({
                projectId,
                groupId,
                title: 'Rapport',
                status: 'draft'
            });
            await this.reportRepository.save(report);
            // Créer les sections vides selon la configuration
            if (config?.sections && config.sections.length > 0) {
                for (const sectionConfig of config.sections) {
                    const section = this.sectionRepository.create({
                        reportId: report.id,
                        sectionConfigId: sectionConfig.id,
                        title: sectionConfig.title,
                        content: '',
                        orderIndex: sectionConfig.order
                    });
                    await this.sectionRepository.save(section);
                }
            }
            // Recharger avec les sections
            report = await this.reportRepository.findOne({
                where: { id: report.id },
                relations: ['sections']
            });
        }
        return report;
    }
    async updateSectionContent(sectionConfigId, groupId, content) {
        // Trouver le rapport du groupe (peu importe le projet)
        const report = await this.reportRepository.findOne({
            where: { groupId },
            relations: ['sections']
        });
        if (!report)
            throw new Error('Rapport non trouvé');
        if (report.status === 'submitted')
            throw new Error('Rapport déjà soumis');
        // Trouver ou créer la section
        let section = await this.sectionRepository.findOne({
            where: {
                reportId: report.id,
                sectionConfigId
            }
        });
        if (section) {
            section.content = content;
        }
        else {
            // Récupérer la config de la section pour obtenir le titre
            const config = await this.sectionConfigRepository.findOne({
                where: { id: sectionConfigId }
            });
            section = this.sectionRepository.create({
                reportId: report.id,
                sectionConfigId,
                title: config?.title || 'Section',
                content,
                orderIndex: config?.order || 0
            });
        }
        return await this.sectionRepository.save(section);
    }
    async submitReport(projectId, groupId) {
        const report = await this.getGroupReport(projectId, groupId);
        if (report.status === 'submitted') {
            throw new Error('Rapport déjà soumis');
        }
        report.status = 'submitted';
        report.submittedAt = new Date();
        return await this.reportRepository.save(report);
    }
    async getReportsByProject(projectId) {
        console.log("Fetching reports for projectId:", projectId);
        return await this.reportRepository
            .createQueryBuilder('report')
            .leftJoinAndSelect('report.group', 'group')
            .leftJoinAndSelect('group.members', 'members')
            .leftJoinAndSelect('report.sections', 'sections')
            .where('report.projectId = :projectId', { projectId })
            .orderBy('sections.orderIndex', 'ASC')
            .getMany();
    }
    async getReportById(reportId) {
        return await this.reportRepository.findOne({
            where: { id: reportId },
            relations: ['sections', 'group', 'group.members'],
            order: { sections: { orderIndex: 'ASC' } }
        });
    }
    async getReportByGroup(projectId, groupId) {
        return await this.reportRepository.findOne({
            where: { projectId, groupId },
            relations: ['sections'],
            order: { sections: { orderIndex: 'ASC' } }
        });
    }
    async createReport(projectId, groupId, title, description) {
        const report = this.reportRepository.create({
            title,
            projectId,
            groupId,
            description
        });
        return await this.reportRepository.save(report);
    }
    async updateReportSection(reportId, sectionTitle, content, orderIndex) {
        let section = await this.sectionRepository.findOne({
            where: { reportId, title: sectionTitle }
        });
        if (section) {
            section.content = content;
            section.orderIndex = orderIndex;
        }
        else {
            section = this.sectionRepository.create({
                title: sectionTitle,
                content,
                orderIndex,
                reportId
            });
        }
        return await this.sectionRepository.save(section);
    }
    async deleteReport(reportId) {
        await this.reportRepository.delete(reportId);
    }
    async deleteReportSection(sectionId) {
        await this.sectionRepository.delete(sectionId);
    }
    async deleteSectionConfig(sectionConfigId) {
        const section = await this.sectionConfigRepository.findOne({
            where: { id: sectionConfigId }
        });
        if (!section) {
            throw new Error('Section de configuration non trouvée');
        }
        await this.sectionRepository.delete({ sectionConfigId });
        await this.sectionConfigRepository.delete(sectionConfigId);
    }
    async deleteReportConfig(projectId) {
        const config = await this.configRepository.findOne({
            where: { projectId },
            relations: ['sections']
        });
        if (!config) {
            throw new Error('Configuration non trouvée');
        }
        if (config.sections && config.sections.length > 0) {
            const sectionIds = config.sections.map(s => s.id);
            for (const sectionId of sectionIds) {
                await this.sectionRepository.delete({ sectionConfigId: sectionId });
            }
            await this.sectionConfigRepository.delete(sectionIds);
        }
        await this.configRepository.delete(config.id);
    }
    async deleteReportsByProject(projectId) {
        const reports = await this.reportRepository.find({
            where: { projectId },
            relations: ['sections']
        });
        for (const report of reports) {
            if (report.sections && report.sections.length > 0) {
                const sectionIds = report.sections.map(s => s.id);
                await this.sectionRepository.delete(sectionIds);
            }
            await this.reportRepository.delete(report.id);
        }
    }
}
exports.ReportService = ReportService;
