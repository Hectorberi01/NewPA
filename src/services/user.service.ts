import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { User ,Promotion} from '../entities/Entities';
import { EmailService } from '../utils/email.service';
import { PasswordService } from '../utils/password.service';

export class UserService {
  private userRepository: Repository<User>;
  private promotionRepository: Repository<Promotion>;
  private emailService: EmailService;

  constructor() {
    this.userRepository = AppDataSource.getRepository(User);
    this.promotionRepository = AppDataSource.getRepository(Promotion);
    this.emailService = new EmailService();
  }

  async createUser(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return await this.userRepository.save(user);
  }

  async findByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findOne({ 
      where: { email },
      relations: ['studentPromotions', 'teacherPromotions', 'groups']
    });
  }

  async findById(id: number): Promise<User | null> {
    return await this.userRepository.findOne({ 
      where: { id },
      relations: ['studentPromotions', 'teacherPromotions', 'groups']
    });
  }

  async createStudentsFromFile(emails: string[], promotionId: number): Promise<User[]> {
    const promotion = await this.promotionRepository.findOne({ 
      where: { id: promotionId },
      relations: ['students']
    });
    
    if (!promotion) throw new Error('Promotion not found');

    const students: User[] = [];
    
    for (const email of emails) {
      let student = await this.findByEmail(email);
      
      if (!student) {
        const tempPassword = "ESGI12345"; //PasswordService.generateTemporaryPassword();

        const hashedPassword = await PasswordService.hashPassword(tempPassword);
        
        student = await this.createUser({
          email,
          firstName: email.split('@')[0],
          lastName: '',
          role: 'student',
          password: hashedPassword
        });

        await this.emailService.sendAccountCreationEmail(
          email, 
          student.firstName, 
          tempPassword
        );
      }
      
      if (!promotion.students.some(s => s.id === student.id)) {
        students.push(student);
      }
    }

    promotion.students = [...promotion.students, ...students];
    await this.promotionRepository.save(promotion);
    
    return students;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');

    Object.assign(user, userData);
    return await this.userRepository.save(user);
  }

  async deactivateUser(id: number): Promise<User> {
    const user = await this.findById(id);
    if (!user) throw new Error('User not found');

    user.isActive = false;
    return await this.userRepository.save(user);
  }

  async getAllStudents(): Promise<User[]> {
    return await this.userRepository.find({
      where: { role: 'student', isActive: true },
      relations: ['studentPromotions']
    });
  }

  async getAllTeachers(): Promise<User[]> {
    return await this.userRepository.find({
      where: { role: 'teacher', isActive: true },
      relations: ['teacherPromotions']
    });
  }

  async searchUsers(query: string, role?: 'teacher' | 'student'): Promise<User[]> {
    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .where('user.isActive = :active', { active: true })
      .andWhere(
        '(user.firstName ILIKE :query OR user.lastName ILIKE :query OR user.email ILIKE :query)',
        { query: `%${query}%` }
      );

    if (role) {
      queryBuilder.andWhere('user.role = :role', { role });
    }

    return await queryBuilder.getMany();
  }
}