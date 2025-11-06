import { DataSource } from 'typeorm';
import { generateAndSaveFingerprints } from './fingerprint/fingerprint.pipeline';
import type { Candidate } from './candidates/candidates.service';
import type { CompareAggResult } from './engine/compare-and-aggregate.pipeline';
import { AggregatorService } from './aggregator/aggregator.service';
import { DeliverableSubmission } from '../../entities/Entities';

export class AntiCheatService {
  constructor(private ds: DataSource) {}

  /**
   * Étapes :
   * 1) Extraction → 2) Fingerprints → 3) Persist
   * 4) Candidates → 5) Compare + Aggregate
   */
  async onSubmissionImported(submissionId: number,archivePath: string): Promise<{ saved: number; candidates: Candidate[]; similarity: CompareAggResult }> {
    return generateAndSaveFingerprints(this.ds, submissionId, archivePath);
  }
  
  async getSubmissionSummary(submissionId: number) {
    const sub = await this.ds.getRepository(DeliverableSubmission).findOneBy({ id: submissionId });
    const agg = new AggregatorService(this.ds);
    const topMatches = await agg.findTopMatches(submissionId, 10);
    return { submission: sub, topMatches };
  }
  
}
