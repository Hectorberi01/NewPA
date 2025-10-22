"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromotionService = void 0;
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
const csv_parser_1 = __importDefault(require("csv-parser"));
const XLSX = __importStar(require("xlsx"));
const fs_1 = require("fs");
const password_service_1 = require("../utils/password.service");
const email_service_1 = require("../utils/email.service");
const iconv_lite_1 = __importDefault(require("iconv-lite"));
const strip_bom_stream_1 = __importDefault(require("strip-bom-stream"));
class PromotionService {
    // private studentRepository: Repository<Student>; // Si vous avez une entité Student distincte   
    constructor() {
        this.promotionRepository = data_source_1.AppDataSource.getRepository(Entities_1.Promotion);
        this.userRepository = data_source_1.AppDataSource.getRepository(Entities_1.User);
    }
    async createPromotion(promotionData) {
        const promotion = this.promotionRepository.create(promotionData);
        return await this.promotionRepository.save(promotion);
    }
    async getPromotionsByTeacher(teacherId) {
        return await this.promotionRepository.find({
            where: { teacher: { id: teacherId } },
            relations: ['students', 'projects']
        });
    }
    async updatePromotion(promotionId, promotionData) {
        await this.promotionRepository.update(promotionId, promotionData);
        return await this.promotionRepository.findOne({ where: { id: promotionId } });
    }
    async addStudentsToPromotion(promotionId, studentsListe) {
        const promotion = await this.promotionRepository.findOne({
            where: { id: promotionId },
            relations: ['students']
        });
        if (!promotion)
            throw new Error('Promotion not found');
        console.log('Promotion trouvée:', promotion);
        const newStudents = [];
        console.log('Liste des étudiants à ajouter:', studentsListe);
        for (const data of studentsListe) {
            let student = await this.userRepository.findOne({ where: { email: data.email } });
            if (!student) {
                const tempPassword = password_service_1.PasswordService.generateTemporaryPassword();
                const hashedPassword = await password_service_1.PasswordService.hashPassword(tempPassword);
                student = this.userRepository.create({
                    email: data.email,
                    firstName: data.firstName,
                    lastName: data.lastName,
                    role: 'student',
                    password: hashedPassword,
                    isActive: true
                });
                student = await this.userRepository.save(student);
            }
            if (!promotion.students.some(s => s.id === student.id)) {
                newStudents.push(student);
            }
        }
        promotion.students = [...promotion.students, ...newStudents];
        return await this.promotionRepository.save(promotion);
    }
    async addStudentsUsingFile(promotionId, file) {
        const emailService = new email_service_1.EmailService();
        const errors = [];
        let totalProcessed = 0;
        let newStudentsCount = 0;
        let existingStudentsCount = 0;
        try {
            // 1. Vérifier que la promotion existe
            const promotion = await this.promotionRepository.findOne({
                where: { id: promotionId },
                relations: ['students']
            });
            console.log('Promotion trouvée:', promotion);
            if (!promotion) {
                throw new Error('Promotion not found');
            }
            // 2. Parser le fichier selon son type
            const studentsData = await this.parseFile(file);
            console.log(`Données extraites du fichier (${studentsData.length} entrées):`, studentsData);
            // 3. Valider les données
            const validStudents = this.validateStudentsData(studentsData, errors);
            if (validStudents.length === 0) {
                throw new Error('Aucun étudiant valide trouvé dans le fichier');
            }
            // 4. Traitement par batch pour optimiser les performances
            const batchSize = 50;
            const newStudents = [];
            // Récupérer tous les emails existants en une seule requête
            const existingEmails = await this.userRepository
                .createQueryBuilder('user')
                .select('user.email')
                .where('user.email IN (:...emails)', {
                emails: validStudents.map(s => s.email)
            })
                .getMany()
                .then(users => new Set(users.map(u => u.email)));
            // Traiter par lots
            for (let i = 0; i < validStudents.length; i += batchSize) {
                const batch = validStudents.slice(i, i + batchSize);
                for (const studentData of batch) {
                    try {
                        totalProcessed++;
                        if (existingEmails.has(studentData.email)) {
                            // Étudiant existant - vérifier s'il est déjà dans la promotion
                            const existingStudent = await this.userRepository.findOne({
                                where: { email: studentData.email }
                            });
                            if (existingStudent && !promotion.students.some(s => s.id === existingStudent.id)) {
                                newStudents.push(existingStudent);
                            }
                            existingStudentsCount++;
                        }
                        else {
                            // Nouvel étudiant - créer le compte
                            const tempPassword = password_service_1.PasswordService.generateTemporaryPassword();
                            const hashedPassword = await password_service_1.PasswordService.hashPassword(tempPassword);
                            const newStudent = this.userRepository.create({
                                email: studentData.email,
                                firstName: studentData.firstName,
                                lastName: studentData.lastName,
                                password: hashedPassword,
                                role: 'student',
                                isActive: true,
                                isTemporaryPassword: true
                            });
                            console.log('Création du nouvel étudiant:', newStudent);
                            const savedStudent = await this.userRepository.save(newStudent);
                            newStudents.push(savedStudent);
                            newStudentsCount++;
                            // Envoyer email de bienvenue de manière asynchrone
                            emailService.sendAccountCreationEmail(savedStudent.email, savedStudent.firstName, tempPassword)
                                .catch(emailError => {
                                console.error(`Erreur envoi email à ${savedStudent.email}:`, emailError);
                                errors.push(`Impossible d'envoyer l'email de bienvenue à ${savedStudent.email}`);
                            });
                        }
                    }
                    catch (studentError) {
                        errors.push(`Erreur traitement étudiant ${studentData.email}: ${studentError}`);
                    }
                }
            }
            // 5. Ajouter les nouveaux étudiants à la promotion
            if (newStudents.length > 0) {
                promotion.students = [...promotion.students, ...newStudents];
                await this.promotionRepository.save(promotion);
            }
            // 6. Nettoyer le fichier temporaire
            this.cleanupFile(file.path);
            return {
                promotion,
                summary: {
                    totalProcessed,
                    newStudents: newStudentsCount,
                    existingStudents: existingStudentsCount,
                    errors,
                }
            };
        }
        catch (error) {
            // Nettoyer en cas d'erreur
            this.cleanupFile(file.path);
            throw error;
        }
    }
    // Méthodes auxiliaires
    async parseFile(file) {
        const extension = file.originalname.split('.').pop()?.toLowerCase();
        switch (extension) {
            case 'csv':
                return this.parseCSV(file.path);
            case 'xlsx':
            case 'xls':
                return this.parseExcel(file.path);
            default:
                throw new Error(`Format de fichier non supporté: ${extension}`);
        }
    }
    async parseCSV(filePath) {
        return new Promise((resolve, reject) => {
            const results = [];
            const pick = (row, ...keys) => (keys.map(k => row[k]).find(v => typeof v === "string" && v.trim()) || "").trim();
            (0, fs_1.createReadStream)(filePath)
                .pipe(iconv_lite_1.default.decodeStream("win1252"))
                .pipe((0, strip_bom_stream_1.default)())
                .pipe((0, csv_parser_1.default)({
                separator: ";", // <- clé: ton CSV est "nom;prenom;email"
                mapHeaders: ({ header }) => header.replace(/^\uFEFF/, "").toLowerCase().trim(),
                skipLines: 0,
                strict: false,
            }))
                .on("data", (row) => {
                // console.log("Row:", row)
                const email = pick(row, "email", "e-mail", "mail");
                const firstName = pick(row, "prenom", "firstname", "first_name", "first name");
                const lastName = pick(row, "nom", "lastname", "last_name", "last name");
                if (email && (firstName || lastName)) {
                    results.push({ email, firstName, lastName });
                }
            })
                .on("end", () => resolve(results))
                .on("error", reject);
        });
    }
    parseExcel(filePath) {
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            blankrows: false
        });
        // Récupérer les headers (première ligne)
        const headers = jsonData[0]?.map(h => h.toLowerCase().trim()) || [];
        const emailIndex = this.findColumnIndex(headers, ['email', 'e-mail', 'mail']);
        const firstNameIndex = this.findColumnIndex(headers, ['prenom', 'prénom', 'firstname', 'first_name']);
        const lastNameIndex = this.findColumnIndex(headers, ['nom', 'lastname', 'last_name']);
        if (emailIndex === -1) {
            throw new Error('Colonne email non trouvée dans le fichier Excel');
        }
        // Parser les données (ignorer la ligne d'en-tête)
        return jsonData.slice(1)
            .filter(row => row[emailIndex]?.trim()) // Ignorer les lignes sans email
            .map(row => ({
            email: row[emailIndex]?.trim(),
            firstName: firstNameIndex !== -1 ? row[firstNameIndex]?.trim() : undefined,
            lastName: lastNameIndex !== -1 ? row[lastNameIndex]?.trim() : undefined
        }));
    }
    findColumnIndex(headers, possibleNames) {
        return headers.findIndex(header => possibleNames.some(name => header.includes(name)));
    }
    validateStudentsData(studentsData, errors) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const validStudents = [];
        const seenEmails = new Set();
        studentsData.forEach((student, index) => {
            const lineNumber = index + 2; // +2 car index commence à 0 et on ignore la ligne d'en-tête
            // Vérifier que l'email existe
            if (!student.email) {
                errors.push(`Ligne ${lineNumber}: Email manquant`);
                return;
            }
            // Valider le format de l'email
            if (!emailRegex.test(student.email)) {
                errors.push(`Ligne ${lineNumber}: Format d'email invalide (${student.email})`);
                return;
            }
            // Vérifier les doublons dans le fichier
            if (seenEmails.has(student.email.toLowerCase())) {
                errors.push(`Ligne ${lineNumber}: Email en double (${student.email})`);
                return;
            }
            seenEmails.add(student.email.toLowerCase());
            validStudents.push({
                ...student,
                email: student.email.toLowerCase() // Normaliser l'email
            });
        });
        return validStudents;
    }
    extractFirstNameFromEmail(email) {
        const localPart = email.split('@')[0];
        const name = localPart.split('.')[0] || localPart;
        return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
    }
    cleanupFile(filePath) {
        try {
            (0, fs_1.unlinkSync)(filePath);
        }
        catch (error) {
            console.error('Erreur lors de la suppression du fichier temporaire:', error);
        }
    }
    async deletePromotion(promotionId) {
        const promotion = await this.promotionRepository.findOne({ where: { id: promotionId } });
        if (!promotion)
            throw new Error('Promotion not found');
        await this.promotionRepository.remove(promotion);
    }
    async removeStudentFromPromotion(promotionId, studentId, teacherId) {
        // Vérifier que la promotion existe et appartient au professeur
        const promotion = await this.promotionRepository.findOne({
            where: {
                id: promotionId,
                teacher: { id: teacherId }
            },
            relations: ['students', 'teacher']
        });
        if (!promotion) {
            throw new Error('Promotion non trouvée');
        }
        // Vérifier que l'étudiant existe dans cette promotion
        const studentExists = promotion.students.some(student => student.id === studentId);
        if (!studentExists) {
            throw new Error('Étudiant non trouvé dans cette promotion');
        }
        // Retirer l'étudiant de la promotion (relation ManyToMany)
        promotion.students = promotion.students.filter(student => student.id !== studentId);
        await this.promotionRepository.save(promotion);
        return { success: true, studentId };
    }
}
exports.PromotionService = PromotionService;
