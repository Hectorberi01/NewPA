// src/services/anticheat/anticheat.service.ts
import { DataSource } from 'typeorm';
import { generateAndSaveFingerprints } from './fingerprint/fingerprint.pipeline';
import type { Candidate } from './candidates/candidates.service';
import type { CompareAggResult } from './engine/compare-and-aggregate.pipeline';
import { AggregatorService } from './aggregator/aggregator.service';
import { DeliverableSubmission } from '../../entities/Entities';
import { findCandidatesForSubmissionRunner } from './candidates/candidates.pipeline';
import { compareAndAggregate } from './engine/compare-and-aggregate.pipeline';

export class AntiCheatService {
  constructor(private ds: DataSource) {}

  async onSubmissionImported(
    submissionId: number,
    archivePath: string
  ): Promise<{ saved: number; candidates: Candidate[]; similarity: CompareAggResult }> {
    return generateAndSaveFingerprints(this.ds, submissionId, archivePath);
  }

  async getSubmissionSummary(submissionId: number) {
    const sub = await this.ds.getRepository(DeliverableSubmission).findOneBy({ id: submissionId });
    const agg = new AggregatorService(this.ds);
    const topMatches = await agg.findTopMatches(submissionId, 10);
    return { submission: sub, topMatches };
  }

  /**
   * FULL SCAN d’un livrable :
   * - récupère TOUTES les submissions de ce livrable
   * - pour chacune : cherche des candidats ≠ elle-même
   * - compare + agrège en utilisant un seuil bas (0) pour ne pas garder que les 100%
   */
  async runFullScanForDeliverable(deliverableId: number) {
    const subRepo = this.ds.getRepository(DeliverableSubmission);
    const subs = await subRepo.find({
      where: { deliverable: { id: deliverableId } },
      select: ['id'],
    });

    let comparisons = 0;
    let suspicious = 0;

    for (const s of subs) {
      // on reprend ton pipeline existant
      const candidates = await findCandidatesForSubmissionRunner(this.ds, s.id, 200, 5);
      const candIds = candidates.map(c => c.submissionId).filter(id => id !== s.id);

      if (!candIds.length) continue;

      const { topMatches } = await compareAndAggregate(
        this.ds,
        s.id,
        candIds,
        { fusion: 'max', alpha: 0.6, minHashes: 5, minScorePerKind: 0.0 },
        { threshold: 0.0, topPerPair: 50 }
      );

      comparisons += candIds.length;
      if (topMatches.some(m => m.finalScore >= 0.6)) suspicious++;
    }

    return {
      totalSubmissions: subs.length,
      processed: subs.length,
      comparisons,
      suspicious,
    };
  }
}
