import { DataSource } from 'typeorm';
import { SimilarityEngine, SimilarityEngineOptions } from './similarity.engine';

export async function compareAgainstCandidates(
  ds: DataSource,
  submissionId: number,
  candidateIds: number[],
  opts?: SimilarityEngineOptions
) {
  const engine = new SimilarityEngine(ds, opts);
  const all: Awaited<ReturnType<typeof engine.compare>> = [];

  for (const cid of candidateIds) {
    if (!cid || cid === submissionId) continue;
    const scores = await engine.compare(submissionId, cid);
    all.push(...scores);
  }

  all.sort((a, b) => b.finalScore - a.finalScore);
  return all;
}
