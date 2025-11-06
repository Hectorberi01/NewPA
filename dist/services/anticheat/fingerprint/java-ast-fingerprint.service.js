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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.JavaAstFingerprintService = void 0;
const murmurhash_1 = __importDefault(require("murmurhash"));
const SUPPORTED_AST = new Set(['java']);
class JavaAstFingerprintService {
    constructor(k = 7) {
        this.k = k;
    }
    supports(file) {
        return !!file.content && SUPPORTED_AST.has(file.language ?? '');
    }
    async build(file) {
        try {
            // const cst = JavaParser.parse(file.content);
            //const cst = parseJava(file.content);
            const { parse } = await Promise.resolve().then(() => __importStar(require('java-parser')));
            const cst = parse(file.content);
            // Séquence de types de nœuds + quelques tokens normalisés (ID/NUM/STR/BOOL)
            const seq = [];
            this.flattenCst(cst, seq);
            const seqHashes = this.kgramHashes(seq, this.k);
            // Hachage de sous-arbres (CST) pour capter la structure
            const subtreeSet = new Set();
            this.subtreeHashCst(cst, subtreeSet);
            const union = Array.from(new Set([...seqHashes, ...subtreeSet]));
            return [{
                    submissionId: file.submissionId,
                    filePath: file.filePath,
                    kind: 'ast',
                    hashes: union,
                    stats: {
                        k: this.k,
                        seqLen: seq.length,
                        seqUniq: seqHashes.length,
                        subtrees: subtreeSet.size,
                        parser: 'java-parser'
                    },
                    version: `ast-java-v1-k${this.k}`,
                    language: file.language
                }];
        }
        catch (e) {
            // Échec parsing → empreinte vide (on ne bloque pas)
            return [{
                    submissionId: file.submissionId,
                    filePath: file.filePath,
                    kind: 'ast',
                    hashes: [],
                    stats: { parseError: true, parser: 'java-parser' },
                    version: `ast-java-v1-k${this.k}`,
                    language: file.language
                }];
        }
    }
    // --- Helpers ---
    /** Aplati le CST: empile les noms de règles + tokens normalisés (ID/NUM/STR/BOOL). */
    flattenCst(node, out) {
        if (!node)
            return;
        // Nœud de règle (java-parser / chevrotain): { name: string, children: Record<string, any[]> }
        if (node.name)
            out.push(node.name);
        const children = node.children || {};
        for (const key of Object.keys(children)) {
            const arr = children[key] || [];
            for (const ch of arr) {
                if (ch && typeof ch === 'object') {
                    if (ch.name) {
                        // sous-règle
                        this.flattenCst(ch, out);
                    }
                    else if (ch.tokenType) {
                        // token chevrotain: { image, tokenType: { name } }
                        const t = this.normalizeTokenName(ch.tokenType?.name);
                        if (t)
                            out.push(t);
                    }
                }
            }
        }
    }
    /** Hash k-gram sur la séquence de types/règles/tokens normalisés. */
    kgramHashes(seq, k) {
        const hashes = [];
        for (let i = 0; i + k <= seq.length; i++) {
            hashes.push(murmurhash_1.default.v3(seq.slice(i, i + k).join('|')));
        }
        return Array.from(new Set(hashes));
    }
    /** Hachage récursif bottom-up des sous-arbres CST. */
    subtreeHashCst(node, acc) {
        if (!node)
            return murmurhash_1.default.v3('null');
        // Token
        if (node.tokenType) {
            const tn = this.normalizeTokenName(node.tokenType?.name) || 'TOK';
            const h = murmurhash_1.default.v3(`tok:${tn}`);
            acc.add(h);
            return h;
        }
        // Règle
        const label = node.name || 'Node';
        const childHashes = [];
        const children = node.children || {};
        for (const key of Object.keys(children)) {
            const arr = children[key] || [];
            for (const ch of arr) {
                childHashes.push(this.subtreeHashCst(ch, acc));
            }
        }
        childHashes.sort((a, b) => a - b);
        const str = `${label}|${childHashes.join(',')}|${childHashes.length}`;
        const h = murmurhash_1.default.v3(str);
        acc.add(h);
        return h;
    }
    /** Normalisation légère des tokens pour éviter la sensibilité aux identifiants/littéraux. */
    normalizeTokenName(name) {
        if (!name)
            return null;
        // Quelques classes courantes dans java-parser :
        if (/Identifier/.test(name))
            return 'ID';
        if (/StringLiteral/.test(name))
            return 'STR';
        if (/(Integer|Floating|Decimal|Hex|Octal|Binary)(Integer|Floating)?Literal/.test(name))
            return 'NUM';
        if (/BooleanLiteral/.test(name))
            return 'BOOL';
        // On ignore la plupart des ponctuations (bruit) :
        if (['LPAREN', 'RPAREN', 'LBRACE', 'RBRACE', 'LBRACK', 'RBRACK', 'SEMI', 'COMMA', 'DOT', 'ASSIGN', 'COLON'].includes(name)) {
            return null;
        }
        // Pour les mots-clés, on peut garder le nom tel quel (if, for, class, return, etc.)
        // java-parser nomme les tokens par leur lexème (p.ex. 'abstract', 'class', 'for', ...) ;
        // si jamais c'est un autre alias, on le garde.
        return name.toLowerCase();
    }
}
exports.JavaAstFingerprintService = JavaAstFingerprintService;
