import { Repository } from 'typeorm';
import { AppDataSource } from '../database/data-source';
import { Defense,Group } from '../entities/Entities';
import { PDFGeneratorService } from '../utils/pdf-generator.service';

export class DefenseService {
  private defenseRepository: Repository<Defense>;
  private groupRepository: Repository<Group>;

  constructor() {
    this.defenseRepository = AppDataSource.getRepository(Defense);
    this.groupRepository = AppDataSource.getRepository(Group);
  }

  async scheduleDefenses(
    projectId: number,
    startDateTime: Date,
    durationPerGroup: number // en minutes
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
        orderIndex: i + 1
      });

      defenses.push(await this.defenseRepository.save(defense));

      // Préparer l'heure suivante (avec pause de 5 minutes)
      currentTime.setMinutes(currentTime.getMinutes() + durationPerGroup + 5);
    }

    return defenses;
  }

  async updateDefenseOrder(projectId: number, newOrder: { groupId: number; orderIndex: number }[]): Promise<Defense[]> {
    const defenses = await this.defenseRepository.find({
      where: { project: { id: projectId } },
      relations: ['group']
    });

    for (const orderUpdate of newOrder) {
      const defense = defenses.find(d => d.group.id === orderUpdate.groupId);
      if (defense) {
        defense.orderIndex = orderUpdate.orderIndex;
        await this.defenseRepository.save(defense);
      }
    }

    return await this.defenseRepository.find({
      where: { project: { id: projectId } },
      relations: ['group', 'group.members'],
      order: { orderIndex: 'ASC' }
    });
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