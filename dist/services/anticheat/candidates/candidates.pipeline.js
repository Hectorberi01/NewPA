"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.findCandidatesForSubmissionRunner = void 0;
const candidates_service_1 = require("./candidates.service");
async function findCandidatesForSubmissionRunner(ds, submissionId, topK = 100, minOverlap = 10) {
    const svc = new candidates_service_1.FullScanCandidatesService(ds);
    return svc.findCandidatesForSubmission(submissionId, { topK, minOverlap });
}
exports.findCandidatesForSubmissionRunner = findCandidatesForSubmissionRunner;
