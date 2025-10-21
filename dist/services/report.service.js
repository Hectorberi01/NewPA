"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
class ReportService {
    constructor() {
        this.reportRepository = data_source_1.AppDataSource.getRepository(Entities_1.Report);
        this.sectionRepository = data_source_1.AppDataSource.getRepository(Entities_1.ReportSection);
    }
    async createReport(projectId, groupId, title, description) {
        const report = this.reportRepository.create({
            title,
            project: { id: projectId },
            group: { id: groupId },
            description: description
        });
        return await this.reportRepository.save(report);
    }
    async updateReportSection(reportId, sectionTitle, content, orderIndex) {
        let section = await this.sectionRepository.findOne({
            where: { report: { id: reportId }, title: sectionTitle }
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
                report: { id: reportId }
            });
        }
        return await this.sectionRepository.save(section);
    }
    async getReportsByProject(projectId) {
        // return await this.reportRepository.find({
        //   where: { project: { id: projectId } },
        //   relations: ['group', 'group.members', 'sections']
        // To order by sections.orderIndex, use query builder instead:
        return await this.reportRepository.createQueryBuilder('report')
            .leftJoinAndSelect('report.group', 'group')
            .leftJoinAndSelect('group.members', 'members')
            .leftJoinAndSelect('report.sections', 'sections')
            .where('report.projectId = :projectId', { projectId })
            .orderBy('sections.orderIndex', 'ASC')
            .getMany();
        //});
    }
    async getReportByGroup(projectId, groupId) {
        return await this.reportRepository.findOne({
            where: { project: { id: projectId }, group: { id: groupId } },
            relations: ['sections'],
            //order: { 'sections.orderIndex': 'ASC' }
        });
    }
}
exports.ReportService = ReportService;
