import { In, Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { CriterionGrade, Defense, Deliverable, DeliverableRule, DeliverableSubmission, GradingCriterion, GradingGrid, Group, Project, Promotion, ReportSection, User } from '../entities/Entities'
import csv from 'csv-parser';
import * as XLSX from 'xlsx';
import { createReadStream, readFileSync, unlinkSync } from 'fs';
import { PasswordService } from '../utils/password.service';
import { EmailService } from '../utils/email.service';
import iconv from "iconv-lite";
import stripBom from "strip-bom-stream";

interface StudentData {
  prenom?: string;
  nom?: string;
  email: string;
  firstName?: string;
  lastName?: string;
}

export class PromotionService {
  private promotionRepository: Repository<Promotion>;
  private userRepository: Repository<User>;
  // private studentRepository: Repository<Student>; // Si vous avez une entité Student distincte   
  constructor() {
    this.promotionRepository = AppDataSource.getRepository(Promotion);
    this.userRepository = AppDataSource.getRepository(User);
  }

  async createPromotion(promotionData: Partial<Promotion>): Promise<Promotion> {
    const promotion = this.promotionRepository.create(promotionData);
    return await this.promotionRepository.save(promotion);
  }
  async getPromotionsByTeacher(teacherId: number): Promise<Promotion[]> {
    return await this.promotionRepository.find({
      where: { teacher: { id: teacherId } },
      relations: ['students', 'projects']
    });
  }

  async updatePromotion(promotionId: number, promotionData: Partial<Promotion>): Promise<Promotion> {
    await this.promotionRepository.update(promotionId, promotionData);
    return await this.promotionRepository.findOne({ where: { id: promotionId } });
  }

async addStudentsToPromotion(promotionId: number, studentsListe: StudentData[]): Promise<Promotion> {
  const promotion = await this.promotionRepository.findOne({
    where: { id: promotionId },
    relations: ['students']
  });

  if (!promotion) throw new Error('Promotion not found');
  
  console.log('Promotion trouvée:', promotion);
  const newStudents: User[] = [];

  console.log('Liste des étudiants à ajouter:', studentsListe);
  
  for (const data of studentsListe) {
    // CORRECTION: Rechercher avec les bonnes relations si nécessaire
    let student = await this.userRepository.findOne({ 
      where: { email: data.email },
      relations: ['studentPromotions'] // Ajouter si nécessaire
    });

    if (!student) {
      const tempPassword = PasswordService.generateTemporaryPassword();
      console.log('Temporary password generated:', tempPassword);
      const hashedPassword = await PasswordService.hashPassword(tempPassword);
      
      // CORRECTION: S'assurer que les champs correspondent
      student = this.userRepository.create({
        email: data.email,
        firstName: data.firstName || data.prenom, // Gérer les deux formats
        lastName: data.lastName || data.nom,      // Gérer les deux formats
        role: 'student',
        password: hashedPassword,
        isActive: true
      });
      
      student = await this.userRepository.save(student);
      
      // CORRECTION: Utiliser le service d'email correct
      this.sendWelcomeEmailAsync(student, tempPassword);
    }

    // CORRECTION: Vérifier si l'étudiant est déjà dans la promotion
    const isAlreadyInPromotion = promotion.students.some(s => s.id === student.id);
    if (!isAlreadyInPromotion) {
      newStudents.push(student);
    }
  }

  // CORRECTION: Ajouter les nouveaux étudiants
  promotion.students = [...promotion.students, ...newStudents];
  
  return await this.promotionRepository.save(promotion);
}

  async addStudentsUsingFile(promotionId: number, file: Express.Multer.File): Promise<{
    promotion: Promotion;
    summary: {
      totalProcessed: number;
      newStudents: number;
      existingStudents: number;
      errors: string[];
    }
  }> {
    const emailService = new EmailService();
    const errors: string[] = [];
    let totalProcessed = 0;
    let newStudentsCount = 0;
    let existingStudentsCount = 0;

    try {
      const promotion = await this.promotionRepository.findOne({
        where: { id: promotionId },
        relations: ['students']
      });

      console.log('Promotion trouvée:', promotion);

      if (!promotion) {
        throw new Error('Promotion not found');
      }

      const studentsData = await this.parseFile(file);

      console.log(`Données extraites du fichier (${studentsData.length} entrées):`, studentsData);

      const validStudents = this.validateStudentsData(studentsData, errors);

      if (validStudents.length === 0) {
        throw new Error('Aucun étudiant valide trouvé dans le fichier');
      }

      // 4. Traitement par batch pour optimiser les performances
      const batchSize = 50;
      const newStudents: User[] = [];

      const existingEmails = await this.userRepository
        .createQueryBuilder('user')
        .select('user.email')
        .where('user.email IN (:...emails)', {
          emails: validStudents.map(s => s.email)
        })
        .getMany()
        .then(users => new Set(users.map(u => u.email)));

      for (let i = 0; i < validStudents.length; i += batchSize) {
        const batch = validStudents.slice(i, i + batchSize);

        for (const studentData of batch) {
          try {
            totalProcessed++;

            if (existingEmails.has(studentData.email)) {
              const existingStudent = await this.userRepository.findOne({
                where: { email: studentData.email }
              });

              if (existingStudent && !promotion.students.some(s => s.id === existingStudent.id)) {
                newStudents.push(existingStudent);
              }
              existingStudentsCount++;
            } else {
              const tempPassword = PasswordService.generateTemporaryPassword();
              const hashedPassword = await PasswordService.hashPassword(tempPassword);

              const newStudent = this.userRepository.create({
                email: studentData.email,
                firstName: studentData.firstName ,
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

              emailService.sendAccountCreationEmail(savedStudent.email, savedStudent.firstName, tempPassword)
                .catch(emailError => {
                  console.error(`Erreur envoi email à ${savedStudent.email}:`, emailError);
                  errors.push(`Impossible d'envoyer l'email de bienvenue à ${savedStudent.email}`);
                });
            }
          } catch (studentError) {
            errors.push(`Erreur traitement étudiant ${studentData.email}: ${studentError}`);
          }
        }
      }

      if (newStudents.length > 0) {
        promotion.students = [...promotion.students, ...newStudents];
        await this.promotionRepository.save(promotion);
      }

if (file.path) this.cleanupFile(file.path);

      return {
        promotion,
          summary: {
          totalProcessed,
          newStudents: newStudentsCount,
          existingStudents: existingStudentsCount,
          errors,
        }
      };

    } catch (error) {
      // Nettoyer en cas d'erreur
      this.cleanupFile(file.path);
      throw error;
    }
  }

  // Méthodes auxiliaires
private async parseFile(file: Express.Multer.File): Promise<StudentData[]> {
  const extension = file.originalname.split('.').pop()?.toLowerCase();

  switch (extension) {
    case 'csv':
      return this.parseCSV(file.path);
    case 'xlsx':
    case 'xls':
      return this.parseExcel(file.path);
    case 'json':
      return this.parseJSON(file.path);  // NOUVEAU
    default:
      throw new Error(`Format de fichier non supporté: ${extension}`);
  }
}
private parseJSON(filePath: string): StudentData[] {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Gérer les différents formats JSON possibles
    const studentsArray = Array.isArray(data) ? data : 
                         Array.isArray(data.students) ? data.students : 
                         [data];
    
    // Normaliser les données
    return studentsArray
      .map(student => ({
        email: (student.email || student.mail || '').trim().toLowerCase(),
        firstName: (student.prenom || student.firstName || student.first_name || '').trim(),
        lastName: (student.nom || student.lastName || student.last_name || '').trim()
      }))
      .filter(s => s.email); 
    
  } catch (error) {
    throw new Error(`Erreur lors de la lecture du fichier JSON: ${error.message}`);
  }
}
  private async parseCSV(filePath: string): Promise<StudentData[]> {
    return new Promise((resolve, reject) => {
      const results: StudentData[] = [];

      const pick = (row: any, ...keys: string[]) =>
        (keys.map(k => row[k]).find(v => typeof v === "string" && v.trim()) || "").trim();

      createReadStream(filePath)
        .pipe(iconv.decodeStream("win1252"))
        .pipe(stripBom())
        .pipe(csv({
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

  private parseExcel(filePath: string): StudentData[] {
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
      header: 1,
      blankrows: false
    }) as string[][];

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

  private findColumnIndex(headers: string[], possibleNames: string[]): number {
    return headers.findIndex(header =>
      possibleNames.some(name => header.includes(name))
    );
  }

  private validateStudentsData(studentsData: StudentData[], errors: string[]): StudentData[] {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const validStudents: StudentData[] = [];
    const seenEmails = new Set<string>();

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

  private extractFirstNameFromEmail(email: string): string {
    const localPart = email.split('@')[0];
    const name = localPart.split('.')[0] || localPart;
    return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
  }

  private cleanupFile(filePath: string): void {
    try {
      unlinkSync(filePath);
    } catch (error) {
      console.error('Erreur lors de la suppression du fichier temporaire:', error);
    }
  }





async deletePromotion(promotionId: number): Promise<void> {
  const promotion = await this.promotionRepository.findOne({
    where: { id: promotionId }
  });

  if (!promotion) {
    throw new Error('Promotion not found');
  }

  // TypeORM gère automatiquement les CASCADE grâce aux onDelete: 'CASCADE'
  await this.promotionRepository.remove(promotion);
}

async removeStudentFromPromotion(promotionId: number, studentId: number, teacherId: number) {
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
  private async sendWelcomeEmailAsync(student: User, tempPassword: string): Promise<void> {
    try {
      const emailService = new EmailService();
      /*await emailService.sendAccountCreationEmail(
        student.email, 
        student.firstName, 
        tempPassword
      );*/
      console.log(`✅ Email envoyé à ${student.email}`);
    } catch (emailError) {
      console.error(`❌ Erreur email pour ${student.email}:`, emailError);
    }
  }
}