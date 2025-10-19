import murmur from 'murmurhash';
import { parse as parseJava } from 'java-parser';
// import * as JavaParser from 'java-parser';

import { ExtractedFile, Fingerprint, FingerprintService } from './fingerprint.types';

const SUPPORTED_AST = new Set(['java']);

export class JavaAstFingerprintService implements FingerprintService {
  constructor(private k = 7) {}

  supports(file: ExtractedFile): boolean {
    return !!file.content && SUPPORTED_AST.has(file.language ?? '');
  }

  async build(file: ExtractedFile): Promise<Fingerprint[]> {
    try {
      // const cst = JavaParser.parse(file.content);
      const cst = parseJava(file.content);

      // Séquence de types de nœuds + quelques tokens normalisés (ID/NUM/STR/BOOL)
      const seq: string[] = [];
      this.flattenCst(cst, seq);

      const seqHashes = this.kgramHashes(seq, this.k);

      // Hachage de sous-arbres (CST) pour capter la structure
      const subtreeSet = new Set<number>();
      this.subtreeHashCst(cst, subtreeSet);

      const union = Array.from(new Set<number>([...seqHashes, ...subtreeSet]));

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
    } catch (e) {
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
  private flattenCst(node: any, out: string[]) {
    if (!node) return;

    // Nœud de règle (java-parser / chevrotain): { name: string, children: Record<string, any[]> }
    if (node.name) out.push(node.name);

    const children = node.children || {};
    for (const key of Object.keys(children)) {
      const arr: any[] = children[key] || [];
      for (const ch of arr) {
        if (ch && typeof ch === 'object') {
          if (ch.name) {
            // sous-règle
            this.flattenCst(ch, out);
          } else if (ch.tokenType) {
            // token chevrotain: { image, tokenType: { name } }
            const t = this.normalizeTokenName(ch.tokenType?.name);
            if (t) out.push(t);
          }
        }
      }
    }
  }

  /** Hash k-gram sur la séquence de types/règles/tokens normalisés. */
  private kgramHashes(seq: string[], k: number): number[] {
    const hashes: number[] = [];
    for (let i = 0; i + k <= seq.length; i++) {
      hashes.push(murmur.v3(seq.slice(i, i + k).join('|')));
    }
    return Array.from(new Set(hashes));
  }

  /** Hachage récursif bottom-up des sous-arbres CST. */
  private subtreeHashCst(node: any, acc: Set<number>): number {
    if (!node) return murmur.v3('null');

    // Token
    if (node.tokenType) {
      const tn = this.normalizeTokenName(node.tokenType?.name) || 'TOK';
      const h = murmur.v3(`tok:${tn}`);
      acc.add(h);
      return h;
    }

    // Règle
    const label = node.name || 'Node';
    const childHashes: number[] = [];

    const children = node.children || {};
    for (const key of Object.keys(children)) {
      const arr: any[] = children[key] || [];
      for (const ch of arr) {
        childHashes.push(this.subtreeHashCst(ch, acc));
      }
    }

    childHashes.sort((a, b) => a - b);
    const str = `${label}|${childHashes.join(',')}|${childHashes.length}`;
    const h = murmur.v3(str);
    acc.add(h);
    return h;
  }

  /** Normalisation légère des tokens pour éviter la sensibilité aux identifiants/littéraux. */
  private normalizeTokenName(name?: string): string | null {
    if (!name) return null;
    // Quelques classes courantes dans java-parser :
    if (/Identifier/.test(name)) return 'ID';
    if (/StringLiteral/.test(name)) return 'STR';
    if (/(Integer|Floating|Decimal|Hex|Octal|Binary)(Integer|Floating)?Literal/.test(name)) return 'NUM';
    if (/BooleanLiteral/.test(name)) return 'BOOL';

    // On ignore la plupart des ponctuations (bruit) :
    if (['LPAREN','RPAREN','LBRACE','RBRACE','LBRACK','RBRACK','SEMI','COMMA','DOT','ASSIGN','COLON'].includes(name)) {
      return null;
    }

    // Pour les mots-clés, on peut garder le nom tel quel (if, for, class, return, etc.)
    // java-parser nomme les tokens par leur lexème (p.ex. 'abstract', 'class', 'for', ...) ;
    // si jamais c'est un autre alias, on le garde.
    return name.toLowerCase();
  }
}
