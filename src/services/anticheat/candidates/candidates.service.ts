import { DataSource } from 'typeorm';
import { SubmissionFingerprint } from '../../../entities/Entities';

export type Candidate = {
  submissionId: number;
  score: number; // somme des overlaps
  reasons: Array<{ kind: 'text'|'ast'; language?: string; overlap: number; files: number }>;
};

export type CandidateOptions = {
  topK?: number;          // nb max de candidats
  minOverlap?: number;    // overlap minimal pour garder un candidat
};

export class FullScanCandidatesService {
  constructor(private ds: DataSource) {}

  async findCandidatesForSubmission(
    submissionId: number,
    opts: CandidateOptions = {}
  ): Promise<Candidate[]> {
    const topK = opts.topK ?? 200;
    const minOverlap = opts.minOverlap ?? 10;

    const repo = this.ds.getRepository(SubmissionFingerprint);

    // 1) empreintes de la soumission (par fichier)
    const mine = await repo.find({
      where: { submissionId },
      select: ['submissionId','filePath','kind','language','hashes','version']
    });
    if (!mine.length) return [];

    // Regroupe par (kind, language) pour limiter le corpus
    const groups = groupBy(mine, fp => `${fp.kind}|${fp.language ?? ''}`);

    // 2) map cumul des overlaps par autre soumission
    const acc = new Map<number, { score: number; details: Candidate['reasons'] }>();

    for (const [key, myFps] of Object.entries(groups)) {
      const [kind, lang] = key.split('|');
      // Corpus filtré par kind/lang (on évite de charger tout)
      const corpus = await repo
        .createQueryBuilder('fp')
        .select(['fp.submissionId','fp.filePath','fp.hashes'])
        .where('fp.submissionId != :id', { id: submissionId })
        .andWhere('fp.kind = :kind', { kind })
        .andWhere('(fp.language IS NULL OR fp.language = :lang)', { lang: lang || null })
        .getMany();

      if (!corpus.length) continue;

      // Prépare mes sets pour intersections
      const mySets = myFps.map(fp => new Set<number>(fp.hashes ?? []));

      // 3) calcule overlap brut (somme des intersections)
      for (const other of corpus) {
        const otherSet = new Set<number>(other.hashes ?? []);
        let overlap = 0;
        for (const s of mySets) overlap += intersectionCount(s, otherSet);

        if (overlap >= minOverlap) {
          const entry = acc.get(other.submissionId) ?? { score: 0, details: [] };
          entry.score += overlap;
          entry.details.push({
            kind: kind as 'text'|'ast',
            language: lang || undefined,
            overlap,
            files: myFps.length
          });
          acc.set(other.submissionId, entry);
        }
      }
    }

    // 4) trie + limite
    const out: Candidate[] = Array.from(acc.entries())
      .map(([submissionId, v]) => ({ submissionId, score: v.score, reasons: v.details }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);

    return out;
  }
}

// --- helpers ---
function groupBy<T>(arr: T[], fn: (x: T)=>string): Record<string, T[]> {
  return arr.reduce((m, x) => {
    const k = fn(x);
    (m[k] ||= []).push(x);
    return m;
  }, {} as Record<string, T[]>);
}

function intersectionCount<T>(a: Set<T>, b: Set<T>): number {
  let cnt = 0;
  // itère sur le plus petit set
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  for (const x of small) if (large.has(x)) cnt++;
  return cnt;
}
