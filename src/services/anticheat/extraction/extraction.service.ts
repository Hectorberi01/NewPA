import AdmZip from "adm-zip";
import path from "path";
import * as fs from "fs/promises";
import * as fssync from "fs";
import pdf from "pdf-parse";
import mammoth from "mammoth";
import * as XLSX from "xlsx";

export type ExtractedFile = {
  submissionId: number;
  filePath: string;        // chemin relatif dans l’archive (ou basename si fichier simple)
  language?: string;       // js|ts|java|py|cpp|txt|pdf|docx|xlsx
  content: string;         // texte brut (le code brut pour js/ts/...), sinon texte extrait
  size: number;            // en octets (source)
  mime?: string;
};

export interface ExtractionService {
  extract(archivePath: string, submissionId: number): Promise<ExtractedFile[]>;
}

const ALLOWED_EXT = new Set([
  ".txt", ".js", ".ts", ".java", ".py", ".cpp", ".pdf", ".docx", ".xlsx",
 
]);

const EXT_LANG: Record<string, string> = {
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
  maxArchiveBytes: 100 * 1024 * 1024,       // 100 MB
  maxEntryBytes: 8 * 1024 * 1024,           // 8 MB par entrée
  maxEntries: 2000,                          // limite de fichiers
  maxUncompressedBytes: 300 * 1024 * 1024,   // 300 MB total non compressé
};

export class ExtractionServiceImpl implements ExtractionService {
  constructor(private limits = DEFAULT_LIMITS) {}

  async extract(archivePath: string, submissionId: number): Promise<ExtractedFile[]> {
    const stat = await fs.stat(archivePath);
    if (stat.size > this.limits.maxArchiveBytes) {
      throw new Error(`Archive trop volumineuse (${stat.size} > ${this.limits.maxArchiveBytes})`);
    }

    const ext = path.extname(archivePath).toLowerCase();
    if (ext === ".zip") {
      return this.extractFromZip(archivePath, submissionId);
    } else {
      // fichier simple
      return [await this.extractOneFile(archivePath, submissionId, path.basename(archivePath))];
    }
  }

  private async extractFromZip(archivePath: string, submissionId: number): Promise<ExtractedFile[]> {
    const zip = new AdmZip(archivePath);
    const entries = zip.getEntries();

    if (entries.length > this.limits.maxEntries) {
      throw new Error(`Trop d’entrées dans le zip (${entries.length} > ${this.limits.maxEntries})`);
    }

    let totalUncompressed = 0;
    const out: ExtractedFile[] = [];

    for (const e of entries) {
      if (e.isDirectory) continue;

      // path traversal guard
      const rel = this.normalizeRelPath(e.entryName);
      if (!rel) continue; // ignore chemins suspects

      const ext = path.extname(rel).toLowerCase();
      if (!ALLOWED_EXT.has(ext)) continue; // ignore types non gérés

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

  private async extractOneFile(absolutePath: string, submissionId: number, relName: string): Promise<ExtractedFile> {
    const ext = path.extname(absolutePath).toLowerCase();
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

  private normalizeRelPath(p: string): string | null {
    // retire ../, \, etc. et force un chemin relatif safe
    const normalized = path.posix.normalize(p.replace(/\\/g, "/"));
    if (normalized.startsWith("../") || path.isAbsolute(normalized)) return null;
    return normalized;
  }

  private guessMime(ext: string): string | undefined {
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

  private async bufferToText(buf: Buffer, ext: string): Promise<{ content: string; language: string }> {
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
        const data = await pdf(buf);
        return { content: data.text || "", language: lang };
      }

      case ".docx": {
        const res = await mammoth.extractRawText({ buffer: buf });
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

  private cleanText(txt: string): string {
    // normalise fin de lignes, enlève nulls/bidi, trim large
    return txt
      .replace(/\r\n?/g, "\n")
      .replace(/\u0000/g, "")
      .replace(/[\u202A-\u202E]/g, "")
      .slice(0, 5_000_000); // borne de sécurité
  }
}
