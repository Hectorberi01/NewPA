export type ExtractedFile = {
  submissionId: number;
  filePath: string;
  language?: string;   // 'txt'|'js'|'ts'|'java'|'py'|'cpp'|'pdf'|'docx'|'xlsx'
  content: string;
  size: number;
  mime?: string;
};

export type Fingerprint = {
  submissionId: number;
  filePath: string;
  kind: 'text' | 'ast';
  hashes: number[];
  stats?: any;
  version: string;
  language?: string;
};

export interface FingerprintService {
  supports(file: ExtractedFile): boolean;
  build(file: ExtractedFile): Promise<Fingerprint[]>;
}
