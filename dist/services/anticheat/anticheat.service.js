"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.AntiCheatService = void 0;
const fingerprint_pipeline_1 = require("./fingerprint/fingerprint.pipeline");
const aggregator_service_1 = require("./aggregator/aggregator.service");
const Entities_1 = require("../../entities/Entities");
class AntiCheatService {
    constructor(ds) {
        this.ds = ds;
    }
    /**
     * Étapes :
     * 1) Extraction → 2) Fingerprints → 3) Persist
     * 4) Candidates → 5) Compare + Aggregate
     */
    async onSubmissionImported(submissionId, archivePath) {
        return (0, fingerprint_pipeline_1.generateAndSaveFingerprints)(this.ds, submissionId, archivePath);
    }
    async getSubmissionSummary(submissionId) {
        const sub = await this.ds.getRepository(Entities_1.DeliverableSubmission).findOneBy({ id: submissionId });
        const agg = new aggregator_service_1.AggregatorService(this.ds);
        const topMatches = await agg.findTopMatches(submissionId, 10);
        return { submission: sub, topMatches };
    }
}
exports.AntiCheatService = AntiCheatService;
