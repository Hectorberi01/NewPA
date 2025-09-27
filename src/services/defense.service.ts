import { Repository, DataSource, In } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Defense, Group, Project } from '../entities/Entities';
import { PDFGeneratorService } from '../utils/pdf-generator.service';

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
    durationPerGroup: number,// en minutes
    location?: string
  ): Promise<Defense[]> {
    const groups = await this.groupRepository.find({
      where: { project: { id: projectId } },
      relations: ['members']
    });

    const defenses: Defense[] = [];
    let currentTime = new Date(startDateTime);

    for (let i = 0; i < groups.length; i++) {
      const endTime = new Date(currentTime);
      endTime.setMinutes(endTime.getMinutes() + durationPerGroup);

      const defense = this.defenseRepository.create({
        project: { id: projectId },
        group: groups[i],
        startTime: new Date(currentTime),
        endTime: endTime,
        orderIndex: i + 1,
        location: location || 'To be determined'
      });

      defenses.push(await this.defenseRepository.save(defense));

      // Préparer l'heure suivante (avec pause de 5 minutes)
      currentTime.setMinutes(currentTime.getMinutes() + durationPerGroup + 5);
    }

    return defenses;
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
      // Charger projet (vérification existence)
      const project = await qr.manager.getRepository(Project).findOne({
        where: { id: projectId },
      });
      if (!project) {
        const e: any = new Error("Projet introuvable");
        e.code = "NOT_FOUND";
        throw e;
      }

      // Récupérer les défenses existantes liées au projet (avec leurs groups)
      const defenses = await qr.manager.getRepository(Defense).find({
        where: { project: { id: projectId } },
        relations: ["group"],
      });

      // Map groupId -> defense
      const defenseByGroup = new Map<number, Defense>();
      defenses.forEach(d => {
        if (d.group && typeof d.group.id === "number") {
          defenseByGroup.set(d.group.id, d);
        }
      });

      // Vérifier que tous les groupId fournis existent dans le projet
      const unknownGroupIds = newOrder
        .map(i => i.groupId)
        .filter(gid => !defenseByGroup.has(gid));
      if (unknownGroupIds.length > 0) {
        const e: any = new Error("Certains groupId ne font pas partie du projet");
        e.code = "VALIDATION_ERROR";
        e.details = { unknownGroupIds };
        throw e;
      }

      // Vérifier unicité des orderIndex fournis
      const orderIndices = newOrder.map(i => i.orderIndex);
      const duplicates = orderIndices.filter((v, i, a) => a.indexOf(v) !== i);
      if (duplicates.length > 0) {
        const e: any = new Error("Des orderIndex sont dupliqués dans la requête");
        e.code = "VALIDATION_ERROR";
        e.details = { duplicates };
        throw e;
      }

      // Optionnel: normaliser les orderIndex (ex: si fournis non contigus -> make contiguous)
      // Ici on applique tels quels, mais tu peux les normaliser avant save si souhaité.

      // Appliquer les updates
      const repo = qr.manager.getRepository(Defense);
      for (const item of newOrder) {
        const defense = defenseByGroup.get(item.groupId)!;
        // si déjà égal, on skip
        if (defense.orderIndex !== item.orderIndex) {
          defense.orderIndex = item.orderIndex;
          await repo.save(defense); // save dans la transaction
        }
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