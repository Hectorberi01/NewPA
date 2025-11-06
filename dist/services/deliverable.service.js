"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeliverableService = void 0;
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
const file_validation_service_1 = require("../utils/file-validation.service");
const email_service_1 = require("../utils/email.service");
const path_1 = __importDefault(require("path"));
const promises_1 = __importDefault(require("fs/promises"));
const aggregator_service_1 = require("./anticheat/aggregator/aggregator.service");
const anticheat_service_1 = require("./anticheat/anticheat.service");
class DeliverableService {
    constructor() {
        this.deliverableRepository = data_source_1.AppDataSource.getRepository(Entities_1.Deliverable);
        this.submissionRepository = data_source_1.AppDataSource.getRepository(Entities_1.DeliverableSubmission);
        this.ruleRepository = data_source_1.AppDataSource.getRepository(Entities_1.DeliverableRule);
        this.groupRepository = data_source_1.AppDataSource.getRepository(Entities_1.Group);
        this.projectRepository = data_source_1.AppDataSource.getRepository(Entities_1.Project);
        this.emailService = new email_service_1.EmailService();
    }
    async createDeliverable(deliverableData) {
        if (!deliverableData.name || !deliverableData.deadline || deliverableData.allowLateSubmission === undefined || deliverableData.penaltyPerHour === undefined || !deliverableData.projectId) {
            throw new Error('Missing required fields');
        }
        // vrérifier si le projet existe
        const project = await this.projectRepository.findOne({ where: { id: deliverableData.projectId } });
        if (!project)
            throw new Error('Project not found');
        const deliverable = this.deliverableRepository.create(deliverableData);
        deliverable.project = project;
        return await this.deliverableRepository.save(deliverable);
    }
    async updateDeliverable(id, deliverableData) {
        const deliverable = await this.deliverableRepository.findOne({ where: { id } });
        if (!deliverable)
            throw new Error('Deliverable not found');
        Object.assign(deliverable, deliverableData);
        return await this.deliverableRepository.save(deliverable);
    }
    async addValidationRule(deliverableId, ruleData) {
        const deliverable = await this.deliverableRepository.findOne({ where: { id: deliverableId } });
        if (!deliverable)
            throw new Error('Deliverable not found');
        const rule = this.ruleRepository.create({
            ...ruleData,
            deliverable
        });
        return await this.ruleRepository.save(rule);
    }
    async submitDeliverable(deliverableId, groupId, submissionData) {
        const deliverable = await this.deliverableRepository.findOne({
            where: { id: deliverableId },
            relations: ['validationRules']
        });
        if (!deliverable)
            throw new Error('Deliverable not found');
        const group = await this.groupRepository.findOne({ where: { id: groupId } });
        if (!group)
            throw new Error('Group not found');
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
    async getDeliverableSubmissions(deliverableId) {
        return await this.submissionRepository.find({
            where: { deliverable: { id: deliverableId } },
            relations: ['group', 'group.members'],
            order: { submittedAt: 'ASC' }
        });
    }
    async validateDeliverableBeforeSubmit(deliverableId, groupId, file, gitUrl) {
        const deliverable = await this.deliverableRepository.findOne({
            where: { id: deliverableId },
            relations: ['validationRules']
        });
        if (!deliverable)
            throw new Error('Deliverable not found');
        const validationResults = {
            allPassed: true,
            rules: []
        };
        if (deliverable.type === 'archive' && file) {
            for (const rule of deliverable.validationRules) {
                let passed = true;
                let message = rule.errorMessage || 'Règle non respectée';
                switch (rule.type) {
                    case 'max_size': {
                        let maxSizeMB;
                        try {
                            const config = JSON.parse(rule.configuration);
                            maxSizeMB = parseFloat(config.maxSizeMB || config);
                        }
                        catch {
                            const match = rule.configuration.match(/(\d+(?:\.\d+)?)/);
                            maxSizeMB = match ? parseFloat(match[1]) : NaN;
                        }
                        if (isNaN(maxSizeMB)) {
                            passed = false;
                            message = 'Configuration invalide pour la taille maximale';
                        }
                        else if (file.size > maxSizeMB * 1024 * 1024) {
                            passed = false;
                            message = rule.errorMessage || `Fichier trop volumineux. Maximum: ${maxSizeMB}MB`;
                        }
                        else {
                            message = `Taille du fichier valide (${(file.size / (1024 * 1024)).toFixed(2)}MB / ${maxSizeMB}MB)`;
                        }
                        break;
                    }
                    case 'file_presence': {
                        if (!file) {
                            passed = false;
                            message = 'Aucun fichier fourni';
                        }
                        else {
                            try {
                                const config = JSON.parse(rule.configuration);
                                const result = await file_validation_service_1.FileValidationService.validateFilePresence(file.path, config.requiredFiles || []);
                                passed = result.valid;
                                message = passed
                                    ? 'Tous les fichiers requis sont présents'
                                    : rule.errorMessage || result.error || 'Fichiers manquants';
                            }
                            catch (error) {
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
                        }
                        else {
                            try {
                                const config = JSON.parse(rule.configuration);
                                const result = await file_validation_service_1.FileValidationService.validateFolderStructure(file.path, config.expectedStructure || []);
                                passed = result.valid;
                                message = passed
                                    ? 'Structure de dossiers valide'
                                    : rule.errorMessage || result.error || 'Structure invalide';
                            }
                            catch (error) {
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
                        }
                        else {
                            try {
                                const config = JSON.parse(rule.configuration);
                                const result = await file_validation_service_1.FileValidationService.validateFileContent(file.path, config.fileName, config.contentRegex);
                                passed = result.valid;
                                message = passed
                                    ? 'Contenu du fichier valide'
                                    : rule.errorMessage || result.error || 'Contenu invalide';
                            }
                            catch (error) {
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
                if (!passed)
                    validationResults.allPassed = false;
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
            }
            else {
                validationResults.rules.push({
                    type: 'git_url',
                    passed: true,
                    message: 'URL Git valide'
                });
            }
        }
        return validationResults;
    }
    async getDeliverablesByProject(projectId) {
        return await this.deliverableRepository.find({
            where: { project: { id: projectId } },
            relations: ['validationRules', 'submissions'],
            order: { deadline: 'ASC' }
        });
    }
    async analyzeSimilarity(deliverableId) {
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
            const anti = new anticheat_service_1.AntiCheatService(data_source_1.AppDataSource);
            const processResults = [];
            for (const s of submissions) {
                if (s.filePath) {
                    try {
                        console.log(`[analyzeSimilarity] Processing submission ${s.id}: ${s.filePath}`);
                        const result = await anti.onSubmissionImported(s.id, s.filePath);
                        processResults.push({ submissionId: s.id, success: true, result });
                    }
                    catch (error) {
                        console.error(`[analyzeSimilarity] Error processing submission ${s.id}:`, error.message);
                        processResults.push({
                            submissionId: s.id,
                            success: false,
                            error: error.message
                        });
                    }
                }
                else {
                    console.warn(`[analyzeSimilarity] Submission ${s.id} has no file`);
                }
            }
            const agg = new aggregator_service_1.AggregatorService(data_source_1.AppDataSource);
            const topPerSubmission = await Promise.all(submissions.map(async (s) => {
                try {
                    return await agg.findTopMatches(s.id, 10);
                }
                catch (error) {
                    console.error(`[analyzeSimilarity] Error finding matches for ${s.id}:`, error);
                    return [];
                }
            }));
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
        }
        catch (error) {
            console.error('[analyzeSimilarity] Global error:', error);
            throw new Error(`Analyse de similarité échouée: ${error.message}`);
        }
    }
    async getGroupSubmission(deliverableId, groupId) {
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
        }
        catch (error) {
            console.error('Error fetching group submission:', error);
            throw new Error('Failed to fetch submission');
        }
    }
    async getSubmissionSummary(deliverableId) {
        const deliverable = await this.deliverableRepository.findOne({
            where: { id: deliverableId },
            relations: ['project', 'project.groups', 'submissions', 'submissions.group']
        });
        if (!deliverable)
            throw new Error('Deliverable not found');
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
    async sendDeadlineReminders(deliverableId, daysBefore = 2) {
        const deliverable = await this.deliverableRepository.findOne({
            where: { id: deliverableId },
            relations: ['project', 'project.groups', 'project.groups.members', 'submissions']
        });
        if (!deliverable)
            throw new Error('Deliverable not found');
        const deadline = new Date(deliverable.deadline);
        const reminderDate = new Date();
        reminderDate.setDate(reminderDate.getDate() + daysBefore);
        // Ne envoyer des rappels que si on est dans la période de rappel
        if (reminderDate < deadline)
            return;
        // Groupes qui n'ont pas encore soumis
        const submittedGroupIds = new Set(deliverable.submissions.map(s => s.group.id));
        const pendingGroups = deliverable.project.groups.filter(group => !submittedGroupIds.has(group.id));
        const emailPromises = [];
        for (const group of pendingGroups) {
            for (const member of group.members) {
                emailPromises.push(this.emailService.sendDeliverableReminderEmail(member.email, deliverable.name, deadline));
            }
        }
        await Promise.allSettled(emailPromises);
    }
    async downloadSubmission(submissionId) {
        const submission = await this.submissionRepository.findOne({
            where: { id: submissionId },
            relations: ['deliverable', 'group', 'group.members'],
        });
        if (!submission)
            throw new Error('Submission not found');
        if (!submission.filePath)
            throw new Error('No file associated with this submission');
        const UPLOAD_DIR = path_1.default.resolve(process.cwd(), "uploads");
        const filenameOnDisk = path_1.default.basename(submission.filePath);
        const fullPath = path_1.default.join(UPLOAD_DIR, filenameOnDisk);
        // Vérifie que le fichier est bien dans le dossier uploads
        const resolved = path_1.default.resolve(fullPath);
        if (!resolved.startsWith(UPLOAD_DIR)) {
            throw new Error("Invalid file path");
        }
        // Vérifier existence
        try {
            const st = await promises_1.default.stat(resolved);
            if (!st.isFile())
                throw new Error("File not found");
        }
        catch (err) {
            throw new Error("File not found");
        }
        // Nom de téléchargement : si tu stockes originalName dans la DB, utilise-le, sinon basename
        const downloadName = filenameOnDisk;
        return { filePath: resolved, filename: downloadName };
    }
    async validateSubmission(deliverable, submissionData) {
        const results = {};
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
                            validationResult = await file_validation_service_1.FileValidationService.validateArchiveSize(submissionData.filePath, config.maxSizeMB);
                        }
                        break;
                    case 'file_presence':
                        if (submissionData.filePath) {
                            validationResult = await file_validation_service_1.FileValidationService.validateFilePresence(submissionData.filePath, config.requiredFiles);
                        }
                        break;
                    case 'folder_structure':
                        if (submissionData.filePath) {
                            validationResult = await file_validation_service_1.FileValidationService.validateFolderStructure(submissionData.filePath, config.expectedStructure);
                        }
                        break;
                    case 'file_content':
                        if (submissionData.filePath) {
                            validationResult = await file_validation_service_1.FileValidationService.validateFileContent(submissionData.filePath, config.fileName, config.contentRegex);
                        }
                        break;
                }
                results[rule.type] = validationResult;
            }
            catch (error) {
                results[rule.type] = {
                    valid: false,
                    error: `Validation error: ${error}`
                };
            }
        }
        return results;
    }
}
exports.DeliverableService = DeliverableService;
