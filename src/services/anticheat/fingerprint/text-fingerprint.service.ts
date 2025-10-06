import murmur from 'murmurhash';
import { ExtractedFile, Fingerprint, FingerprintService } from './fingerprint.types';

const SUPPORTED_TEXT = new Set(['txt', 'js', 'ts', 'java', 'py', 'cpp', 'pdf', 'docx', 'xlsx']);
const DEFAULTS = { k: 5, minTokens: 40 };

const STOPWORDS = new Set([
  // fr + en (mini set, étends si besoin)
  'le','la','les','de','du','des','un','une','et','ou','a','à','aux','au','est','sont','pour','par','avec','sur','dans','en','que','qui',
  'the','a','an','and','or','of','to','for','in','on','is','are','this','that','it','as','by','be','from','at'
]);

function tokenize(text: string): string[] {
  // lettres/chiffres/underscore, unicode friendly
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}_\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .filter(t => !STOPWORDS.has(t));
}

function kgramHashes(tokens: string[], k: number): number[] {
  const out: number[] = [];
  for (let i = 0; i + k <= tokens.length; i++) {
    out.push(murmur.v3(tokens.slice(i, i + k).join('|')));
  }
  // dédoublonne
  return Array.from(new Set(out));
}

export class TextFingerprintService implements FingerprintService {
  constructor(private k = DEFAULTS.k, private minTokens = DEFAULTS.minTokens) {}

  supports(file: ExtractedFile): boolean {
    return !!file.content && SUPPORTED_TEXT.has(file.language ?? 'txt');
  }

  async build(file: ExtractedFile): Promise<Fingerprint[]> {
    const tokens = tokenize(file.content);
    if (tokens.length < this.minTokens) {
      return [{
        submissionId: file.submissionId,
        filePath: file.filePath,
        kind: 'text',
        hashes: [],
        stats: { tokens: tokens.length, k: this.k, skipped: true },
        version: `text-v1-k${this.k}`,
        language: file.language
      }];
    }

    const hashes = kgramHashes(tokens, this.k);
    return [{
      submissionId: file.submissionId,
      filePath: file.filePath,
      kind: 'text',
      hashes,
      stats: { tokens: tokens.length, k: this.k, uniq: hashes.length },
      version: `text-v1-k${this.k}`,
      language: file.language
    }];
  }
}
