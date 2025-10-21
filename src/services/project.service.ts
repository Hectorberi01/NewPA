import { Repository,In,DataSource ,Brackets} from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Project,Group,User,Promotion } from '../entities/Entities';

import { EmailService } from '../utils/email.service';
export interface GroupSavePayload {
  groups: { id: number; memberIds: number[] }[];
  unassignedIds: number[];
}
type SaveResult = { updatedGroups: number; affectedLinks: number };
export class ProjectService {
  private projectRepository: Repository<Project>;
  private groupRepository: Repository<Group>;
  private userRepository: Repository<User>;
  private promotionRepository: Repository<Promotion>;
  private emailService: EmailService;
  private ds = AppDataSource;
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

    await this.createRandomGroups(savedProject.id)
    // Si le projet est visible, notifier les étudiants
    if (savedProject.status === 'visible') {
      await this.notifyStudentsNewProject(savedProject);
    }
    if(savedProject.groupFormationRule == 'random'){
      //await this.createRandomGroups(savedProject.id);
      await this.assignUnassignedStudents(savedProject.id)
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
      // await this.notifyStudentsNewProject(updatedProject);
      for (const student of project.promotion.students) {
        this.emailService.sendProjectVisibleEmail(student.email, student.firstName, updatedProject.name)
      }
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
        'deliverables.submissions',
        'deliverables.submissions.group',
        'deliverables.validationRules',
        'reports',
        'reports.sections',
        'reports.group',
        'defenses',
        'defenses.group',
        'gradingGrids',
        'gradingGrids.criteria'
      ]
    });
  }

  async getProjectsByIdForStudent(studentId: number, projectId: number, options?: { skip?: number; take?: number }): Promise<Project> {
    const skip = options?.skip;
    const take = options?.take;

    try {
      const qb = this.projectRepository
          .createQueryBuilder('project')
          .leftJoinAndSelect('project.teacher', 'teacher')

          .leftJoinAndSelect('project.deliverables', 'deliverables')
          .leftJoinAndSelect('deliverables.validationRules', 'deliverableValidationRules')
          .leftJoinAndSelect('deliverables.submissions', 'deliverableSubmissions')
          .leftJoinAndSelect('deliverableSubmissions.group', 'submissionGroup')

          // ✅ Tous les groupes
          .leftJoinAndSelect('project.groups', 'groups')
          .leftJoinAndSelect('groups.members', 'members')
          .leftJoinAndSelect('groups.deliverableSubmissions', 'groupDeliverableSubmissions')
          .leftJoinAndSelect('groupDeliverableSubmissions.deliverable', 'gdsDeliverable')
          .leftJoinAndSelect('groups.reports', 'groupReports')
          .leftJoinAndSelect('groupReports.sections', 'groupReportSections')
          .leftJoinAndSelect('groups.defenses', 'groupDefenses')
          .leftJoinAndSelect('groups.grades', 'groupGrades')

          .leftJoinAndSelect('project.reports', 'projectReports')
          .leftJoinAndSelect('projectReports.sections', 'projectReportSections')
          .leftJoinAndSelect('projectReports.group', 'reportGroup')

          .leftJoinAndSelect('project.defenses', 'defenses')
          .leftJoinAndSelect('project.gradingGrids', 'gradingGrids')

          .where('project.status = :status', { status: 'visible' })
          .andWhere('project.id = :projectId', { projectId })

          // ✅ Vérifier l'accès via une sous-requête EXISTS
          .andWhere(qb => {
            const subQuery = qb
                .subQuery()
                .select('1')
                .from('group', 'g')
                .innerJoin('g.members', 'm')
                .where('g.projectId = project.id')
                .andWhere('m.id = :studentId')
                .getQuery()
            return `EXISTS ${subQuery}`
          })
          .setParameter('studentId', studentId)

          .orderBy('project.createdAt', 'DESC')

      if (typeof skip === 'number') qb.skip(skip)
      if (typeof take === 'number') qb.take(take)

      const project = await qb.getOne()

      if (!project) {
        throw new Error('Project not found or student not authorized')
      }

      return project

    } catch (err) {
      throw err
    }
  }

  async getProjectsByTeacher(teacherId: number): Promise<Project[]> {
    return await this.projectRepository.find({
      where: { teacher: { id: teacherId } },
      relations: ['promotion', 'promotion.students', 'groups', 'deliverables'],
      order: { createdAt: 'DESC' }
    });
  }

  async getProjectsByStudent(studentId: number, options?: { skip?: number; take?: number }): Promise<Project[]> {
    const skip = options?.skip;
    const take = options?.take;
    try {
      const qb = this.projectRepository
          .createQueryBuilder('project')

          // relations principales
          .leftJoinAndSelect('project.promotion', 'promotion')
          .leftJoinAndSelect('promotion.students', 'promotionStudents')

          .leftJoinAndSelect('project.teacher', 'teacher')

          .leftJoinAndSelect('project.deliverables', 'deliverables')
          .leftJoinAndSelect('deliverables.validationRules', 'deliverableValidationRules')
          .leftJoinAndSelect('deliverables.submissions', 'deliverableSubmissions')
          .leftJoinAndSelect('deliverableSubmissions.group', 'submissionGroup') // si besoin d'accéder au groupe depuis la soumission

          // groups et sous-relations
          .leftJoinAndSelect('project.groups', 'groups')
          .leftJoinAndSelect('groups.members', 'members')
          .leftJoinAndSelect('groups.deliverableSubmissions', 'groupDeliverableSubmissions')
          .leftJoinAndSelect('groupDeliverableSubmissions.deliverable', 'gdsDeliverable')
          .leftJoinAndSelect('groups.reports', 'groupReports')
          .leftJoinAndSelect('groupReports.sections', 'groupReportSections')
          .leftJoinAndSelect('groups.defenses', 'groupDefenses')
          .leftJoinAndSelect('groups.grades', 'groupGrades')

          // reports liés au projet (indépendants des groupes) et leurs sections
          .leftJoinAndSelect('project.reports', 'projectReports')
          .leftJoinAndSelect('projectReports.sections', 'projectReportSections')

          // defenses et gradingGrids au niveau du projet
          .leftJoinAndSelect('project.defenses', 'defenses')
          .leftJoinAndSelect('project.gradingGrids', 'gradingGrids')

          // Filtre : projet visible
          .where('project.status = :status', { status: 'visible' })

          // Filtre : l'étudiant appartient soit à la promotion, soit à un groupe du projet
          .andWhere(
              new Brackets(qb => {
                qb.where('promotionStudents.id = :studentId', { studentId })
                    .orWhere('members.id = :studentId', { studentId });
              })
          )

          // éviter doublons
          .distinct(true)

          // tri
          .orderBy('project.createdAt', 'DESC')

      // pagination si fournie (optionnel)
      if (typeof skip === 'number') qb.skip(skip)
      if (typeof take === 'number') qb.take(take)

      return await qb.getMany()
    } catch (err) {
      throw err
    }
  }

  async generateRandomGroups(projectId: number): Promise<Group[]> {
    console.log(`Generating random groups for project ID: ${projectId}`);
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['promotion', 'promotion.students', 'groups']
    });
    console.log('Project details:', project);

    if (!project) throw new Error('Project not found');
    if (project.groupFormationRule !== 'random') {
      throw new Error('Random group generation not allowed for this project');
    }

    console.log(`Removing existing groups for project "${project}"`);
    
    // Supprimer les groupes existants
    if (project.groups.length > 0) {
      await this.groupRepository.remove(project.groups);
    }

    const students = project.promotion.students.filter(s => s.isActive);
    console.log(`Active students in promotion:`, students.map(s => s.id));
    const maxGroupSize = project.maxGroupSize || 4;
    const minGroupSize = project.minGroupSize || 2;
    const groups: Group[] = [];

    // Mélanger les étudiants
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
    
    let currentIndex = 0;
    let groupNumber = 1;

    console.log(`Generating groups for project "${project}" with ${shuffledStudents.length} students`);
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
      console.log(`Forming group ${groupNumber} with members:`, groupMembers.map(m => m.id));
      const group = this.groupRepository.create({
        name: `Groupe ${groupNumber}`,
        project,
        members: groupMembers
      });

      console.log(`Creating group "${group.name}" with members:`, groupMembers.map(m => m.id));

      groups.push(await this.groupRepository.save(group));
      currentIndex += groupSize;
      groupNumber++;
    }

    return groups;
  }

  async createRandomGroups(projectId: number): Promise<Group[]> {
    const project = await this.projectRepository.findOne({
      where: { id: projectId },
      relations: ['promotion', 'promotion.students', 'groups']
    });
    console.log('Project details:', project);

    if (!project) throw new Error('Project not found');

    console.log(`Removing existing groups for project "${project}"`);
    
    // Supprimer les groupes existants
    if (project.groups.length > 0) {
      await this.groupRepository.remove(project.groups);
    }

    const students = project.promotion.students.filter(s => s.isActive);
    console.log(`Active students in promotion:`, students.map(s => s.id));
    const maxGroupSize = project.maxGroupSize || 4;
    const minGroupSize = project.minGroupSize || 2;
    const groups: Group[] = [];

    // Mélanger les étudiants
    const shuffledStudents = [...students].sort(() => Math.random() - 0.5);
    
    let currentIndex = 0;
    let groupNumber = 1;

    console.log(`Generating groups for project "${project}" with ${shuffledStudents.length} students`);
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
      console.log(`Forming group ${groupNumber} with members:`, groupMembers.map(m => m.id));
      const group = this.groupRepository.create({
        name: `Groupe ${groupNumber}`,
        project,
      });

      console.log(`Creating group "${group.name}" with members:`, groupMembers.map(m => m.id));

      groups.push(await this.groupRepository.save(group));
      currentIndex += groupSize;
      groupNumber++;
    }

    return groups;
    //return this.generateRandomGroups(projectId);
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

  async saveGrouping(projectId: number, payload: GroupSavePayload): Promise<SaveResult> {
    const qr = this.ds.createQueryRunner();
    await qr.connect();
    await qr.startTransaction();

    try {
      // 1) Charger projet + groupes + membres + promo/étudiants (contrôle appartenance)
      const project = await qr.manager.getRepository(Project).findOne({
        where: { id: projectId },
        relations: [
          "groups",
          "groups.members",
          "promotion",
          "promotion.students",
        ],
      });

      if (!project) {
        const err: any = new Error("Projet introuvable");
        err.code = "NOT_FOUND";
        throw err;
      }

      const groupsById = new Map<number, Group>();
      project.groups.forEach((g) => groupsById.set(g.id, g));

      // 2) Validation de base payload
      const payloadGroupIds = new Set(payload.groups.map((g) => g.id));
      // (optionnel) s'assurer que tous les groupes du payload appartiennent au projet
      const invalidGroupIds = [...payloadGroupIds].filter((id) => !groupsById.has(id));
      if (invalidGroupIds.length > 0) {
        const err: any = new Error("Certains groupes ne font pas partie du projet");
        err.code = "VALIDATION_ERROR";
        err.details = { invalidGroupIds };
        throw err;
      }

      // 3) Vérifier l'appartenance des étudiants à la promotion du projet
      const allowedStudentIds = new Set<number>((project.promotion?.students ?? []).map((s) => s.id));
      const requestedIds = new Set<number>([
        ...payload.unassignedIds,
        ...payload.groups.flatMap((g) => g.memberIds),
      ]);
      const outside = [...requestedIds].filter((id) => !allowedStudentIds.has(id));
      if (outside.length > 0) {
        const err: any = new Error("Des étudiants ne sont pas dans la promotion du projet");
        err.code = "VALIDATION_ERROR";
        err.details = { studentIdsNotInPromotion: outside };
        throw err;
      }

      // 4) Unicité : un étudiant ne peut être dans deux groupes à la fois
      const allAssigned = payload.groups.flatMap((g) => g.memberIds);
      const dupCheck = new Map<number, number>();
      const duplicates: number[] = [];
      allAssigned.forEach((sid) => {
        dupCheck.set(sid, (dupCheck.get(sid) ?? 0) + 1);
      });
      dupCheck.forEach((count, sid) => count > 1 && duplicates.push(sid));
      if (duplicates.length) {
        const err: any = new Error("Un étudiant est assigné à plusieurs groupes");
        err.code = "VALIDATION_ERROR";
        err.details = { duplicates };
        throw err;
      }

      // 5) Capacité : chaque groupe <= capacity
      const overCapacity = payload.groups
        .map((g) => ({ g, entity: groupsById.get(g.id)! }))
        .filter(({ g, entity }) => g.memberIds.length > project.maxGroupSize!)
        .map(({ g, entity }) => ({ groupId: g.id, capacity: project.maxGroupSize!, requested: g.memberIds.length }));

      if (overCapacity.length) {
        const err: any = new Error("Capacité de groupe dépassée");
        err.code = "CAPACITY_EXCEEDED";
        err.details = { overCapacity };
        throw err;
      }

      // 6) Construire l'état cible + calculer add/remove par groupe
      const userRepo = qr.manager.getRepository(User);

      // Charger tous les utilisateurs impliqués (optimisation requête)
      const allUserIds = [...requestedIds];
      const users = allUserIds.length
        ? await userRepo.find({ where: { id: In(allUserIds) } })
        : [];
      const usersById = new Map(users.map((u) => [u.id, u]));

      let affectedLinks = 0;

      // Pour chaque groupe du projet, on aligne l'état avec le payload
      for (const g of project.groups) {
        const desired = payload.groups.find((x) => x.id === g.id)?.memberIds ?? [];
        const current = (g.members ?? []).map((m) => m.id);

        const toAdd = desired.filter((id) => !current.includes(id));
        const toRemove = current.filter((id) => !desired.includes(id));

        if (toAdd.length === 0 && toRemove.length === 0) continue;

        // Vérif finale (au cas où) : pas d'IDs inconnus
        const validAdd = toAdd.filter((id) => usersById.has(id));

        // Mettre à jour la relation ManyToMany (clear+add partiel)
        if (toRemove.length) {
          await qr.manager
            .createQueryBuilder()
            .relation(Group, "members")
            .of(g.id)
            .remove(toRemove);
          affectedLinks += toRemove.length;
        }
        if (validAdd.length) {
          const addUsers = validAdd.map((id) => usersById.get(id)!);
          await qr.manager
            .createQueryBuilder()
            .relation(Group, "members")
            .of(g.id)
            .add(addUsers);
          affectedLinks += validAdd.length;
        }
      }

      await qr.commitTransaction();
      return { updatedGroups: project.groups.length, affectedLinks };
    } catch (e) {
      await qr.rollbackTransaction();
      throw e;
    } finally {
      await qr.release();
    }
  }
}
