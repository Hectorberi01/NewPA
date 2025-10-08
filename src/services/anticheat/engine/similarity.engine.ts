import { DataSource } from 'typeorm';
import { SubmissionFingerprint } from '../../../entities/Entities';

export type PairScore = {
  sub1: number;
  sub2: number;
  file1: string;
  file2: string;
  textScore: number;
  astScore: number;
  finalScore: number;
};

export type SimilarityEngineOptions = {
  fusion?: 'max' | 'weighted';
  alpha?: number;           // poids AST si 'weighted' (ex: 0.6)
  minHashes?: number;       // ignore empreintes trop petites
  minScorePerKind?: number; // ne garde un kind que si score >= (ex: 0.05)
};

export class SimilarityEngine {
  constructor(
    private ds: DataSource,
    private opts: SimilarityEngineOptions = { fusion: 'max', alpha: 0.6, minHashes: 5, minScorePerKind: 0 }
  ) {}

  async compare(submissionId1: number, submissionId2: number): Promise<PairScore[]> {
    const repo = this.ds.getRepository(SubmissionFingerprint);

    const [fpsA, fpsB] = await Promise.all([
      repo.find({ where: { submissionId: submissionId1 }, select: ['submissionId','filePath','kind','language','hashes'] }),
      repo.find({ where: { submissionId: submissionId2 }, select: ['submissionId','filePath','kind','language','hashes'] }),
    ]);
    if (!fpsA.length || !fpsB.length) return [];

    // index par (kind|language)
    const keyBy = (fp: SubmissionFingerprint) => `${fp.kind}|${fp.language ?? ''}`;
    const groupsA = groupBy(fpsA, keyBy);
    const groupsB = groupBy(fpsB, keyBy);

    // cumule text/ast par paire de fichiers
    const pairMap = new Map<string, { textScore: number; astScore: number; file1: string; file2: string }>();

    for (const [key, faList] of groupsA.entries()) {
      const fbList = groupsB.get(key);
      if (!fbList) continue;

      for (const fa of faList) {
        const setA = new Set<number>(fa.hashes ?? []);
        if (setA.size < (this.opts.minHashes ?? 0)) continue;

        for (const fb of fbList) {
          const setB = new Set<number>(fb.hashes ?? []);
          if (setB.size < (this.opts.minHashes ?? 0)) continue;

          const j = jaccard(setA, setB);
          if (j < (this.opts.minScorePerKind ?? 0)) continue;

          const k = `${fa.filePath}→${fb.filePath}`;
          const rec = pairMap.get(k) ?? { textScore: 0, astScore: 0, file1: fa.filePath, file2: fb.filePath };

          if (fa.kind === 'text') rec.textScore = Math.max(rec.textScore, j);
          else if (fa.kind === 'ast') rec.astScore = Math.max(rec.astScore, j);

          pairMap.set(k, rec);
        }
      }
    }

    const out: PairScore[] = [];
    for (const rec of pairMap.values()) {
      const final =
        (this.opts.fusion ?? 'max') === 'weighted'
          ? (this.opts.alpha ?? 0.6) * rec.astScore + (1 - (this.opts.alpha ?? 0.6)) * rec.textScore
          : Math.max(rec.textScore, rec.astScore);

      out.push({
        sub1: submissionId1,
        sub2: submissionId2,
        file1: rec.file1,
        file2: rec.file2,
        textScore: rec.textScore,
        astScore: rec.astScore,
        finalScore: final,
      });
    }

    // tri décroissant par final
    out.sort((a, b) => b.finalScore - a.finalScore);
    return out;
  }
}

// --- helpers ---
function groupBy<T>(arr: T[], fn: (x: T) => string): Map<string, T[]> {
  const m = new Map<string, T[]>();
  for (const x of arr) {
    const k = fn(x);
    if (!m.has(k)) m.set(k, []);
    m.get(k)!.push(x);
  }
  return m;
}

function jaccard<T>(a: Set<T>, b: Set<T>): number {
  if (!a.size && !b.size) return 0;
  let inter = 0;
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) inter++;
  return inter / (a.size + b.size - inter);
}
