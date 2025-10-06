import { DataSource } from 'typeorm';
import { FullScanCandidatesService } from './candidates.service';

export async function findCandidatesForSubmissionRunner(
  ds: DataSource,
  submissionId: number,
  topK = 100,
  minOverlap = 10
) {
  const svc = new FullScanCandidatesService(ds);
  return svc.findCandidatesForSubmission(submissionId, { topK, minOverlap });
}
