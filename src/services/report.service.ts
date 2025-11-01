import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Report, ReportSection, ReportConfig, ReportSectionConfig } from '../entities/Entities';

export class ReportService {
  private reportRepository: Repository<Report>;
  private sectionRepository: Repository<ReportSection>;
  private configRepository: Repository<ReportConfig>;
  private sectionConfigRepository: Repository<ReportSectionConfig>;

  constructor() {
    this.reportRepository = AppDataSource.getRepository(Report);
    this.sectionRepository = AppDataSource.getRepository(ReportSection);
    this.configRepository = AppDataSource.getRepository(ReportConfig);
    this.sectionConfigRepository = AppDataSource.getRepository(ReportSectionConfig);
  }

  // ========================================
  // CONFIGURATION (Enseignant)
  // ========================================

 async saveReportConfig(projectId: number, configData: any): Promise<ReportConfig> {
  // 1️⃣ Chercher la config existante
  let config = await this.configRepository.findOne({
    where: { projectId },
    relations: ['sections']
  });

  if (config) {
    // Mettre à jour la config principale
    config.isEnabled = configData.isEnabled;
    config.format = configData.format || 'markdown';
    config.instructions = configData.instructions;
    config.deadline = configData.deadline;
  } else {
    // Créer une nouvelle config
    config = this.configRepository.create({
      projectId,
      isEnabled: configData.isEnabled,
      format: configData.format || 'markdown',
      instructions: configData.instructions,
      deadline: configData.deadline
    });
  }

  // Sauvegarder la config pour avoir un ID
  await this.configRepository.save(config);

  // 2️⃣ Gérer les sections
  const existingSections = config.sections || [];
  const incomingSections = Array.isArray(configData.sections) ? configData.sections : [];

  // Créer ou mettre à jour chaque section
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
    } else {
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

  // 3️⃣ Supprimer les sections qui ont été retirées côté frontend
  const incomingIds = incomingSections.filter(s => s.id).map(s => s.id);
  const toDelete = existingSections
    .filter(s => !incomingIds.includes(s.id))
    .map(s => s.id);

  if (toDelete.length > 0) {
    await this.sectionConfigRepository.delete(toDelete);
  }

  // 4️⃣ Recharger la config avec sections
  const updatedConfig = await this.configRepository.findOne({
    where: { id: config.id },
    relations: ['sections']
  });

  return updatedConfig as ReportConfig;
}


  async getReportConfig(projectId: number): Promise<ReportConfig | null> {
    return await this.configRepository.findOne({
      where: { projectId },
      relations: ['sections']
    });
  }

  // ========================================
  // RÉDACTION ÉTUDIANTS
  // ========================================

  async getGroupReport(projectId: number, groupId: number): Promise<Report> {
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
      }) as Report;
    }

    return report;
  }

  async updateSectionContent(
    sectionConfigId: number, 
    groupId: number, 
    content: string
  ): Promise<ReportSection> {
    // Trouver le rapport du groupe (peu importe le projet)
    const report = await this.reportRepository.findOne({
      where: { groupId },
      relations: ['sections']
    });

    if (!report) throw new Error('Rapport non trouvé');
    if (report.status === 'submitted') throw new Error('Rapport déjà soumis');

    // Trouver ou créer la section
    let section = await this.sectionRepository.findOne({
      where: { 
        reportId: report.id,
        sectionConfigId
      }
    });

    if (section) {
      section.content = content;
    } else {
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

  async submitReport(projectId: number, groupId: number): Promise<Report> {
    const report = await this.getGroupReport(projectId, groupId);

    if (report.status === 'submitted') {
      throw new Error('Rapport déjà soumis');
    }

    report.status = 'submitted';
    report.submittedAt = new Date();

    return await this.reportRepository.save(report);
  }

  // ========================================
  // VISUALISATION (Enseignant)
  // ========================================

  async getReportsByProject(projectId: number): Promise<Report[]> {
    return await this.reportRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.group', 'group')
      .leftJoinAndSelect('group.members', 'members')
      .leftJoinAndSelect('report.sections', 'sections')
      .where('report.projectId = :projectId', { projectId })
      .orderBy('sections.orderIndex', 'ASC')
      .getMany();
  }

  async getReportById(reportId: number): Promise<Report | null> {
    return await this.reportRepository.findOne({
      where: { id: reportId },
      relations: ['sections', 'group', 'group.members'],
      order: { sections: { orderIndex: 'ASC' } }
    });
  }

  async getReportByGroup(projectId: number, groupId: number): Promise<Report | null> {
    return await this.reportRepository.findOne({
      where: { projectId, groupId },
      relations: ['sections'],
      order: { sections: { orderIndex: 'ASC' } }
    });
  }

  // ========================================
  // ANCIEN SYSTÈME (À conserver pour compatibilité)
  // ========================================

  async createReport(projectId: number, groupId: number, title: string, description: string): Promise<Report> {
    const report = this.reportRepository.create({
      title,
      projectId,
      groupId,
      description
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
      where: { reportId, title: sectionTitle }
    });

    if (section) {
      section.content = content;
      section.orderIndex = orderIndex;
    } else {
      section = this.sectionRepository.create({
        title: sectionTitle,
        content,
        orderIndex,
        reportId
      });
    }

    return await this.sectionRepository.save(section);
  }

  async deleteReport(reportId: number): Promise<void> {
    await this.reportRepository.delete(reportId);
  }

  async deleteReportSection(sectionId: number): Promise<void> {
    await this.sectionRepository.delete(sectionId);
  }

  


// Supprimer tous les rapports d'un projet


// Supprimer une section de configuration
async deleteSectionConfig(sectionConfigId: number): Promise<void> {
  const section = await this.sectionConfigRepository.findOne({
    where: { id: sectionConfigId }
  });

  if (!section) {
    throw new Error('Section de configuration non trouvée');
  }

  // Supprimer toutes les sections de rapports qui utilisent cette config
  await this.sectionRepository.delete({ sectionConfigId });

  // Supprimer la section de configuration
  await this.sectionConfigRepository.delete(sectionConfigId);
}

// Supprimer la configuration complète d'un projet
async deleteReportConfig(projectId: number): Promise<void> {
  const config = await this.configRepository.findOne({
    where: { projectId },
    relations: ['sections']
  });

  if (!config) {
    throw new Error('Configuration non trouvée');
  }

  // Supprimer toutes les sections de configuration
  if (config.sections && config.sections.length > 0) {
    const sectionIds = config.sections.map(s => s.id);
    
    // Supprimer les sections de rapports associées
    for (const sectionId of sectionIds) {
      await this.sectionRepository.delete({ sectionConfigId: sectionId });
    }
    
    // Supprimer les sections de config
    await this.sectionConfigRepository.delete(sectionIds);
  }

  // Supprimer la configuration
  await this.configRepository.delete(config.id);
}

// Supprimer tous les rapports d'un projet
async deleteReportsByProject(projectId: number): Promise<void> {
  const reports = await this.reportRepository.find({
    where: { projectId },
    relations: ['sections']
  });

  for (const report of reports) {
    // Supprimer les sections du rapport
    if (report.sections && report.sections.length > 0) {
      const sectionIds = report.sections.map(s => s.id);
      await this.sectionRepository.delete(sectionIds);
    }
    
    // Supprimer le rapport
    await this.reportRepository.delete(report.id);
  }
}
}