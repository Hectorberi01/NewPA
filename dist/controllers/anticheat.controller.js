"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiCheatController = void 0;
const anticheat_service_1 = require("../services/anticheat/anticheat.service");
const Entities_1 = require("../entities/Entities");
const similarity_engine_1 = require("../services/anticheat/engine/similarity.engine");
const aggregator_service_1 = require("../services/anticheat/aggregator/aggregator.service");
class AntiCheatController {
    constructor(ds) {
        this.ds = ds;
        // POST /api/submissions  (multipart/form-data: file, deliverableId, groupId)
        this.uploadAndAnalyze = async (req, res) => {
            try {
                const { deliverableId, groupId } = req.body;
                const file = req.file;
                if (!file)
                    return res.status(400).json({ error: 'file is required' });
                const subRepo = this.ds.getRepository(Entities_1.DeliverableSubmission);
                const submission = await subRepo.save(subRepo.create({
                    deliverable: { id: Number(deliverableId) },
                    group: { id: Number(groupId) },
                    filePath: file.path,
                    submittedAt: new Date(),
                    isLate: false,
                }));
                const anti = new anticheat_service_1.AntiCheatService(this.ds);
                const result = await anti.onSubmissionImported(submission.id, file.path);
                return res.status(201).json({ submissionId: submission.id, ...result });
            }
            catch (err) {
                console.error('uploadAndAnalyze error:', err);
                return res.status(500).json({ error: err?.message ?? 'Internal Server Error' });
            }
        };
        // GET /api/submissions/:id/similarity
        this.getSimilaritySummary = async (req, res) => {
            try {
                const id = Number(req.params.id);
                if (!Number.isInteger(id)) {
                    return res.status(400).json({ error: 'id invalide' });
                }
                const anti = new anticheat_service_1.AntiCheatService(this.ds);
                const data = await anti.getSubmissionSummary(id);
                return res.json(data);
            }
            catch (err) {
                console.error('getSimilaritySummary error:', err);
                return res.status(500).json({ error: err?.message ?? 'Internal Server Error' });
            }
        };
        // POST /api/similarity/compare  (JSON: { submissionId1, submissionId2 })
        this.comparePair = async (req, res) => {
            try {
                const a = Number(req.body?.submissionId1);
                const b = Number(req.body?.submissionId2);
                if (!Number.isInteger(a) || !Number.isInteger(b)) {
                    return res.status(400).json({ error: 'submissionId1 et submissionId2 doivent être des entiers.' });
                }
                if (a === b) {
                    return res.status(400).json({ error: 'Les deux ids doivent être différents.' });
                }
                // 1) Compare
                const engine = new similarity_engine_1.SimilarityEngine(this.ds, { fusion: 'max', alpha: 0.6, minHashes: 5, minScorePerKind: 0.02 });
                const pairScores = await engine.compare(a, b);
                // 2) Persiste les meilleurs scores + 3) mets à jour les agrégats des deux soumissions
                const agg = new aggregator_service_1.AggregatorService(this.ds, { threshold: 0.6, topPerPair: 3 });
                const savedResults = pairScores.length ? await agg.persistPairScores(pairScores) : 0;
                const [aggA, aggB] = await Promise.all([
                    agg.updateSubmissionAggregates(a),
                    agg.updateSubmissionAggregates(b),
                ]);
                // 4) Top matches pour affichage
                const [topA, topB] = await Promise.all([
                    agg.findTopMatches(a, 10),
                    agg.findTopMatches(b, 10),
                ]);
                return res.json({
                    compared: { submissionId1: a, submissionId2: b },
                    savedResults,
                    aggregates: { left: aggA, right: aggB },
                    topMatches: { left: topA, right: topB },
                    // optionnel: renvoyer seulement les 10 meilleurs détails
                    pairScores: pairScores.slice(0, 10),
                });
            }
            catch (err) {
                console.error('comparePair error:', err);
                return res.status(500).json({ error: err?.message ?? 'Internal Server Error' });
            }
        };
    }
}
exports.AntiCheatController = AntiCheatController;
