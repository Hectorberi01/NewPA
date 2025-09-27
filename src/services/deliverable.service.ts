import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Deliverable, DeliverableSubmission, DeliverableRule, Group, Project } from '../entities/Entities';
import { FileValidationService } from '../utils/file-validation.service';
import { SimilarityService } from '../utils/similarity.service';
import { EmailService } from '../utils/email.service';
import path from "path";
import fs from "fs/promises";
interface createDeliverableDTO {
  name: string;
  description?: string;
  deadline: Date;
  allowLateSubmission: boolean;
  penaltyPerHour: number;
  projectId: number;
}
export class DeliverableService {
  private deliverableRepository: Repository<Deliverable>;
  private submissionRepository: Repository<DeliverableSubmission>;
  private projectRepository: Repository<Project>;
  private ruleRepository: Repository<DeliverableRule>;
  private groupRepository: Repository<Group>;
  private emailService: EmailService;

  constructor() {
    this.deliverableRepository = AppDataSource.getRepository(Deliverable);
    this.submissionRepository = AppDataSource.getRepository(DeliverableSubmission);
    this.ruleRepository = AppDataSource.getRepository(DeliverableRule);
    this.groupRepository = AppDataSource.getRepository(Group);
    this.projectRepository = AppDataSource.getRepository(Project);
    this.emailService = new EmailService();
  }

  async createDeliverable(deliverableData: createDeliverableDTO): Promise<Deliverable> {
    if (!deliverableData.name || !deliverableData.deadline || deliverableData.allowLateSubmission === undefined || deliverableData.penaltyPerHour === undefined || !deliverableData.projectId) {
      throw new Error('Missing required fields');
    }
    // vrérifier si le projet existe
    const project = await this.projectRepository.findOne({ where: { id: deliverableData.projectId } });
    if (!project) throw new Error('Project not found');

    const deliverable = this.deliverableRepository.create(deliverableData);
    deliverable.project = project;
    return await this.deliverableRepository.save(deliverable);
  }

  async updateDeliverable(id: number, deliverableData: Partial<Deliverable>): Promise<Deliverable> {
    const deliverable = await this.deliverableRepository.findOne({ where: { id } });
    if (!deliverable) throw new Error('Deliverable not found');

    Object.assign(deliverable, deliverableData);
    return await this.deliverableRepository.save(deliverable);
  }

  async addValidationRule(
    deliverableId: number,
    ruleData: Partial<DeliverableRule>
  ): Promise<DeliverableRule> {
    const deliverable = await this.deliverableRepository.findOne({ where: { id: deliverableId } });
    if (!deliverable) throw new Error('Deliverable not found');

    const rule = this.ruleRepository.create({
      ...ruleData,
      deliverable
    });

    return await this.ruleRepository.save(rule);
  }

  async submitDeliverable(
    deliverableId: number,
    groupId: number,
    submissionData: Partial<DeliverableSubmission>
  ): Promise<DeliverableSubmission> {
    const deliverable = await this.deliverableRepository.findOne({
      where: { id: deliverableId },
      relations: ['validationRules']
    });

    if (!deliverable) throw new Error('Deliverable not found');

    const group = await this.groupRepository.findOne({ where: { id: groupId } });
    if (!group) throw new Error('Group not found');

    // Vérifier si une soumission existe déjà
    const existingSubmission = await this.submissionRepository.findOne({
      where: { deliverable: { id: deliverableId }, group: { id: groupId } }
    });

    const now = new Date();
    const isLate = now > deliverable.deadline;

    // Calculer la pénalité
    let penalty = 0;
    if (isLate) {
      if (!deliverable.allowLateSubmission) {
        throw new Error('Late submission not allowed for this deliverable');
      }
      const hoursLate = Math.ceil((now.getTime() - deliverable.deadline.getTime()) / (1000 * 60 * 60));
      penalty = hoursLate * deliverable.penaltyPerHour;
    }

    // Valider le fichier soumis
    const validationResults = await this.validateSubmission(deliverable, submissionData);

    const submissionToSave = existingSubmission || this.submissionRepository.create();
    Object.assign(submissionToSave, {
      ...submissionData,
      deliverable,
      group,
      submittedAt: now,
      isLate,
      penalty,
      validationResults
    });

    return await this.submissionRepository.save(submissionToSave);
  }

  async getDeliverableSubmissions(deliverableId: number): Promise<DeliverableSubmission[]> {
    return await this.submissionRepository.find({
      where: { deliverable: { id: deliverableId } },
      relations: ['group', 'group.members'],
      order: { submittedAt: 'ASC' }
    });
  }

  async getDeliverablesByProject(projectId: number): Promise<Deliverable[]> {
    return await this.deliverableRepository.find({
      where: { project: { id: projectId } },
      relations: ['validationRules', 'submissions'],
      order: { deadline: 'ASC' }
    });
  }

  async analyzeSimilarity(deliverableId: number): Promise<any[]> {
    const submissions = await this.submissionRepository.find({
      where: { deliverable: { id: deliverableId } },
      relations: ['group']
    });

    console.log('submissions:', submissions);

    const similarityResults = await SimilarityService.analyzeSubmissionSimilarity(submissions);
    console.log('Similarity results:', similarityResults);
    // Sauvegarder les résultats de similarité
    for (const result of similarityResults) {
      const submission1 = submissions.find(s => s.group.id === result.groupId1);
      const submission2 = submissions.find(s => s.group.id === result.groupId2);

      if (submission1) {
        submission1.similarityScore = Math.max(submission1.similarityScore || 0, result.similarity);
        await this.submissionRepository.save(submission1);
      }

      if (submission2) {
        submission2.similarityScore = Math.max(submission2.similarityScore || 0, result.similarity);
        await this.submissionRepository.save(submission2);
      }
    }

    return similarityResults;
  }

  async getSubmissionSummary(deliverableId: number): Promise<any> {
    const deliverable = await this.deliverableRepository.findOne({
      where: { id: deliverableId },
      relations: ['project', 'project.groups', 'submissions', 'submissions.group']
    });

    if (!deliverable) throw new Error('Deliverable not found');

    const totalGroups = deliverable.project.groups.length;
    const submittedGroups = deliverable.submissions.length;
    const onTimeSubmissions = deliverable.submissions.filter(s => !s.isLate).length;
    const lateSubmissions = deliverable.submissions.filter(s => s.isLate).length;

    return {
      totalGroups,
      submittedGroups,
      pendingGroups: totalGroups - submittedGroups,
      onTimeSubmissions,
      lateSubmissions,
      submissionRate: totalGroups > 0 ? (submittedGroups / totalGroups) * 100 : 0,
      submissions: deliverable.submissions
    };
  }

  async sendDeadlineReminders(deliverableId: number, daysBefore: number = 2): Promise<void> {
    const deliverable = await this.deliverableRepository.findOne({
      where: { id: deliverableId },
      relations: ['project', 'project.groups', 'project.groups.members', 'submissions']
    });

    if (!deliverable) throw new Error('Deliverable not found');

    const deadline = new Date(deliverable.deadline);
    const reminderDate = new Date();
    reminderDate.setDate(reminderDate.getDate() + daysBefore);

    // Ne envoyer des rappels que si on est dans la période de rappel
    if (reminderDate < deadline) return;

    // Groupes qui n'ont pas encore soumis
    const submittedGroupIds = new Set(deliverable.submissions.map(s => s.group.id));
    const pendingGroups = deliverable.project.groups.filter(
      group => !submittedGroupIds.has(group.id)
    );

    const emailPromises: Promise<any>[] = [];

    for (const group of pendingGroups) {
      for (const member of group.members) {
        emailPromises.push(
          this.emailService.sendDeliverableReminderEmail(
            member.email,
            deliverable.name,
            deadline
          )
        );
      }
    }

    await Promise.allSettled(emailPromises);
  }

  async downloadSubmission(submissionId: number): Promise<{ filePath: string, filename: string }> {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
      relations: ['deliverable', 'group', 'group.members'],
    });

    if (!submission) throw new Error('Submission not found');
    if (!submission.filePath) throw new Error('No file associated with this submission');

    const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
    const filenameOnDisk = path.basename(submission.filePath);
    const fullPath = path.join(UPLOAD_DIR, filenameOnDisk);

    // Vérifie que le fichier est bien dans le dossier uploads
    const resolved = path.resolve(fullPath);
    if (!resolved.startsWith(UPLOAD_DIR)) {
      throw new Error("Invalid file path");
    }

    // Vérifier existence
    try {
      const st = await fs.stat(resolved);
      if (!st.isFile()) throw new Error("File not found");
    } catch (err) {
      throw new Error("File not found");
    }

    // Nom de téléchargement : si tu stockes originalName dans la DB, utilise-le, sinon basename
    const downloadName = filenameOnDisk;

    return { filePath: resolved, filename: downloadName };
  }
  

  private async validateSubmission(
    deliverable: Deliverable,
    submissionData: Partial<DeliverableSubmission>
  ): Promise<any> {
    const results: any = {};

    if (!deliverable.validationRules || deliverable.validationRules.length === 0) {
      return results;
    }

    for (const rule of deliverable.validationRules) {
      try {
        const config = JSON.parse(rule.configuration);
        let validationResult;

        switch (rule.type) {
          case 'max_size':
            if (submissionData.filePath) {
              validationResult = await FileValidationService.validateArchiveSize(
                submissionData.filePath,
                config.maxSizeMB
              );
            }
            break;

          case 'file_presence':
            if (submissionData.filePath) {
              validationResult = await FileValidationService.validateFilePresence(
                submissionData.filePath,
                config.requiredFiles
              );
            }
            break;

          case 'folder_structure':
            if (submissionData.filePath) {
              validationResult = await FileValidationService.validateFolderStructure(
                submissionData.filePath,
                config.expectedStructure
              );
            }
            break;

          case 'file_content':
            if (submissionData.filePath) {
              validationResult = await FileValidationService.validateFileContent(
                submissionData.filePath,
                config.fileName,
                config.contentRegex
              );
            }
            break;
        }

        results[rule.type] = validationResult;
      } catch (error) {
        results[rule.type] = {
          valid: false,
          error: `Validation error: ${error}`
        };
      }
    }

    return results;
  }
}