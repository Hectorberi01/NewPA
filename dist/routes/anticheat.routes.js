"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildAntiCheatRouter = void 0;
// src/routes/anticheat.routes.ts
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs"));
const anticheat_controller_1 = require("../controllers/anticheat.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
function buildAntiCheatRouter(ds) {
    const r = (0, express_1.Router)();
    const ctrl = new anticheat_controller_1.AntiCheatController(ds);
    // Dossier d’upload garanti présent
    const UPLOAD_DIR = path_1.default.resolve(process.cwd(), 'uploads');
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    // Stockage qui conserve l’extension
    const storage = multer_1.default.diskStorage({
        destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
        filename: (_req, file, cb) => {
            const ext = path_1.default.extname(file.originalname).toLowerCase(); // ex: .zip
            const name = `file-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`;
            cb(null, name);
        },
    });
    const allowed = new Set(['.zip', '.txt', '.js', '.ts', '.java', '.py', '.cpp', '.pdf', '.docx', '.xlsx']);
    const upload = (0, multer_1.default)({
        storage,
        limits: { fileSize: 50 * 1024 * 1024 },
        fileFilter: (_req, file, cb) => {
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            if (!allowed.has(ext))
                return cb(new Error(`Extension non supportée: ${ext}`));
            cb(null, true);
        },
    });
    // Routes
    r.post('/submissions', auth_middleware_1.authMiddleware, upload.single('file'), ctrl.uploadAndAnalyze);
    r.get('/submissions/:id/similarity', auth_middleware_1.authMiddleware, ctrl.getSimilaritySummary);
    r.post('/similarity/compare', auth_middleware_1.authMiddleware, ctrl.comparePair);
    return r;
}
exports.buildAntiCheatRouter = buildAntiCheatRouter;
