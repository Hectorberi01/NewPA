import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Deliverable, DeliverableSubmission, DeliverableRule, Group, Project } from '../entities/Entities';
import { FileValidationService } from '../utils/file-validation.service';
import { EmailService } from '../utils/email.service';
import path from "path";
import fs from "fs/promises";
import { AggregatorService } from './anticheat/aggregator/aggregator.service';
import { AntiCheatService } from './anticheat/anticheat.service';
import { downloadFromS3 } from '../utils/downloadFromS3';
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
  async validateDeliverableBeforeSubmit(
    deliverableId: number,
    groupId: number,
    file?: Express.Multer.File,
    gitUrl?: string
  ): Promise<any> {
    const deliverable = await this.deliverableRepository.findOne({
      where: { id: deliverableId },
      relations: ['validationRules']
    });

    if (!deliverable) throw new Error('Deliverable not found');

    const validationResults = {
      allPassed: true,
      rules: [] as any[]
    };

    if (deliverable.type === 'archive' && file) {
      for (const rule of deliverable.validationRules) {
        let passed = true;
        let message = rule.errorMessage || 'Règle non respectée';

        switch (rule.type) {
          case 'max_size': {
            let maxSizeMB: number;

            try {
              const config = JSON.parse(rule.configuration);
              maxSizeMB = parseFloat(config.maxSizeMB || config);
            } catch {
              const match = rule.configuration.match(/(\d+(?:\.\d+)?)/);
              maxSizeMB = match ? parseFloat(match[1]) : NaN;
            }

            if (isNaN(maxSizeMB)) {
              passed = false;
              message = 'Configuration invalide pour la taille maximale';
            } else if (file.size > maxSizeMB * 1024 * 1024) {
              passed = false;
              message = rule.errorMessage || `Fichier trop volumineux. Maximum: ${maxSizeMB}MB`;
            } else {
              message = `Taille du fichier valide (${(file.size / (1024 * 1024)).toFixed(2)}MB / ${maxSizeMB}MB)`;
            }
            break;
          }


          case 'file_presence': {
            if (!file) {
              passed = false;
              message = 'Aucun fichier fourni';
            } else {
              try {
                console.log('Validating file presence with configuration:', rule.configuration);

                const config = rule.configuration ? JSON.parse(rule.configuration) : {};

                const result = await FileValidationService.validateFilePresence(
                  file.path,
                  config.requiredFiles || []
                );
                passed = result.valid;
                message = passed
                  ? 'Tous les fichiers requis sont présents'
                  : rule.errorMessage || result.error || 'Fichiers manquants';
              } catch (error) {
                passed = false;
                message = 'Erreur lors de la validation des fichiers';
              }
            }
            break;
          }

          case 'folder_structure': {
            if (!file) {
              passed = false;
              message = 'Aucun fichier fourni';
            } else {
              try {
                const config = JSON.parse(rule.configuration);
                const result = await FileValidationService.validateFolderStructure(
                  file.path,
                  config.expectedStructure || []
                );
                passed = result.valid;
                message = passed
                  ? 'Structure de dossiers valide'
                  : rule.errorMessage || result.error || 'Structure invalide';
              } catch (error) {
                passed = false;
                message = 'Erreur lors de la validation de la structure';
              }
            }
            break;
          }

          case 'file_content': {
            if (!file) {
              passed = false;
              message = 'Aucun fichier fourni';
            } else {
              try {
                const config = JSON.parse(rule.configuration);
                const result = await FileValidationService.validateFileContent(
                  file.path,
                  config.fileName,
                  config.contentRegex
                );
                passed = result.valid;
                message = passed
                  ? 'Contenu du fichier valide'
                  : rule.errorMessage || result.error || 'Contenu invalide';
              } catch (error) {
                passed = false;
                message = 'Erreur lors de la validation du contenu';
              }
            }
            break;
          }

          default:
            passed = true;
            message = 'Règle non reconnue (ignorée)';
            break;
        }

        validationResults.rules.push({
          type: rule.type,
          passed,
          message
        });

        if (!passed) validationResults.allPassed = false;
      }
    }

    // Validation pour les liens Git
    if (deliverable.type === 'git_link' && gitUrl) {
      const gitUrlRegex = /^(https?:\/\/)?(www\.)?github\.com\/[a-zA-Z0-9-]+\/[a-zA-Z0-9-_.]+$/;
      if (!gitUrlRegex.test(gitUrl)) {
        validationResults.rules.push({
          type: 'git_url',
          passed: false,
          message: 'URL Git invalide'
        });
        validationResults.allPassed = false;
      } else {
        validationResults.rules.push({
          type: 'git_url',
          passed: true,
          message: 'URL Git valide'
        });
      }
    }

    return validationResults;
  }
  async getDeliverablesByProject(projectId: number): Promise<Deliverable[]> {
    return await this.deliverableRepository.find({
      where: { project: { id: projectId } },
      relations: ['validationRules', 'submissions'],
      order: { deadline: 'ASC' }
    });
  }
  async analyzeSimilarity(deliverableId: number): Promise<any> {
    try {
      const submissions = await this.submissionRepository.find({
        where: { deliverable: { id: deliverableId } },
        relations: ['group']
      });

      console.log(`[analyzeSimilarity] Found ${submissions.length} submissions`);

      if (!submissions.length) {
        return {
          matches: [],
          aggregates: [],
          message: 'Aucune soumission trouvée'
        };
      }

      const anti = new AntiCheatService(AppDataSource);
      const processResults = [];

      for (const s of submissions) {
        if (s.filePath) {
          try {
            console.log(`[analyzeSimilarity] Downloading ${s.filePath}`);
            const localPath = await downloadFromS3(s.filePath);

            const result = await anti.onSubmissionImported(s.id, localPath);

            // supprimer le fichier temporaire après analyse
            //fs.unlink(localPath, () => { });

            processResults.push({ submissionId: s.id, success: true, result });
          } catch (error: any) {
            console.error(`[analyzeSimilarity] Error processing submission ${s.id}:`, error.message);
            processResults.push({
              submissionId: s.id,
              success: false,
              error: error.message
            });
          }
        }
        // if (s.filePath) {
        //   try {
        //     console.log(`[analyzeSimilarity] Processing submission ${s.id}: ${s.filePath}`);
        //     const result = await anti.onSubmissionImported(s.id, s.filePath);
        //     processResults.push({ submissionId: s.id, success: true, result });
        //   } catch (error: any) {
        //     console.error(`[analyzeSimilarity] Error processing submission ${s.id}:`, error.message);
        //     processResults.push({ 
        //       submissionId: s.id, 
        //       success: false, 
        //       error: error.message 
        //     });
        //   }
        // } else {
        //   console.warn(`[analyzeSimilarity] Submission ${s.id} has no file`);
        // }
      }

      const agg = new AggregatorService(AppDataSource);
      const topPerSubmission = await Promise.all(
        submissions.map(async (s) => {
          try {
            return await agg.findTopMatches(s.id, 10);
          } catch (error) {
            console.error(`[analyzeSimilarity] Error finding matches for ${s.id}:`, error);
            return [];
          }
        })
      );

      const withAggregates = await this.submissionRepository.find({
        where: { deliverable: { id: deliverableId } },
        select: ['id', 'textScore', 'astScore', 'similarityScore']
      });

      return {
        matches: topPerSubmission.flat(),
        aggregates: withAggregates,
        processResults, // Pour déboguer
        summary: {
          totalSubmissions: submissions.length,
          processed: processResults.filter(r => r.success).length,
          failed: processResults.filter(r => !r.success).length
        }
      };

    } catch (error: any) {
      console.error('[analyzeSimilarity] Global error:', error);
      throw new Error(`Analyse de similarité échouée: ${error.message}`);
    }
  }
  async getGroupSubmission(deliverableId: number, groupId: number): Promise<DeliverableSubmission | null> {
    if (isNaN(deliverableId) || isNaN(groupId) || deliverableId <= 0 || groupId <= 0) {
      throw new Error('Invalid deliverable or group ID');
    }

    try {
      const submission = await this.submissionRepository.findOne({
        where: {
          deliverable: { id: deliverableId },
          group: { id: groupId }
        },
        relations: [
          'group',
          'group.members',
          'deliverable',
          'deliverable.validationRules'
        ],
        order: {
          submittedAt: 'DESC' // Prendre la dernière soumission
        }
      });

      return submission;
    } catch (error) {
      console.error('Error fetching group submission:', error);
      throw new Error('Failed to fetch submission');
    }
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

  // async downloadSubmission(submissionId: number): Promise<{ filePath: string, filename: string }> {
  //   const submission = await this.submissionRepository.findOne({
  //     where: { id: submissionId },
  //     relations: ['deliverable', 'group', 'group.members'],
  //   });

  //   if (!submission) throw new Error('Submission not found');
  //   if (!submission.filePath) throw new Error('No file associated with this submission');

  //   const UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
  //   const filenameOnDisk = path.basename(submission.filePath);
  //   const fullPath = path.join(UPLOAD_DIR, filenameOnDisk);

  //   // Vérifie que le fichier est bien dans le dossier uploads
  //   const resolved = path.resolve(fullPath);
  //   if (!resolved.startsWith(UPLOAD_DIR)) {
  //     throw new Error("Invalid file path");
  //   }

  //   // Vérifier existence
  //   try {
  //     const st = await fs.stat(resolved);
  //     if (!st.isFile()) throw new Error("File not found");
  //   } catch (err) {
  //     throw new Error("File not found");
  //   }

  //   // Nom de téléchargement : si tu stockes originalName dans la DB, utilise-le, sinon basename
  //   const downloadName = filenameOnDisk;

  //   return { filePath: resolved, filename: downloadName };
  // }


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

  async downloadSubmission(submissionId: number) {
    const submission = await this.submissionRepository.findOne({
      where: { id: submissionId },
    });
    if (!submission || !submission.filePath)
      throw new Error("No file associated with this submission");

    const fileUrl = submission.filePath;
    const bucketName = process.env.AWS_S3_BUCKET!;

    // ✅ Corrigé : retire le "/" initial si présent
    const pathname = new URL(fileUrl).pathname;
    const key = decodeURIComponent(pathname.replace(/^\/+/, "").replace(`${bucketName}/`, ""));

    console.log("✅ S3 key used:", key);
    return { bucketName, key };
  }

}