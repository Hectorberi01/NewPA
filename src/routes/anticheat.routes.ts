// src/routes/anticheat.routes.ts
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import { AntiCheatController } from '../controllers/anticheat.controller';
import { authMiddleware } from '../middleware/auth.middleware';

export function buildAntiCheatRouter(ds: DataSource) {
  const r = Router();
  const ctrl = new AntiCheatController(ds);

  // Dossier d’upload garanti présent
  const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });

  // Stockage qui conserve l’extension
  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase(); // ex: .zip
      const name = `file-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
      cb(null, name);
    },
  });

  const allowed = new Set(['.zip', '.txt', '.js', '.ts', '.java', '.py', '.cpp', '.pdf', '.docx', '.xlsx']);

  const upload = multer({
    storage,
    limits: { fileSize: 50 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowed.has(ext)) return cb(new Error(`Extension non supportée: ${ext}`));
      cb(null, true);
    },
  });

  // Routes
  r.post('/submissions', authMiddleware, upload.single('file'), ctrl.uploadAndAnalyze);
  r.get('/submissions/:id/similarity', authMiddleware, ctrl.getSimilaritySummary);
  r.post('/similarity/compare', authMiddleware, ctrl.comparePair);

  return r;
}
