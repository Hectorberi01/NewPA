import { createHash } from 'crypto';
import levenshtein from 'fast-levenshtein';

export class SimilarityService {
  
  static calculateHashSimilarity(content1: string, content2: string): number {
    const hash1 = createHash('md5').update(content1).digest('hex');
    const hash2 = createHash('md5').update(content2).digest('hex');
    
    return hash1 === hash2 ? 1.0 : 0.0;
  }

  static calculateTextSimilarity(text1: string, text2: string): number {
    const maxLength = Math.max(text1.length, text2.length);
    if (maxLength === 0) return 1.0;
    
    const distance = levenshtein.get(text1, text2);
    return 1 - (distance / maxLength);
  }

  static calculateFileSimilarity(files1: string[], files2: string[]): number {
    const set1 = new Set(files1);
    const set2 = new Set(files2);
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  static async analyzeSubmissionSimilarity(submissions: any[]): Promise<{ groupId1: number; groupId2: number; similarity: number }[]> {
    const results: { groupId1: number; groupId2: number; similarity: number }[] = [];
    
    for (let i = 0; i < submissions.length; i++) {
      for (let j = i + 1; j < submissions.length; j++) {
        const similarity = await this.compareSubmissions(submissions[i], submissions[j]);
        
        if (similarity > 0.7) { // Seuil de similarité suspect
          results.push({
            groupId1: submissions[i].group.id,
            groupId2: submissions[j].group.id,
            similarity
          });
        }
      }
    }
    
    return results;
  }

  private static async compareSubmissions(submission1: any, submission2: any): Promise<number> {
    // Implémentation simplifiée - dans un vrai projet, 
    // utiliser des outils plus sophistiqués comme MOSS
    if (submission1.filePath && submission2.filePath) {
      // Comparaison basée sur les fichiers
      return Math.random() * 0.3; // Simulation
    }
    
    if (submission1.gitUrl && submission2.gitUrl) {
      // Comparaison des URLs git
      return submission1.gitUrl === submission2.gitUrl ? 1.0 : 0.0;
    }
    
    return 0.0;
  }
}