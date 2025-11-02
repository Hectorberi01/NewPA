import { DataSource } from 'typeorm'
import { ExtractionServiceImpl } from '../extraction/extraction.service'
import { buildFingerprints, ExtractedFile } from './index'
import { findCandidatesForSubmissionRunner } from '../candidates/candidates.pipeline'
import type { Candidate } from '../candidates/candidates.service'
import { SubmissionFingerprint } from '../../../entities/Entities'
import { compareAndAggregate } from '../engine/compare-and-aggregate.pipeline'
import { AggregatorService } from '../aggregator/aggregator.service'

type Aggregates = { text: number | null; ast: number | null; final: number | null }
type CompareAggResult = { savedResults: number; aggregates: Aggregates; topMatches: any[] }

export async function generateAndSaveFingerprints(
  ds: DataSource,
  submissionId: number,
  archivePath: string
): Promise<{ saved: number; candidates: Candidate[]; similarity: CompareAggResult }> {
  // 1) extraction
  const extractor = new ExtractionServiceImpl()
  const files: ExtractedFile[] = await extractor.extract(archivePath, submissionId)

  // 2) empreintes
  const fps = await buildFingerprints(files)

  // 3) on vire les anciennes empreintes de cette soumission (ré-upload)
  const fpRepo = ds.getRepository(SubmissionFingerprint)
  await fpRepo
    .createQueryBuilder()
    .delete()
    .from(SubmissionFingerprint)
    .where('submissionId = :id', { id: submissionId })
    .execute()

  // 4) on sauvegarde les nouvelles
  if (fps.length) {
    await fpRepo.save(
      fps.map(fp =>
        fpRepo.create({
          submissionId: fp.submissionId,
          filePath: fp.filePath,
          kind: fp.kind,
          hashes: fp.hashes,
          stats: fp.stats,
          language: fp.language,
          version: fp.version
        })
      )
    )
  }

  // 5) on cherche qui est proche
  const candidates = await findCandidatesForSubmissionRunner(ds, submissionId)
  const candIds = candidates.map(c => c.submissionId)

  // 6) on compare + on agrège pour CETTE soumission
  const similarity = await compareAndAggregate(
    ds,
    submissionId,
    candIds,
    { fusion: 'max', alpha: 0.6, minHashes: 5, minScorePerKind: 0.02 },
    { threshold: 0.6, topPerPair: 3 }
  )

  // 7) 🔴 important : on met à jour aussi les agrégats des AUTRES soumissions touchées
  const agg = new AggregatorService(ds, { threshold: 0.6, topPerPair: 3 })
  await Promise.all(candIds.map(id => agg.updateSubmissionAggregates(id)))

  return { saved: fps.length, candidates, similarity }
}
