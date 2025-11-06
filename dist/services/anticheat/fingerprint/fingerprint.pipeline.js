"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAndSaveFingerprints = generateAndSaveFingerprints;
const extraction_service_1 = require("../extraction/extraction.service");
const index_1 = require("./index");
const candidates_pipeline_1 = require("../candidates/candidates.pipeline");
const Entities_1 = require("../../../entities/Entities");
const compare_and_aggregate_pipeline_1 = require("../engine/compare-and-aggregate.pipeline");
async function generateAndSaveFingerprints(ds, submissionId, archivePath) {
    // 1) Extraction
    const extractor = new extraction_service_1.ExtractionServiceImpl();
    const files = await extractor.extract(archivePath, submissionId);
    // 2) Empreintes
    const fps = await (0, index_1.buildFingerprints)(files);
    // 3) Persist
    const repo = ds.getRepository(Entities_1.SubmissionFingerprint);
    if (fps.length) {
        await repo.save(fps.map(fp => repo.create({
            submissionId: fp.submissionId,
            filePath: fp.filePath,
            kind: fp.kind,
            hashes: fp.hashes,
            stats: fp.stats,
            language: fp.language,
            version: fp.version,
        })));
    }
    // 4) Candidats
    const candidates = await (0, candidates_pipeline_1.findCandidatesForSubmissionRunner)(ds, submissionId);
    // 5) Compare + agrège
    const candIds = candidates.map(c => c.submissionId);
    const similarity = await (0, compare_and_aggregate_pipeline_1.compareAndAggregate)(ds, submissionId, candIds, { fusion: 'max', alpha: 0.6, minHashes: 5, minScorePerKind: 0.02 }, // SimilarityEngine opts
    { threshold: 0.6, topPerPair: 3 } // Aggregator opts
    );
    return { saved: fps.length, candidates, similarity };
}
