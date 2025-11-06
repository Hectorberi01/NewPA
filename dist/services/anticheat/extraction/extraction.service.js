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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExtractionServiceImpl = void 0;
const adm_zip_1 = __importDefault(require("adm-zip"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs/promises"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const XLSX = __importStar(require("xlsx"));
const ALLOWED_EXT = new Set([
    ".txt", ".js", ".ts", ".java", ".py", ".cpp", ".pdf", ".docx", ".xlsx",
]);
const EXT_LANG = {
    ".txt": "txt",
    ".js": "js",
    ".ts": "ts",
    ".java": "java",
    ".py": "py",
    ".cpp": "cpp",
    ".pdf": "pdf",
    ".docx": "docx",
    ".xlsx": "xlsx",
};
const DEFAULT_LIMITS = {
    maxArchiveBytes: 100 * 1024 * 1024, // 100 MB
    maxEntryBytes: 8 * 1024 * 1024, // 8 MB par entrée
    maxEntries: 2000, // limite de fichiers
    maxUncompressedBytes: 300 * 1024 * 1024, // 300 MB total non compressé
};
class ExtractionServiceImpl {
    constructor(limits = DEFAULT_LIMITS) {
        this.limits = limits;
    }
    async extract(archivePath, submissionId) {
        const stat = await fs.stat(archivePath);
        if (stat.size > this.limits.maxArchiveBytes) {
            throw new Error(`Archive trop volumineuse (${stat.size} > ${this.limits.maxArchiveBytes})`);
        }
        const ext = path_1.default.extname(archivePath).toLowerCase();
        if (ext === ".zip") {
            return this.extractFromZip(archivePath, submissionId);
        }
        else {
            // fichier simple
            return [await this.extractOneFile(archivePath, submissionId, path_1.default.basename(archivePath))];
        }
    }
    async extractFromZip(archivePath, submissionId) {
        const zip = new adm_zip_1.default(archivePath);
        const entries = zip.getEntries();
        if (entries.length > this.limits.maxEntries) {
            throw new Error(`Trop d’entrées dans le zip (${entries.length} > ${this.limits.maxEntries})`);
        }
        let totalUncompressed = 0;
        const out = [];
        for (const e of entries) {
            if (e.isDirectory)
                continue;
            // path traversal guard
            const rel = this.normalizeRelPath(e.entryName);
            if (!rel)
                continue; // ignore chemins suspects
            const ext = path_1.default.extname(rel).toLowerCase();
            if (!ALLOWED_EXT.has(ext))
                continue; // ignore types non gérés
            const size = e.header.size;
            totalUncompressed += size;
            if (totalUncompressed > this.limits.maxUncompressedBytes) {
                throw new Error(`Zip non compressé trop volumineux (>${this.limits.maxUncompressedBytes})`);
            }
            if (size > this.limits.maxEntryBytes) {
                // skip lourd (ou lève une erreur selon ta politique)
                continue;
            }
            const buf = e.getData();
            const { content, language } = await this.bufferToText(buf, ext);
            out.push({
                submissionId,
                filePath: rel,
                language,
                content: this.cleanText(content),
                size,
                mime: this.guessMime(ext),
            });
        }
        return out;
    }
    async extractOneFile(absolutePath, submissionId, relName) {
        const ext = path_1.default.extname(absolutePath).toLowerCase();
        if (!ALLOWED_EXT.has(ext)) {
            throw new Error(`Extension non supportée: ${ext}`);
        }
        const stat = await fs.stat(absolutePath);
        if (stat.size > this.limits.maxEntryBytes) {
            throw new Error(`Fichier trop volumineux (${stat.size} > ${this.limits.maxEntryBytes})`);
        }
        const buf = await fs.readFile(absolutePath);
        const { content, language } = await this.bufferToText(buf, ext);
        return {
            submissionId,
            filePath: relName,
            language,
            content: this.cleanText(content),
            size: stat.size,
            mime: this.guessMime(ext),
        };
    }
    // --- Helpers ---
    normalizeRelPath(p) {
        // retire ../, \, etc. et force un chemin relatif safe
        const normalized = path_1.default.posix.normalize(p.replace(/\\/g, "/"));
        if (normalized.startsWith("../") || path_1.default.isAbsolute(normalized))
            return null;
        return normalized;
    }
    guessMime(ext) {
        switch (ext) {
            case ".txt": return "text/plain";
            case ".js": return "text/javascript";
            case ".ts": return "text/typescript";
            case ".java": return "text/x-java-source";
            case ".py": return "text/x-python";
            case ".cpp": return "text/x-c++src";
            case ".pdf": return "application/pdf";
            case ".docx": return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            case ".xlsx": return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
            default: return undefined;
        }
    }
    async bufferToText(buf, ext) {
        const lang = EXT_LANG[ext] ?? "txt";
        switch (ext) {
            case ".txt":
            case ".js":
            case ".ts":
            case ".java":
            case ".py":
            case ".cpp":
                return { content: buf.toString("utf-8"), language: lang };
            case ".pdf": {
                // pdf-parse peut être coûteux; garde un timeout côté appelant si besoin
                const data = await (0, pdf_parse_1.default)(buf);
                return { content: data.text || "", language: lang };
            }
            case ".docx": {
                const res = await mammoth_1.default.extractRawText({ buffer: buf });
                return { content: res.value || "", language: lang };
            }
            case ".xlsx": {
                const wb = XLSX.read(buf, { type: "buffer" });
                let text = "";
                wb.SheetNames.forEach(s => { text += XLSX.utils.sheet_to_csv(wb.Sheets[s]); });
                return { content: text, language: lang };
            }
            default:
                return { content: "", language: lang };
        }
    }
    cleanText(txt) {
        // normalise fin de lignes, enlève nulls/bidi, trim large
        return txt
            .replace(/\r\n?/g, "\n")
            .replace(/\u0000/g, "")
            .replace(/[\u202A-\u202E]/g, "")
            .slice(0, 5000000); // borne de sécurité
    }
}
exports.ExtractionServiceImpl = ExtractionServiceImpl;
