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
exports.SimilarityService = void 0;
const crypto_1 = require("crypto");
const fast_levenshtein_1 = __importDefault(require("fast-levenshtein"));
const path_1 = __importDefault(require("path"));
const fs = __importStar(require("fs/promises"));
const pdf_parse_1 = __importDefault(require("pdf-parse"));
const mammoth_1 = __importDefault(require("mammoth"));
const XLSX = __importStar(require("xlsx"));
const adm_zip_1 = __importDefault(require("adm-zip"));
const TEMP_DIR = path_1.default.join(__dirname, '../../tmp');
class SimilarityService {
    static calculateHashSimilarity(content1, content2) {
        const hash1 = (0, crypto_1.createHash)('md5').update(content1).digest('hex');
        const hash2 = (0, crypto_1.createHash)('md5').update(content2).digest('hex');
        return hash1 === hash2 ? 1.0 : 0.0;
    }
    static calculateTextSimilarity(text1, text2) {
        const maxLength = Math.max(text1.length, text2.length);
        if (maxLength === 0)
            return 1.0;
        const distance = fast_levenshtein_1.default.get(text1, text2);
        return 1 - (distance / maxLength);
    }
    static calculateFileSimilarity(files1, files2) {
        const set1 = new Set(files1);
        const set2 = new Set(files2);
        const intersection = new Set([...set1].filter(x => set2.has(x)));
        const union = new Set([...set1, ...set2]);
        return intersection.size / union.size;
    }
    static async analyzeSubmissionSimilarity(submissions) {
        const results = [];
        console.log('Analyzing similarity for submissions:');
        for (let i = 0; i < submissions.length; i++) {
            for (let j = i + 1; j < submissions.length; j++) {
                const similarity = await this.compareSubmissions(submissions[i], submissions[j]);
                console.log(`Similarity between group ${submissions[i].group.id} and group ${submissions[j].group.id}: ${similarity}`);
                if (similarity > 0.7) { // Seuil de similarité suspect
                    results.push({
                        groupId1: submissions[i].group.id,
                        groupId2: submissions[j].group.id,
                        similarity
                    });
                }
            }
        }
        return results;
    }
    static async compareSubmissions(submission1, submission2) {
        // Implémentation simplifiée - dans un vrai projet, 
        // utiliser des outils plus sophistiqués comme MOSS
        if (submission1.filePath && submission2.filePath) {
            try {
                const [text1, text2] = await Promise.all([
                    this.extractText(submission1.filePath),
                    this.extractText(submission2.filePath),
                ]);
                const words1 = this.normalize(text1);
                const words2 = this.normalize(text2);
                return this.jaccardSimilarity(words1, words2);
            }
            catch (err) {
                console.error("Erreur comparaison fichiers:", err);
                return 0.0;
            }
        }
        if (submission1.gitUrl && submission2.gitUrl) {
            // Comparaison des URLs git
            return submission1.gitUrl === submission2.gitUrl ? 1.0 : 0.0;
        }
        return 0.0;
    }
    static async extractText(filePath) {
        const ext = path_1.default.extname(filePath).toLowerCase();
        const buffer = await fs.readFile(filePath);
        switch (ext) {
            case ".txt":
            case ".js":
            case ".ts":
            case ".java":
            case ".py":
            case ".cpp":
                return buffer.toString("utf-8");
            case ".pdf":
                const pdfData = await (0, pdf_parse_1.default)(buffer);
                return pdfData.text;
            case ".docx":
                const docxData = await mammoth_1.default.extractRawText({ buffer });
                return docxData.value;
            case ".xlsx":
                const workbook = XLSX.read(buffer, { type: "buffer" });
                let text = "";
                workbook.SheetNames.forEach((sheetName) => {
                    text += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                });
                return text;
            case ".zip":
                return await this.extractZip(buffer);
            default:
                return "";
        }
    }
    static async extractZip(buffer) {
        const zip = new adm_zip_1.default(buffer);
        let allText = "";
        for (const entry of zip.getEntries()) {
            if (entry.isDirectory)
                continue;
            const ext = path_1.default.extname(entry.entryName).toLowerCase();
            if (!ext)
                continue;
            const tmpBuffer = entry.getData();
            switch (ext) {
                case ".txt":
                case ".js":
                case ".ts":
                case ".java":
                case ".py":
                case ".cpp":
                    allText += tmpBuffer.toString("utf-8");
                    break;
                case ".pdf":
                    const pdfData = await (0, pdf_parse_1.default)(tmpBuffer);
                    allText += pdfData.text;
                    break;
                case ".docx":
                    const docxData = await mammoth_1.default.extractRawText({ buffer: tmpBuffer });
                    allText += docxData.value;
                    break;
                case ".xlsx":
                    const workbook = XLSX.read(tmpBuffer, { type: "buffer" });
                    workbook.SheetNames.forEach((sheetName) => {
                        allText += XLSX.utils.sheet_to_csv(workbook.Sheets[sheetName]);
                    });
                    break;
            }
        }
        return allText;
    }
    static normalize(text) {
        return text
            .toLowerCase()
            .replace(/[^a-z0-9\s]/g, "")
            .split(/\s+/)
            .filter(Boolean);
    }
    static jaccardSimilarity(words1, words2) {
        const set1 = new Set(words1);
        const set2 = new Set(words2);
        const intersection = new Set([...set1].filter((w) => set2.has(w)));
        const union = new Set([...set1, ...set2]);
        return union.size === 0 ? 0 : intersection.size / union.size;
    }
}
exports.SimilarityService = SimilarityService;
