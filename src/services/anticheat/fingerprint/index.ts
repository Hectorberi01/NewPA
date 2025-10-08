// Barrel exports
export * from './fingerprint.types';
export * from './text-fingerprint.service';
export * from './ast-fingerprint.service';

// Helpers pratiques
import { ExtractedFile, Fingerprint, FingerprintService } from './fingerprint.types';
import { TextFingerprintService } from './text-fingerprint.service';
import { AstFingerprintService } from './ast-fingerprint.service';

export function defaultFingerprintServices(): FingerprintService[] {
  return [new TextFingerprintService(5), new AstFingerprintService(7)]; // k par défaut
}

export async function buildFingerprints(
  files: ExtractedFile[],
  services: FingerprintService[] = defaultFingerprintServices()
): Promise<Fingerprint[]> {
  const out: Fingerprint[] = [];
  for (const f of files) {
    for (const s of services) {
      if (s.supports(f)) {
        const fps = await s.build(f);
        if (fps?.length) out.push(...fps);
      }
    }
  }
  return out;
}
