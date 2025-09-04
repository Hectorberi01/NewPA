import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Project,Group,User,Promotion } from '../entities/Entities';

import { EmailService } from '../utils/email.service';

export class ProjectService {
  private projectRepository: Repository<Project>;
  private groupRepository: Repository<Group>;
  private userRepository: Repository<User>;
  private promotionRepository: Repository<Promotion>;
  private emailService: EmailService;

  constructor() {
    this.projectRepository = AppDataSource.getRepository(Project);
    this.groupRepository = AppDataSource.getRepository(Group);
    this.userRepository = AppDataSource.getRepository(User);
    this.promotionRepository = AppDataSource.getRepository(Promotion);
    this.emailService = new EmailService();
  }

  async createProject(projectData: Partial<Project>): Promise<Project> {
    const project = this.projectRepository.create(projectData);
    const savedProject = await this.projectRepository.save(project);

    // Si le projet est visible, notifier les étudiants
    if (savedProject.status === 'visible') {
      await this.notifyStudentsNewProject(savedProject);
    }

    return savedProject;
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project> {
    const project = await this.projectRepository.findOne({
      where: { id },
      relations: ['promotion', 'promotion.students']
    });
    
    if (!project) throw new Error('Project not found');

    const wasVisible = project.status === 'visible';
    Object.assign(project, projectData);
    const updatedProject = await this.projectRepository.save(project);

    // Si le projet devient visible, notifier les étudiants
    if (!wasVisible && updatedProject.status === 'visible') {
      await this.notifyStudentsNewProject(updatedProject);
    }

    return updatedProject;
  }

  async getProjectById(id: number): Promise<Project | null> {
    return await this.projectRepository.findOne({
      where: { id },
      relations: [
        'teacher', 
        'promotion', 
        'promotion.students', 
        'groups', 
        'groups.members',
        'deliverables',
        'reports',
        'defenses',
        'gradingGrids'
      ]
    });
  }

  async getProjectsByTeacher(teacherId: number): Promise<Project[]> {
    return await this.projectRepository.find({
      where: { teacher: { id: teacherId } },
      relations: ['promotion', 'groups', 'deliverables'],
      order: { createdAt: 'DESC' }
    });
  }

  async getProjectsByStudent(studentId: number): Promise<Project[]> {
    return await this.projectRepository
      .createQueryBuilder('project')
      .innerJoin('project.promotion', 'promotion')
      .innerJoin('promotion.students', 'student')
      .leftJoinAndSelect('project.deliverables', 'deliverables')
      .leftJoinAndSelect('project.groups', 'groups')
      .leftJoinAndSelect('groups.members', 'members')
      .where('student.id = :studentId', { studentId })
      .andWhere('project.status = :status', { status: 'visible' })
      .orderBy('project.createdAt', 'DESC')
      .getMany();
  }

  async generateRandomGroups(projectId: number): Promise<Group[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['promotion', 'promotion.students', 'groups']
    });

    if (!project) throw new Error('Project not found');
    if (project.groupFormationRule !== 'random') {
      throw new Error('Random group generation not allowed for this project');
    }

    // Supprimer les groupes existants
    if (project.groups.length > 0) {
      await this.groupRepository.remove(project.groups);
    }

    const students = project.promotion.students.filter(s => s.isActive);
    const maxGroupSize = project.maxGroupSize || 4;
    const minGroupSize = project.minGroupSize || 2;
    const groups: Group[] = [];

    // Mélanger les étudiants
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
    
    let currentIndex = 0;
    let groupNumber = 1;

    while (currentIndex < shuffledStudents.length) {
      const remainingStudents = shuffledStudents.length - currentIndex;
      const remainingGroups = Math.ceil(remainingStudents / maxGroupSize);
      
      // Calculer la taille optimale pour ce groupe
      let groupSize = Math.min(maxGroupSize, remainingStudents);
      
      // Éviter d'avoir un dernier groupe trop petit
      if (remainingGroups === 2 && remainingStudents < minGroupSize + maxGroupSize) {
        groupSize = Math.ceil(remainingStudents / 2);
      }

      const groupMembers = shuffledStudents.slice(currentIndex, currentIndex + groupSize);
      
      const group = this.groupRepository.create({
        name: `Groupe ${groupNumber}`,
        project,
        members: groupMembers
      });

      groups.push(await this.groupRepository.save(group));
      currentIndex += groupSize;
      groupNumber++;
    }

    return groups;
  }

  async generateManualGroups(projectId: number, groupsData: { name: string; memberIds: number[] }[]): Promise<Group[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['groups']
    });

    if (!project) throw new Error('Project not found');
    if (project.groupFormationRule !== 'manual') {
      throw new Error('Manual group generation not allowed for this project');
    }

    // Supprimer les groupes existants
    if (project.groups.length > 0) {
      await this.groupRepository.remove(project.groups);
    }

    const groups: Group[] = [];
    
    for (const groupData of groupsData) {
      const members = await this.userRepository.findByIds(groupData.memberIds);
      
      // Vérifications
      if (project.minGroupSize && members.length < project.minGroupSize) {
        throw new Error(`Group "${groupData.name}" must have at least ${project.minGroupSize} members`);
      }
      
      if (project.maxGroupSize && members.length > project.maxGroupSize) {
        throw new Error(`Group "${groupData.name}" cannot have more than ${project.maxGroupSize} members`);
      }

      const group = this.groupRepository.create({
        name: groupData.name,
        project,
        members
      });

      groups.push(await this.groupRepository.save(group));
    }

    return groups;
  }

  async assignUnassignedStudents(projectId: number): Promise<void> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['promotion', 'promotion.students', 'groups', 'groups.members']
    });

    if (!project) throw new Error('Project not found');

    // Trouver les étudiants non assignés
    const allStudents = project.promotion.students;
    const assignedStudentIds = new Set(
      project.groups.flatMap(group => group.members.map(member => member.id))
    );
    
    const unassignedStudents = allStudents.filter(
      student => !assignedStudentIds.has(student.id) && student.isActive
    );

    if (unassignedStudents.length === 0) return;

    // Distribuer les étudiants non assignés dans les groupes existants
    const existingGroups = [...project.groups];
    let currentGroupIndex = 0;

    for (const student of unassignedStudents) {
      if (existingGroups.length === 0) {
        // Créer un nouveau groupe si aucun groupe n'existe
        const newGroup = this.groupRepository.create({
          name: `Groupe ${project.groups.length + 1}`,
          project,
          members: [student]
        });
        await this.groupRepository.save(newGroup);
      } else {
        // Ajouter à un groupe existant
        const targetGroup = existingGroups[currentGroupIndex];
        
        if (!project.maxGroupSize || targetGroup.members.length < project.maxGroupSize) {
          targetGroup.members.push(student);
          await this.groupRepository.save(targetGroup);
        }
        
        currentGroupIndex = (currentGroupIndex + 1) % existingGroups.length;
      }
    }
  }

  async deleteProject(id: number): Promise<void> {
    const project = await this.projectRepository.findOne({ where: { id } });
    if (!project) throw new Error('Project not found');

    await this.projectRepository.remove(project);
  }

  private async notifyStudentsNewProject(project: Project): Promise<void> {
    if (!project.promotion?.students) return;

    const emailPromises = project.promotion.students.map(student =>
      this.emailService.sendProjectNotificationEmail(
        student.email,
        project.name,
        project.description
      )
    );

    await Promise.allSettled(emailPromises);
  }
}
