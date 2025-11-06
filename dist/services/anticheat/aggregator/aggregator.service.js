"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AggregatorService = void 0;
const Entities_1 = require("../../../entities/Entities");
class AggregatorService {
    constructor(ds, opts = { threshold: 0.6, topPerPair: 3 }) {
        this.ds = ds;
        this.opts = opts;
    }
    /** Persiste les meilleurs "file↔file" par paire (sub1, sub2) selon seuil/topPerPair. */
    async persistPairScores(scores) {
        if (!scores.length)
            return 0;
        // 1) seuil
        const threshold = this.opts.threshold ?? 0;
        const filtered = scores.filter(s => s.finalScore >= threshold);
        // 2) canonicalise + regroupe
        const byPair = new Map();
        for (const s of filtered) {
            const { aId, bId, f1, f2 } = canonicalize(s.sub1, s.sub2, s.file1, s.file2);
            const k = `${aId}|${bId}`;
            (byPair.get(k) ?? byPair.set(k, []).get(k)).push({
                sub1: aId, sub2: bId, file1: f1, file2: f2,
                textScore: s.textScore, astScore: s.astScore, finalScore: s.finalScore,
            });
        }
        // 3) top N par paire → objets plats (PAS d’entity)
        const topN = this.opts.topPerPair ?? 3;
        const values = [];
        for (const arr of byPair.values()) {
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
        if (!values.length)
            return 0;
        // 4) UPSERT MySQL… sans “updateEntity” pour éviter l’erreur
        await this.ds
            .createQueryBuilder()
            .insert()
            .into(Entities_1.SimilarityResult)
            .values(values)
            .orUpdate(['textScore', 'astScore', 'finalScore'], // colonnes à mettre à jour
        ['submissionId1', 'submissionId2', 'filePath1', 'filePath2'] // clé unique logique
        )
            .updateEntity(false)
            .execute();
        return values.length;
    }
    /** Met à jour les champs agrégés (textScore, astScore, similarityScore) d'une soumission. */
    async updateSubmissionAggregates(submissionId) {
        const repo = this.ds.getRepository(Entities_1.SimilarityResult);
        const raw = await repo.createQueryBuilder('r')
            .select('MAX(r.textScore)', 'text')
            .addSelect('MAX(r.astScore)', 'ast')
            .addSelect('MAX(r.finalScore)', 'final')
            .where('r.submissionId1 = :id OR r.submissionId2 = :id', { id: submissionId })
            .getRawOne();
        const text = raw?.text != null ? Number(raw.text) : null;
        const ast = raw?.ast != null ? Number(raw.ast) : null;
        const final = raw?.final != null ? Number(raw.final) : null;
        await this.ds
            .createQueryBuilder()
            .update(Entities_1.DeliverableSubmission)
            .set({ textScore: text, astScore: ast, similarityScore: final })
            .where('id = :id', { id: submissionId })
            .execute();
        return { text, ast, final };
    }
    /** (Optionnel) Renvoie le top-k des matches pour affichage. */
    async findTopMatches(submissionId, limit = 10) {
        const repo = this.ds.getRepository(Entities_1.SimilarityResult);
        return repo.createQueryBuilder('r')
            .where('r.submissionId1 = :id OR r.submissionId2 = :id', { id: submissionId })
            .orderBy('r.finalScore', 'DESC')
            .limit(limit)
            .getMany();
    }
}
exports.AggregatorService = AggregatorService;
// --- helpers ---
function canonicalize(aId, bId, f1, f2) {
    if (aId > bId || (aId === bId && f1 > f2)) {
        return { aId: bId, bId: aId, f1: f2, f2: f1 };
    }
    return { aId, bId, f1, f2 };
}
