import murmur from 'murmurhash';
import { parse } from '@typescript-eslint/typescript-estree';
import { ExtractedFile, Fingerprint, FingerprintService } from './fingerprint.types';

const SUPPORTED_AST = new Set(['js', 'ts']);

export class AstFingerprintService implements FingerprintService {
  constructor(private k = 7) {}

  supports(file: ExtractedFile): boolean {
    return !!file.content && SUPPORTED_AST.has(file.language ?? '');
  }

  async build(file: ExtractedFile): Promise<Fingerprint[]> {
    try {
      const ast = parse(file.content, { jsx: true, loc: false, range: false, comment: false, tokens: false });
      const norm = this.normalizeAst(ast);
      const seq: string[] = [];
      this.nodeTypeSequence(norm, seq);
      const seqHashes = this.kgramHashes(seq, this.k);

      const subtreeSet = new Set<number>();
      this.subtreeHash(norm, subtreeSet);

      // union des deux familles d’empreintes
      const all = Array.from(new Set<number>([...seqHashes, ...subtreeSet]));

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
    } catch {
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

  private normalizeAst(node: any): any {
    if (!node || typeof node !== 'object') return node;
    const out: any = {};
    for (const k of Object.keys(node)) {
      const v = node[k];
      if (k === 'name') out[k] = 'ID';
      else if (k === 'value' && typeof v === 'string') out[k] = 'STR';
      else if (k === 'value' && typeof v === 'number') out[k] = 0;
      else if (k === 'raw' || k === 'parent') continue;
      else if (Array.isArray(v)) out[k] = v.map(x => this.normalizeAst(x));
      else if (v && typeof v === 'object') out[k] = this.normalizeAst(v);
      else out[k] = v;
    }
    return out;
  }

  private nodeTypeSequence(n: any, out: string[]) {
    if (!n || typeof n !== 'object') return;
    out.push(n.type || 'Unknown');
    for (const key of Object.keys(n)) {
      const v = (n as any)[key];
      if (v && typeof v === 'object' && key !== 'parent') {
        if (Array.isArray(v)) v.forEach(c => this.nodeTypeSequence(c, out));
        else this.nodeTypeSequence(v, out);
      }
    }
  }

  private kgramHashes(seq: string[], k: number): number[] {
    const hashes: number[] = [];
    for (let i = 0; i + k <= seq.length; i++) {
      hashes.push(murmur.v3(seq.slice(i, i + k).join('|')));
    }
    return Array.from(new Set(hashes));
  }

  // hashing bottom-up des sous-arbres
  private subtreeHash(n: any, acc: Set<number>): number {
    if (!n || typeof n !== 'object') return murmur.v3('null');
    const childHashes: number[] = [];
    for (const key of Object.keys(n)) {
      const v = (n as any)[key];
      if (v && typeof v === 'object' && key !== 'parent') {
        if (Array.isArray(v)) v.forEach(c => childHashes.push(this.subtreeHash(c, acc)));
        else childHashes.push(this.subtreeHash(v, acc));
      }
    }
    const str = `${n.type}|${childHashes.sort((a,b)=>a-b).join(',')}|${childHashes.length}`;
    const h = murmur.v3(str);
    acc.add(h);
    return h;
  }
}
