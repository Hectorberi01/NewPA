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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultFingerprintServices = defaultFingerprintServices;
exports.buildFingerprints = buildFingerprints;
__exportStar(require("./fingerprint.types"), exports);
__exportStar(require("./text-fingerprint.service"), exports);
__exportStar(require("./ast-fingerprint.service"), exports);
__exportStar(require("./java-ast-fingerprint.service"), exports);
const text_fingerprint_service_1 = require("./text-fingerprint.service");
const ast_fingerprint_service_1 = require("./ast-fingerprint.service");
const java_ast_fingerprint_service_1 = require("./java-ast-fingerprint.service");
function defaultFingerprintServices() {
    return [new text_fingerprint_service_1.TextFingerprintService(5), new ast_fingerprint_service_1.AstFingerprintService(7), new java_ast_fingerprint_service_1.JavaAstFingerprintService(7)]; // k par défaut
}
async function buildFingerprints(files, services = defaultFingerprintServices()) {
    const out = [];
    for (const f of files) {
        for (const s of services) {
            if (s.supports(f)) {
                const fps = await s.build(f);
                if (fps?.length)
                    out.push(...fps);
            }
        }
    }
    return out;
}
