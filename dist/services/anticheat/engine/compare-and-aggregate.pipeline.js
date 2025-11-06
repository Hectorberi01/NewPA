"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareAndAggregate = compareAndAggregate;
const compare_candidates_pipeline_1 = require("./compare-candidates.pipeline");
const aggregator_service_1 = require("../aggregator/aggregator.service");
async function compareAndAggregate(ds, submissionId, candidateIds, engineOpts = { fusion: 'max', alpha: 0.6, minHashes: 5, minScorePerKind: 0.02 }, aggOpts = { threshold: 0.6, topPerPair: 3 }) {
    // 1) Compare
    const pairScores = await (0, compare_candidates_pipeline_1.compareAgainstCandidates)(ds, submissionId, candidateIds, engineOpts);
    // 2) Agrège
    const agg = new aggregator_service_1.AggregatorService(ds, aggOpts);
    const savedResults = await agg.persistPairScores(pairScores);
    const aggregates = await agg.updateSubmissionAggregates(submissionId);
    const topMatches = await agg.findTopMatches(submissionId, 10);
    return { savedResults, aggregates, topMatches };
}
