import { DataSource } from 'typeorm';
import { compareAgainstCandidates } from './compare-candidates.pipeline';
import { SimilarityEngineOptions } from './similarity.engine';
import { AggregatorService, AggregatorOptions } from '../aggregator/aggregator.service';

export type CompareAggResult = {
  savedResults: number;
  aggregates: { text: number | null; ast: number | null; final: number | null };
  topMatches: any[];
};

export async function compareAndAggregate(
  ds: DataSource,
  submissionId: number,
  candidateIds: number[],
  engineOpts: SimilarityEngineOptions = { fusion: 'max', alpha: 0.6, minHashes: 5, minScorePerKind: 0.02 },
  aggOpts: AggregatorOptions = { threshold: 0.6, topPerPair: 3 }
): Promise<CompareAggResult> {
  // 1) Compare
  const pairScores = await compareAgainstCandidates(ds, submissionId, candidateIds, engineOpts);

  // 2) Agrège
  const agg = new AggregatorService(ds, aggOpts);
  const savedResults = await agg.persistPairScores(pairScores);
  const aggregates   = await agg.updateSubmissionAggregates(submissionId);
  const topMatches   = await agg.findTopMatches(submissionId, 10);

  return { savedResults, aggregates, topMatches };
}
