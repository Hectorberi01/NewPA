"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FullScanCandidatesService = void 0;
const Entities_1 = require("../../../entities/Entities");
class FullScanCandidatesService {
    constructor(ds) {
        this.ds = ds;
    }
    async findCandidatesForSubmission(submissionId, opts = {}) {
        const topK = opts.topK ?? 200;
        const minOverlap = opts.minOverlap ?? 10;
        const repo = this.ds.getRepository(Entities_1.SubmissionFingerprint);
        // 1) empreintes de la soumission (par fichier)
        const mine = await repo.find({
            where: { submissionId },
            select: ['submissionId', 'filePath', 'kind', 'language', 'hashes', 'version']
        });
        if (!mine.length)
            return [];
        // Regroupe par (kind, language) pour limiter le corpus
        const groups = groupBy(mine, fp => `${fp.kind}|${fp.language ?? ''}`);
        // 2) map cumul des overlaps par autre soumission
        const acc = new Map();
        for (const [key, myFps] of Object.entries(groups)) {
            const [kind, lang] = key.split('|');
            // Corpus filtré par kind/lang (on évite de charger tout)
            const corpus = await repo
                .createQueryBuilder('fp')
                .select(['fp.submissionId', 'fp.filePath', 'fp.hashes'])
                .where('fp.submissionId != :id', { id: submissionId })
                .andWhere('fp.kind = :kind', { kind })
                .andWhere('(fp.language IS NULL OR fp.language = :lang)', { lang: lang || null })
                .getMany();
            if (!corpus.length)
                continue;
            // Prépare mes sets pour intersections
            const mySets = myFps.map(fp => new Set(fp.hashes ?? []));
            // 3) calcule overlap brut (somme des intersections)
            for (const other of corpus) {
                const otherSet = new Set(other.hashes ?? []);
                let overlap = 0;
                for (const s of mySets)
                    overlap += intersectionCount(s, otherSet);
                if (overlap >= minOverlap) {
                    const entry = acc.get(other.submissionId) ?? { score: 0, details: [] };
                    entry.score += overlap;
                    entry.details.push({
                        kind: kind,
                        language: lang || undefined,
                        overlap,
                        files: myFps.length
                    });
                    acc.set(other.submissionId, entry);
                }
            }
        }
        // 4) trie + limite
        const out = Array.from(acc.entries())
            .map(([submissionId, v]) => ({ submissionId, score: v.score, reasons: v.details }))
            .sort((a, b) => b.score - a.score)
            .slice(0, topK);
        return out;
    }
}
exports.FullScanCandidatesService = FullScanCandidatesService;
// --- helpers ---
function groupBy(arr, fn) {
    return arr.reduce((m, x) => {
        const k = fn(x);
        (m[k] || (m[k] = [])).push(x);
        return m;
    }, {});
}
function intersectionCount(a, b) {
    let cnt = 0;
    // itère sur le plus petit set
    const [small, large] = a.size <= b.size ? [a, b] : [b, a];
    for (const x of small)
        if (large.has(x))
            cnt++;
    return cnt;
}
