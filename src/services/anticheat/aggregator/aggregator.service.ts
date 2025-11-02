import { DataSource } from 'typeorm';
import type { PairScore } from '../engine/similarity.engine';
import { DeliverableSubmission, SimilarityResult } from '../../../entities/Entities';

export type AggregatorOptions = {
  threshold?: number;
  topPerPair?: number;
};

export class AggregatorService {
  constructor(
    private ds: DataSource,
    private opts: AggregatorOptions = { threshold: 0.0, topPerPair: 50 }
  ) {}

  async persistPairScores(scores: PairScore[]): Promise<number> {
    if (!scores.length) return 0;

    // on garde TOUT pour que la moyenne soit parlante
    const byPair = new Map<string, PairScore[]>();
    for (const s of scores) {
      const { aId, bId, f1, f2 } = canonicalize(s.sub1, s.sub2, s.file1, s.file2);
      const k = `${aId}|${bId}`;
      (byPair.get(k) ?? byPair.set(k, []).get(k)!).push({
        sub1: aId,
        sub2: bId,
        file1: f1,
        file2: f2,
        textScore: s.textScore,
        astScore: s.astScore,
        finalScore: s.finalScore,
      });
    }

    const topN = this.opts.topPerPair ?? 50;
    const values: Array<{
      submissionId1: number;
      submissionId2: number;
      filePath1: string;
      filePath2: string;
      textScore: number;
      astScore: number;
      finalScore: number;
    }> = [];

    for (const arr of byPair.values()) {
      // trie décroissant
      arr.sort((a, b) => b.finalScore - a.finalScore);
      for (const s of arr.slice(0, topN)) {
        values.push({
          submissionId1: s.sub1,
          submissionId2: s.sub2,
          filePath1: s.file1,
          filePath2: s.file2,
          textScore: s.textScore,
          astScore: s.astScore,
          finalScore: s.finalScore,
        });
      }
    }

    if (!values.length) return 0;

    await this.ds
      .createQueryBuilder()
      .insert()
      .into(SimilarityResult)
      .values(values)
      .orUpdate(
        ['textScore', 'astScore', 'finalScore'],
        ['submissionId1', 'submissionId2', 'filePath1', 'filePath2']
      )
      .updateEntity(false)
      .execute();

    return values.length;
  }

  // ICI → moyenne au lieu de MAX
  async updateSubmissionAggregates(submissionId: number): Promise<{
    text: number | null;
    ast: number | null;
    final: number | null;
  }> {
    const repo = this.ds.getRepository(SimilarityResult);

    const raw = await repo
      .createQueryBuilder('r')
      .select('AVG(r.textScore)', 'text')
      .addSelect('AVG(r.astScore)', 'ast')
      .addSelect('AVG(r.finalScore)', 'final')
      .where('r.submissionId1 = :id OR r.submissionId2 = :id', { id: submissionId })
      .getRawOne<{ text: string | null; ast: string | null; final: string | null }>();

    const text = raw?.text != null ? Number(raw.text) : null;
    const ast = raw?.ast != null ? Number(raw.ast) : null;
    const final = raw?.final != null ? Number(raw.final) : null;

    await this.ds
      .createQueryBuilder()
      .update(DeliverableSubmission)
      .set({ textScore: text, astScore: ast, similarityScore: final })
      .where('id = :id', { id: submissionId })
      .execute();

    return { text, ast, final };
  }

  async findTopMatches(submissionId: number, limit = 10) {
    const repo = this.ds.getRepository(SimilarityResult);
    return repo
      .createQueryBuilder('r')
      .where('r.submissionId1 = :id OR r.submissionId2 = :id', { id: submissionId })
      .orderBy('r.finalScore', 'DESC')
      .limit(limit)
      .getMany();
  }
}

function canonicalize(aId: number, bId: number, f1: string, f2: string) {
  if (aId > bId || (aId === bId && f1 > f2)) {
    return { aId: bId, bId: aId, f1: f2, f2: f1 };
  }
  return { aId, bId, f1, f2 };
}
