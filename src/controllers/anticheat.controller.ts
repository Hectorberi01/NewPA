import { Request, Response } from 'express';
import { DataSource } from 'typeorm';
import { AntiCheatService } from '../services/anticheat/anticheat.service';
import { DeliverableSubmission } from '../entities/Entities';
import { SimilarityEngine } from '../services/anticheat/engine/similarity.engine';
import { AggregatorService } from '../services/anticheat/aggregator/aggregator.service';


export class AntiCheatController {
  constructor(private ds: DataSource) {}

  /**
   * @swagger
   * /api/submissions:
   *   post:
   *     summary: Upload + analyse anti-plagiat d’une soumission
   *     tags: [AntiCheat]
   *     requestBody:
   *       required: true
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             required: [deliverableId, groupId, file]
   *             properties:
   *               deliverableId: { type: integer }
   *               groupId: { type: integer }
   *               file: { type: string, format: binary }
   *     responses:
   *       201: { description: Analysed }
   */
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
          filePath: file.path, // chemin absolu Multer
          submittedAt: new Date(),
          isLate: false,
        })
      );

      const anti = new AntiCheatService(this.ds);
      const result = await anti.onSubmissionImported(submission.id, file.path);

      return res.status(201).json({ submissionId: submission.id, ...result });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Internal Server Error' });
    }
  };

  /**
   * @swagger
   * /api/submissions/{id}/similarity:
   *   get:
   *     summary: Récupère le résumé de similarité et top matches
   *     tags: [AntiCheat]
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema: { type: integer }
   *     responses:
   *       200: { description: OK }
   */
  getSimilaritySummary = async (req: Request, res: Response) => {
    try {
      const anti = new AntiCheatService(this.ds);
      const data = await anti.getSubmissionSummary(Number(req.params.id));
      return res.json(data);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Internal Server Error' });
    }
  };

  /**
   * @swagger
   * /api/similarity/compare:
   *   post:
   *     summary: Compare manuellement deux soumissions et persiste les résultats
   *     tags: [AntiCheat]
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [submissionId1, submissionId2]
   *             properties:
   *               submissionId1: { type: integer }
   *               submissionId2: { type: integer }
   *     responses:
   *       200: { description: OK }
   */
  comparePair = async (req: Request, res: Response) => {
    try {
      const { submissionId1, submissionId2 } = req.body as { submissionId1: number; submissionId2: number };
      const engine = new SimilarityEngine(this.ds, { fusion: 'max', minHashes: 5, minScorePerKind: 0.02 });
      const pairScores = await engine.compare(Number(submissionId1), Number(submissionId2));

      const agg = new AggregatorService(this.ds, { threshold: 0.6, topPerPair: 3 });
      await agg.persistPairScores(pairScores);
      await agg.updateSubmissionAggregates(Number(submissionId1));
      await agg.updateSubmissionAggregates(Number(submissionId2));

      return res.json({ pairScores });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message ?? 'Internal Server Error' });
    }
  };
}
