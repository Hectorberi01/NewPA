import { createHash } from 'crypto';
import levenshtein from 'fast-levenshtein';
import path from 'path';
import * as fs from "fs/promises";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import AdmZip from "adm-zip";
const TEMP_DIR = path.join(__dirname, '../../tmp');

export class SimilarityService {

  static calculateHashSimilarity(content1: string, content2: string): number {
    const hash1 = createHash('md5').update(content1).digest('hex');
    const hash2 = createHash('md5').update(content2).digest('hex');

    return hash1 === hash2 ? 1.0 : 0.0;
  }

  static calculateTextSimilarity(text1: string, text2: string): number {
    const maxLength = Math.max(text1.length, text2.length);
    if (maxLength === 0) return 1.0;

    const distance = levenshtein.get(text1, text2);
    return 1 - (distance / maxLength);
  }

  static calculateFileSimilarity(files1: string[], files2: string[]): number {
    const set1 = new Set(files1);
    const set2 = new Set(files2);

    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);

    return intersection.size / union.size;
  }

  static async analyzeSubmissionSimilarity(submissions: any[]): Promise<{ groupId1: number; groupId2: number; similarity: number }[]> {
    const results: { groupId1: number; groupId2: number; similarity: number }[] = [];
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

  private static async compareSubmissions(submission1: any, submission2: any): Promise<number> {
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
      } catch (err) {
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
  private static async extractText(filePath: string): Promise<string> {
    const ext = path.extname(filePath).toLowerCase();
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
        const pdfData = await pdf(buffer);
        return pdfData.text;

      case ".docx":
        const docxData = await mammoth.extractRawText({ buffer });
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

  private static async extractZip(buffer: Buffer): Promise<string> {
    const zip = new AdmZip(buffer);
    let allText = "";

    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;

      const ext = path.extname(entry.entryName).toLowerCase();
      if (!ext) continue;

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
          const pdfData = await pdf(tmpBuffer);
          allText += pdfData.text;
          break;

        case ".docx":
          const docxData = await mammoth.extractRawText({ buffer: tmpBuffer });
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

  private static normalize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);
  }

  private static jaccardSimilarity(words1: string[], words2: string[]): number {
    const set1 = new Set(words1);
    const set2 = new Set(words2);
    const intersection = new Set([...set1].filter((w) => set2.has(w)));
    const union = new Set([...set1, ...set2]);
    return union.size === 0 ? 0 : intersection.size / union.size;
  }
}