import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Report,ReportSection } from '../entities/Entities';

export class ReportService {
  private reportRepository: Repository<Report>;
  private sectionRepository: Repository<ReportSection>;

  constructor() {
    this.reportRepository = AppDataSource.getRepository(Report);
    this.sectionRepository = AppDataSource.getRepository(ReportSection);
  }

  async createReport(projectId: number, groupId: number, title: string): Promise<Report> {
    const report = this.reportRepository.create({
      title,
      project: { id: projectId },
      group: { id: groupId }
    });

    return await this.reportRepository.save(report);
  }

  async updateReportSection(
    reportId: number, 
    sectionTitle: string, 
    content: string, 
    orderIndex: number
  ): Promise<ReportSection> {
    let section = await this.sectionRepository.findOne({
      where: { report: { id: reportId }, title: sectionTitle }
    });

    if (section) {
      section.content = content;
      section.orderIndex = orderIndex;
    } else {
      section = this.sectionRepository.create({
        title: sectionTitle,
        content,
        orderIndex,
        report: { id: reportId }
      });
    }

    return await this.sectionRepository.save(section);
  }

  async getReportsByProject(projectId: number): Promise<Report[]> {
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

  async getReportByGroup(projectId: number, groupId: number): Promise<Report | null> {
    return await this.reportRepository.findOne({
      where: { project: { id: projectId }, group: { id: groupId } },
      relations: ['sections'],
      //order: { 'sections.orderIndex': 'ASC' }
    });
  }
}