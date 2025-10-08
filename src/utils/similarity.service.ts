import { DataSource } from "typeorm/data-source/DataSource";
import { AntiCheatService } from "../services/anticheat/anticheat.service";

export class SimilarityService {
  constructor(private ds: DataSource) {}
  async analyzeSubmissionSimilarityForImport(id: number, path: string) {
    const anti = new AntiCheatService(this.ds);
    return anti.onSubmissionImported(id, path);
  }
}
