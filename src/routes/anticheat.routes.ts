import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { DataSource } from 'typeorm';
import { AntiCheatController } from '../controllers/anticheat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function buildAntiCheatRouter(ds: DataSource) {
  const r = Router();
  const ctrl = new AntiCheatController(ds);

  const upload = multer({
    dest: path.resolve(process.cwd(), 'uploads'),
    limits: { fileSize: 50 * 1024 * 1024 },
  });

  // Routes
  r.post('/submissions', authMiddleware, upload.single('file'), ctrl.uploadAndAnalyze);
  r.get('/submissions/:id/similarity', authMiddleware, ctrl.getSimilaritySummary);
  r.post('/similarity/compare', authMiddleware, ctrl.comparePair);

  return r;
}
