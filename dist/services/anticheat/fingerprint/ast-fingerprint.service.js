"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AstFingerprintService = void 0;
const murmurhash_1 = __importDefault(require("murmurhash"));
const typescript_estree_1 = require("@typescript-eslint/typescript-estree");
const SUPPORTED_AST = new Set(['js', 'ts']);
class AstFingerprintService {
    constructor(k = 7) {
        this.k = k;
    }
    supports(file) {
        return !!file.content && SUPPORTED_AST.has(file.language ?? '');
    }
    async build(file) {
        try {
            const ast = (0, typescript_estree_1.parse)(file.content, { jsx: true, loc: false, range: false, comment: false, tokens: false });
            const norm = this.normalizeAst(ast);
            const seq = [];
            this.nodeTypeSequence(norm, seq);
            const seqHashes = this.kgramHashes(seq, this.k);
            const subtreeSet = new Set();
            this.subtreeHash(norm, subtreeSet);
            // union des deux familles d’empreintes
            const all = Array.from(new Set([...seqHashes, ...subtreeSet]));
            return [{
                    submissionId: file.submissionId,
                    filePath: file.filePath,
                    kind: 'ast',
                    hashes: all,
                    stats: {
                        k: this.k,
                        nodeTypes: seq.length,
                        seqUniq: seqHashes.length,
                        subtrees: subtreeSet.size
                    },
                    version: `ast-v1-k${this.k}`,
                    language: file.language
                }];
        }
        catch {
            // échec parsing → empreinte vide (ne bloque pas le pipeline)
            return [{
                    submissionId: file.submissionId,
                    filePath: file.filePath,
                    kind: 'ast',
                    hashes: [],
                    stats: { parseError: true },
                    version: `ast-v1-k${this.k}`,
                    language: file.language
                }];
        }
    }
    // --- Helpers AST ---
    normalizeAst(node) {
        if (!node || typeof node !== 'object')
            return node;
        const out = {};
        for (const k of Object.keys(node)) {
            const v = node[k];
            if (k === 'name')
                out[k] = 'ID';
            else if (k === 'value' && typeof v === 'string')
                out[k] = 'STR';
            else if (k === 'value' && typeof v === 'number')
                out[k] = 0;
            else if (k === 'raw' || k === 'parent')
                continue;
            else if (Array.isArray(v))
                out[k] = v.map(x => this.normalizeAst(x));
            else if (v && typeof v === 'object')
                out[k] = this.normalizeAst(v);
            else
                out[k] = v;
        }
        return out;
    }
    nodeTypeSequence(n, out) {
        if (!n || typeof n !== 'object')
            return;
        out.push(n.type || 'Unknown');
        for (const key of Object.keys(n)) {
            const v = n[key];
            if (v && typeof v === 'object' && key !== 'parent') {
                if (Array.isArray(v))
                    v.forEach(c => this.nodeTypeSequence(c, out));
                else
                    this.nodeTypeSequence(v, out);
            }
        }
    }
    kgramHashes(seq, k) {
        const hashes = [];
        for (let i = 0; i + k <= seq.length; i++) {
            hashes.push(murmurhash_1.default.v3(seq.slice(i, i + k).join('|')));
        }
        return Array.from(new Set(hashes));
    }
    // hashing bottom-up des sous-arbres
    subtreeHash(n, acc) {
        if (!n || typeof n !== 'object')
            return murmurhash_1.default.v3('null');
        const childHashes = [];
        for (const key of Object.keys(n)) {
            const v = n[key];
            if (v && typeof v === 'object' && key !== 'parent') {
                if (Array.isArray(v))
                    v.forEach(c => childHashes.push(this.subtreeHash(c, acc)));
                else
                    childHashes.push(this.subtreeHash(v, acc));
            }
        }
        const str = `${n.type}|${childHashes.sort((a, b) => a - b).join(',')}|${childHashes.length}`;
        const h = murmurhash_1.default.v3(str);
        acc.add(h);
        return h;
    }
}
exports.AstFingerprintService = AstFingerprintService;
