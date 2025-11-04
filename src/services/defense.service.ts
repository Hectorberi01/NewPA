import { Repository, DataSource, In } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Defense, Group, Project } from '../entities/Entities';
import { PDFGeneratorService } from '../utils/pdf-generator.service';
 interface ScheduleDefenseDto {
  startDateTime: string  // ISO date string
  endDateTime?: string   // Optionnel pour le mode plage horaire
  durationPerGroup?: number  // Optionnel pour le mode durée fixe
  location: string
}
export class DefenseService {
  private defenseRepository: Repository<Defense>;
  private groupRepository: Repository<Group>;
  private ds: DataSource;

  constructor(ds?: DataSource) {
    this.defenseRepository = AppDataSource.getRepository(Defense);
    this.groupRepository = AppDataSource.getRepository(Group);
    this.ds = ds ?? AppDataSource;
    if (!this.ds) throw new Error("DataSource not provided");
  }


async scheduleDefenses(
  projectId: number,
  startDateTime: Date,
  durationPerGroup: number | null,
  location: string,
  mode: 'fixed_duration' | 'time_range' = 'fixed_duration',
  endDateTime?: Date
): Promise<any> {
  
  // Validation
  if (!projectId || isNaN(projectId)) {
    throw new Error('projectId invalide');
  }

  if (!startDateTime || !(startDateTime instanceof Date)) {
    throw new Error('startDateTime invalide');
  }

  if (!location || location.trim() === '') {
    throw new Error('location est requis');
  }

  // Vérifier que le projet existe
  const project = await this.ds.getRepository(Project).findOne({
    where: { id: projectId }
  });

  if (!project) {
    throw new Error('Projet introuvable');
  }

  // Récupérer tous les groupes du projet
  const groups = await this.ds.getRepository(Group).find({
    where: { project: { id: projectId } },
    relations: ['members'],
    order: { createdAt: 'ASC' }
  });

  if (groups.length === 0) {
    throw new Error('Aucun groupe trouvé pour ce projet');
  }

  let calculatedDurationPerGroup: number;

  // Déterminer la durée par groupe selon le mode
  if (mode === 'fixed_duration') {
    if (!durationPerGroup || durationPerGroup <= 0) {
      throw new Error('durationPerGroup doit être > 0 en mode fixed_duration');
    }
    calculatedDurationPerGroup = durationPerGroup;
  } else if (mode === 'time_range') {
    if (!endDateTime || !(endDateTime instanceof Date)) {
      throw new Error('endDateTime invalide en mode time_range');
    }

    if (endDateTime <= startDateTime) {
      throw new Error('La date de fin doit être après la date de début');
    }

    const totalMinutes = Math.floor(
      (endDateTime.getTime() - startDateTime.getTime()) / (1000 * 60)
    );

    calculatedDurationPerGroup = Math.floor(totalMinutes / groups.length);

    if (calculatedDurationPerGroup < 10) {
      throw new Error(
        `Durée calculée trop courte (${calculatedDurationPerGroup} min pour ${groups.length} groupes). ` +
        `Augmentez la plage horaire ou réduisez le nombre de groupes.`
      );
    }
  } else {
    throw new Error('Mode invalide');
  }

  // Créer les défenses
  const defenses: Defense[] = [];
  const durationMs = calculatedDurationPerGroup * 60 * 1000;

  for (let i = 0; i < groups.length; i++) {
    const defenseStartTime = new Date(startDateTime.getTime() + i * durationMs);
    const defenseEndTime = new Date(defenseStartTime.getTime() + durationMs);

    const defense = this.ds.getRepository(Defense).create({
      project,
      group: groups[i],
      startTime: defenseStartTime,
      endTime: defenseEndTime,
      location,
      orderIndex: i + 1
    });

    defenses.push(defense);
  }

  // Sauvegarder les défenses
  const savedDefenses = await this.ds.getRepository(Defense).save(defenses);

  return {
    defenses: savedDefenses,
    mode,
    calculatedDurationPerGroup,
    totalGroups: groups.length,
    message: `${groups.length} défenses planifiées avec succès`
  };
}

  // async updateDefenseOrder(projectId: number, newOrder: { groupId: number; orderIndex: number }[]): Promise<Defense[]> {
  //   const defenses = await this.defenseRepository.find({
  //     where: { project: { id: projectId } },
  //     relations: ['group']
  //   });

  //   for (const orderUpdate of newOrder) {
  //     const defense = defenses.find(d => d.group.id === orderUpdate.groupId);
  //     if (defense) {
  //       defense.orderIndex = orderUpdate.orderIndex;
  //       await this.defenseRepository.save(defense);
  //     }
  //   }

  //   return await this.defenseRepository.find({
  //     where: { project: { id: projectId } },
  //     relations: ['group', 'group.members'],
  //     order: { orderIndex: 'ASC' }
  //   });
  // }

  /**
   * Met à jour l'ordre des défenses pour un projet.
   * newOrder: [{ groupId, orderIndex }, ...]
   */
async updateDefenseOrder(projectId: number, newOrder: { groupId: number; orderIndex: number }[]) {
  if (!Number.isFinite(projectId)) {
    const e: any = new Error("projectId invalide");
    e.code = "BAD_REQUEST";
    throw e;
  }
  if (!Array.isArray(newOrder) || newOrder.length === 0) {
    const e: any = new Error("newOrder doit être un tableau non vide");
    e.code = "BAD_REQUEST";
    throw e;
  }

  // Validation basique des éléments
  for (const item of newOrder) {
    if (!Number.isFinite(item.groupId) || !Number.isFinite(item.orderIndex)) {
      const e: any = new Error("Chaque élément doit contenir groupId et orderIndex numériques");
      e.code = "BAD_REQUEST";
      throw e;
    }
  }

  const qr = this.ds.createQueryRunner();
  await qr.connect();
  await qr.startTransaction();

  try {
    const project = await qr.manager.getRepository(Project).findOne({
      where: { id: projectId },
      relations: ["defenses"],
    });
    if (!project) {
      const e: any = new Error("Projet introuvable");
      e.code = "NOT_FOUND";
      throw e;
    }

    const defenses = await qr.manager.getRepository(Defense).find({
      where: { project: { id: projectId } },
      relations: ["group"],
      order: { orderIndex: "ASC" },
    });

    const defenseByGroup = new Map<number, Defense>();
    defenses.forEach(d => {
      if (d.group && typeof d.group.id === "number") {
        defenseByGroup.set(d.group.id, d);
      }
    });

    const unknownGroupIds = newOrder
      .map(i => i.groupId)
      .filter(gid => !defenseByGroup.has(gid));
    if (unknownGroupIds.length > 0) {
      const e: any = new Error("Certains groupId ne font pas partie du projet");
      e.code = "VALIDATION_ERROR";
      e.details = { unknownGroupIds };
      throw e;
    }

    // Récupérer les paramètres de planification
    const firstDefense = defenses[0];
    if (!firstDefense || !firstDefense.startTime) {
      const e: any = new Error("Aucune défense planifiée trouvée pour ce projet");
      e.code = "NOT_FOUND";
      throw e;
    }

    // Calculer la durée par groupe
    const durationMs = new Date(firstDefense.endTime).getTime() - new Date(firstDefense.startTime).getTime();
    
    // Récupérer l'heure de début initiale
    const initialStartTime = new Date(
      Math.min(...defenses.map(d => new Date(d.startTime).getTime()))
    );

    // IMPORTANT: Trier par orderIndex ET normaliser à 1, 2, 3, 4, 5...
    const sortedNewOrder = [...newOrder]
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((item, index) => ({
        ...item,
        orderIndex: index + 1  // Normaliser: 1, 2, 3, 4, 5...
      }));

    // Appliquer les updates avec recalcul des heures
    const repo = qr.manager.getRepository(Defense);
    
    for (const item of sortedNewOrder) {
      const defense = defenseByGroup.get(item.groupId)!;
      
      // Calculer les nouvelles heures basées sur la POSITION (index + 1)
      // Position 1 -> index 0 -> pas de décalage
      // Position 2 -> index 1 -> 1 * durationMs de décalage
      const newStartTime = new Date(initialStartTime.getTime() + (item.orderIndex - 1) * durationMs);
      const newEndTime = new Date(newStartTime.getTime() + durationMs);
      
      // Mettre à jour
      defense.orderIndex = item.orderIndex;
      defense.startTime = newStartTime;
      defense.endTime = newEndTime;
      
      await repo.save(defense);
    }

    await qr.commitTransaction();

    // Recharger et renvoyer la liste triée
    const updated = await this.ds.getRepository(Defense).find({
      where: { project: { id: projectId } },
      relations: ["group", "group.members"],
      order: { orderIndex: "ASC" },
    });
    return updated;
  } catch (err) {
    await qr.rollbackTransaction();
    throw err;
  } finally {
    await qr.release();
  }
}
  async generateDefenseSchedulePDF(projectId: number): Promise<Buffer> {
    const defenses = await this.defenseRepository.find({
      where: { project: { id: projectId } },
      relations: ['group', 'group.members', 'project'],
      order: { orderIndex: 'ASC' }
    });

    return await PDFGeneratorService.generateDefenseSchedule(defenses, defenses[0]?.project?.name || 'Projet');
  }

  async generateAttendanceSheetPDF(projectId: number, orderType: 'group' | 'alphabetical'): Promise<Buffer> {
    const groups = await this.groupRepository.find({
      where: { project: { id: projectId } },
      relations: ['members', 'project']
    });

    return await PDFGeneratorService.generateAttendanceSheet(groups, groups[0]?.project?.name || 'Projet', orderType);
  }

  async getDefensesByProject(projectId: number): Promise<Defense[]> {
    return await this.defenseRepository.find({
      where: { project: { id: projectId } },
      relations: ['group', 'group.members'],
      order: { orderIndex: 'ASC' }
    });
  }

  async getDefenseByGroup(projectId: number, groupId: number): Promise<Defense | null> {
    return await this.defenseRepository.findOne({
      where: {
        project: { id: projectId },
        group: { id: groupId }
      },
      relations: ['group', 'group.members']
    });
  }

  async updateDefense(id: number, defenseData: Partial<Defense>): Promise<Defense> {
    const defense = await this.defenseRepository.findOne({ where: { id } });
    if (!defense) throw new Error('Defense not found');

    Object.assign(defense, defenseData);
    return await this.defenseRepository.save(defense);
  }

  async deleteDefense(id: number): Promise<void> {
    const defense = await this.defenseRepository.findOne({ where: { id } });
    if (!defense) throw new Error('Defense not found');

    await this.defenseRepository.remove(defense);
  }
}