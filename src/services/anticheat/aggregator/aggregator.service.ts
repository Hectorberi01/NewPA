import { DataSource } from 'typeorm';
import type { PairScore } from '../engine/similarity.engine';
import { DeliverableSubmission, SimilarityResult } from '../../../entities/Entities';

export type AggregatorOptions = {
  threshold?: number;    // score min à persister
  topPerPair?: number;   // nb max de fichiers à garder par paire de soumissions
};

export class AggregatorService {
  constructor(
    private ds: DataSource,
    private opts: AggregatorOptions = { threshold: 0.6, topPerPair: 3 }
  ) {}

  /** Persiste les meilleurs "file↔file" par paire (sub1, sub2) selon seuil/topPerPair. */
  async persistPairScores(scores: PairScore[]): Promise<number> {
    if (!scores.length) return 0;

    // 1) Filtre seuil
    const threshold = this.opts.threshold ?? 0;
    const filtered = scores.filter(s => s.finalScore >= threshold);

    // 2) Regroupe par paire de soumissions (ordre canonique)
    const byPair = new Map<string, PairScore[]>();
    for (const s of filtered) {
      const { aId, bId, f1, f2 } = canonicalize(s.sub1, s.sub2, s.file1, s.file2);
      const k = `${aId}|${bId}`;
      const canon: PairScore = { sub1: aId, sub2: bId, file1: f1, file2: f2, textScore: s.textScore, astScore: s.astScore, finalScore: s.finalScore };
      (byPair.get(k) ?? byPair.set(k, []).get(k)!).push(canon);
    }

    // 3) Pour chaque paire, garde top N par finalScore
    const toSave: SimilarityResult[] = [];
    const repo = this.ds.getRepository(SimilarityResult);
    const topN = this.opts.topPerPair ?? 3;

    for (const arr of byPair.values()) {
      arr.sort((a, b) => b.finalScore - a.finalScore);
      const slice = arr.slice(0, topN);
      for (const s of slice) {
        toSave.push(
          repo.create({
            submissionId1: s.sub1,
            submissionId2: s.sub2,
            filePath1: s.file1,
            filePath2: s.file2,
            textScore: s.textScore,
            astScore: s.astScore,
            finalScore: s.finalScore,
          })
        );
      }
    }

    if (!toSave.length) return 0;

    // 4) Upsert via contrainte unique (submissionId1,2 + filePath1,2)
    await repo.upsert(toSave, ['submissionId1', 'submissionId2', 'filePath1', 'filePath2']);
    return toSave.length;
  }

  /** Met à jour les champs agrégés (textScore, astScore, similarityScore) d'une soumission. */
  async updateSubmissionAggregates(submissionId: number): Promise<{ text: number|null; ast: number|null; final: number|null; }> {
    const repo = this.ds.getRepository(SimilarityResult);

    // MAX des scores pour cette soumission (qu’elle soit à gauche ou à droite)
    const qb = repo.createQueryBuilder('r')
      .select('MAX(r.textScore)', 'text')
      .addSelect('MAX(r.astScore)', 'ast')
      .addSelect('MAX(r.finalScore)', 'final')
      .where('r.submissionId1 = :id OR r.submissionId2 = :id', { id: submissionId });

    const raw = await qb.getRawOne<{ text: string|null; ast: string|null; final: string|null }>();
    const text = raw?.text ? Number(raw.text) : null;
    const ast  = raw?.ast  ? Number(raw.ast)  : null;
    const final= raw?.final? Number(raw.final): null;

    await this.ds.getRepository(DeliverableSubmission).update(
      { id: submissionId },
      { textScore: text ?? null, astScore: ast ?? null, similarityScore: final ?? null }
    );

    return { text, ast, final };
  }

  /** (Optionnel) Renvoie le top-k des matches pour affichage. */
  async findTopMatches(submissionId: number, limit = 10) {
    const repo = this.ds.getRepository(SimilarityResult);
    return repo.createQueryBuilder('r')
      .where('r.submissionId1 = :id OR r.submissionId2 = :id', { id: submissionId })
      .orderBy('r.finalScore', 'DESC')
      .limit(limit)
      .getMany();
  }
}

// --- helpers ---
function canonicalize(aId: number, bId: number, f1: string, f2: string) {
  if (aId > bId || (aId === bId && f1 > f2)) {
    return { aId: bId, bId: aId, f1: f2, f2: f1 };
  }
  return { aId, bId, f1, f2 };
}
