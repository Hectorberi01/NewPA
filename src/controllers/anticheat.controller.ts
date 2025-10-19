import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AntiCheatService } from '../services/anticheat/anticheat.service';
import { DeliverableSubmission } from '../entities/Entities';
import { SimilarityEngine } from '../services/anticheat/engine/similarity.engine';
import { AggregatorService } from '../services/anticheat/aggregator/aggregator.service';

export class AntiCheatController {
  constructor(private ds: DataSource) {}

  // POST /api/submissions  (multipart/form-data: file, deliverableId, groupId)
  uploadAndAnalyze = async (req: Request, res: Response) => {
    try {
      const { deliverableId, groupId } = req.body;
      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: 'file is required' });

      const subRepo = this.ds.getRepository(DeliverableSubmission);
      const submission = await subRepo.save(
        subRepo.create({
          deliverable: { id: Number(deliverableId) },
          group: { id: Number(groupId) },
          filePath: file.path,
          submittedAt: new Date(),
          isLate: false,
        })
      );

      const anti = new AntiCheatService(this.ds);
      const result = await anti.onSubmissionImported(submission.id, file.path);

      return res.status(201).json({ submissionId: submission.id, ...result });
    } catch (err: any) {
      console.error('uploadAndAnalyze error:', err);
      return res.status(500).json({ error: err?.message ?? 'Internal Server Error' });
    }
  };

  // GET /api/submissions/:id/similarity
  getSimilaritySummary = async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id)) {
        return res.status(400).json({ error: 'id invalide' });
      }
      const anti = new AntiCheatService(this.ds);
      const data = await anti.getSubmissionSummary(id);
      return res.json(data);
    } catch (err: any) {
      console.error('getSimilaritySummary error:', err);
      return res.status(500).json({ error: err?.message ?? 'Internal Server Error' });
    }
  };

  // POST /api/similarity/compare  (JSON: { submissionId1, submissionId2 })
  comparePair = async (req: Request, res: Response) => {
    try {
      const a = Number((req.body as any)?.submissionId1);
      const b = Number((req.body as any)?.submissionId2);

      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        return res.status(400).json({ error: 'submissionId1 et submissionId2 doivent être des entiers.' });
      }
      if (a === b) {
        return res.status(400).json({ error: 'Les deux ids doivent être différents.' });
      }

      // 1) Compare
      const engine = new SimilarityEngine(this.ds, { fusion: 'max', alpha: 0.6, minHashes: 5, minScorePerKind: 0.02 });
      const pairScores = await engine.compare(a, b);

      // 2) Persiste les meilleurs scores + 3) mets à jour les agrégats des deux soumissions
      const agg = new AggregatorService(this.ds, { threshold: 0.6, topPerPair: 3 });
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
    } catch (err: any) {
      console.error('comparePair error:', err);
      return res.status(500).json({ error: err?.message ?? 'Internal Server Error' });
    }
  };
}
