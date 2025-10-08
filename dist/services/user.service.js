"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const data_source_1 = require("../database/data-source");
const Entities_1 = require("../entities/Entities");
const email_service_1 = require("../utils/email.service");
const password_service_1 = require("../utils/password.service");
class UserService {
    constructor() {
        this.userRepository = data_source_1.AppDataSource.getRepository(Entities_1.User);
        this.promotionRepository = data_source_1.AppDataSource.getRepository(Entities_1.Promotion);
        this.emailService = new email_service_1.EmailService();
    }
    async createUser(userData) {
        const user = this.userRepository.create(userData);
        return await this.userRepository.save(user);
    }
    async findByEmail(email) {
        return await this.userRepository.findOne({
            where: { email },
            relations: ['studentPromotions', 'teacherPromotions', 'groups']
        });
    }
    async findById(id) {
        return await this.userRepository.findOne({
            where: { id },
            relations: ['studentPromotions', 'teacherPromotions', 'groups']
        });
    }
    async createStudentsFromFile(emails, promotionId) {
        const promotion = await this.promotionRepository.findOne({
            where: { id: promotionId },
            relations: ['students']
        });
        if (!promotion)
            throw new Error('Promotion not found');
        const students = [];
        for (const email of emails) {
            let student = await this.findByEmail(email);
            if (!student) {
                // Générer un mot de passe temporaire
                const tempPassword = password_service_1.PasswordService.generateTemporaryPassword();
                const hashedPassword = await password_service_1.PasswordService.hashPassword(tempPassword);
                student = await this.createUser({
                    email,
                    firstName: email.split('@')[0],
                    lastName: '',
                    role: 'student',
                    password: hashedPassword
                });
                // Envoyer email de création de compte
                await this.emailService.sendAccountCreationEmail(email, student.firstName, tempPassword);
            }
            // Vérifier si l'étudiant n'est pas déjà dans la promotion
            if (!promotion.students.some(s => s.id === student.id)) {
                students.push(student);
            }
        }
        // Ajouter les nouveaux étudiants à la promotion
        promotion.students = [...promotion.students, ...students];
        await this.promotionRepository.save(promotion);
        return students;
    }
    async updateUser(id, userData) {
        const user = await this.findById(id);
        if (!user)
            throw new Error('User not found');
        Object.assign(user, userData);
        return await this.userRepository.save(user);
    }
    async deactivateUser(id) {
        const user = await this.findById(id);
        if (!user)
            throw new Error('User not found');
        user.isActive = false;
        return await this.userRepository.save(user);
    }
    async getAllStudents() {
        return await this.userRepository.find({
            where: { role: 'student', isActive: true },
            relations: ['studentPromotions']
        });
    }
    async getAllTeachers() {
        return await this.userRepository.find({
            where: { role: 'teacher', isActive: true },
            relations: ['teacherPromotions']
        });
    }
    async searchUsers(query, role) {
        const queryBuilder = this.userRepository
            .createQueryBuilder('user')
            .where('user.isActive = :active', { active: true })
            .andWhere('(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.email ILIKE :query)', { query: `%${query}%` });
        if (role) {
            queryBuilder.andWhere('user.role = :role', { role });
        }
        return await queryBuilder.getMany();
    }
}
exports.UserService = UserService;
