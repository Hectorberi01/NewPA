"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.compareAgainstCandidates = void 0;
const similarity_engine_1 = require("./similarity.engine");
async function compareAgainstCandidates(ds, submissionId, candidateIds, opts) {
    const engine = new similarity_engine_1.SimilarityEngine(ds, opts);
    const all = [];
    for (const cid of candidateIds) {
        if (cid === submissionId)
            continue;
        const scores = await engine.compare(submissionId, cid);
        all.push(...scores);
    }
    // tri global par finalScore
    all.sort((a, b) => b.finalScore - a.finalScore);
    return all;
}
exports.compareAgainstCandidates = compareAgainstCandidates;
