// src/modules/anticheat/fingerprint/fingerprint.pipeline.ts
import { DataSource } from 'typeorm';
import { ExtractionServiceImpl } from '../extraction/extraction.service';
import { buildFingerprints, ExtractedFile } from './index';
import { findCandidatesForSubmissionRunner } from '../candidates/candidates.pipeline';
import type { Candidate } from '../candidates/candidates.service';
import { SubmissionFingerprint } from '../../../entities/Entities';
import { compareAndAggregate } from '../engine/compare-and-aggregate.pipeline';

type Aggregates = { text: number | null; ast: number | null; final: number | null };
type CompareAggResult = { savedResults: number; aggregates: Aggregates; topMatches: any[] };

export async function generateAndSaveFingerprints(
  ds: DataSource,
  submissionId: number,
  archivePath: string
): Promise<{ saved: number; candidates: Candidate[]; similarity: CompareAggResult }> {
  // 1) Extraction
  const extractor = new ExtractionServiceImpl();
  const files: ExtractedFile[] = await extractor.extract(archivePath, submissionId);

  // 2) Empreintes
  const fps = await buildFingerprints(files);

  // 3) Persist
  const repo = ds.getRepository(SubmissionFingerprint);
  if (fps.length) {
    await repo.save(
      fps.map(fp =>
        repo.create({
          submissionId: fp.submissionId,
          filePath: fp.filePath,
          kind: fp.kind,
          hashes: fp.hashes,
          stats: fp.stats,
          language: fp.language,
          version: fp.version,
        })
      )
    );
  }

  // 4) Candidats
  const candidates = await findCandidatesForSubmissionRunner(ds, submissionId);

  // 5) Compare + agrège
  const candIds = candidates.map(c => c.submissionId);
  const similarity = await compareAndAggregate(
    ds,
    submissionId,
    candIds,
    { fusion: 'max', alpha: 0.6, minHashes: 5, minScorePerKind: 0.02 }, // SimilarityEngine opts
    { threshold: 0.6, topPerPair: 3 }                                    // Aggregator opts
  );

  return { saved: fps.length, candidates, similarity };
}
