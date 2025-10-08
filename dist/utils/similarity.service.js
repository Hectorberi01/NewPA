"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimilarityService = void 0;
const crypto_1 = require("crypto");
const fast_levenshtein_1 = __importDefault(require("fast-levenshtein"));
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
        for (let i = 0; i < submissions.length; i++) {
            for (let j = i + 1; j < submissions.length; j++) {
                const similarity = await this.compareSubmissions(submissions[i], submissions[j]);
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
            // Comparaison basée sur les fichiers
            return Math.random() * 0.3; // Simulation
        }
        if (submission1.gitUrl && submission2.gitUrl) {
            // Comparaison des URLs git
            return submission1.gitUrl === submission2.gitUrl ? 1.0 : 0.0;
        }
        return 0.0;
    }
}
exports.SimilarityService = SimilarityService;
