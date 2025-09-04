import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';

export class FileValidationService {
  
  static async validateArchiveSize(filePath: string, maxSizeMB: number): Promise<{ valid: boolean; error?: string }> {
    try {
      const stats = fs.statSync(filePath);
      const fileSizeMB = stats.size / (1024 * 1024);
      
      if (fileSizeMB > maxSizeMB) {
        return { 
          valid: false, 
          error: `File size (${fileSizeMB.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)` 
        };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Could not validate file size' };
    }
  }

  static async validateFilePresence(filePath: string, requiredFiles: string[]): Promise<{ valid: boolean; error?: string; missingFiles?: string[] }> {
    try {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      const fileNames = zipEntries.map(entry => entry.entryName);
      
      const missingFiles = requiredFiles.filter(file => 
        !fileNames.some(fileName => fileName.includes(file))
      );
      
      if (missingFiles.length > 0) {
        return { 
          valid: false, 
          error: 'Required files are missing',
          missingFiles 
        };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Could not validate file contents' };
    }
  }

  static async validateFolderStructure(filePath: string, expectedStructure: string[]): Promise<{ valid: boolean; error?: string }> {
    try {
      const zip = new AdmZip(filePath);
      const zipEntries = zip.getEntries();
      const folders = zipEntries
        .filter(entry => entry.isDirectory)
        .map(entry => entry.entryName.replace(/\/$/, ''));
      
      const missingFolders = expectedStructure.filter(folder => 
        !folders.includes(folder)
      );
      
      if (missingFolders.length > 0) {
        return { 
          valid: false, 
          error: `Missing folders: ${missingFolders.join(', ')}` 
        };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Could not validate folder structure' };
    }
  }

  static async validateFileContent(filePath: string, fileName: string, contentRegex: string): Promise<{ valid: boolean; error?: string }> {
    try {
      const zip = new AdmZip(filePath);
      const entry = zip.getEntry(fileName);
      
      if (!entry) {
        return { valid: false, error: `File ${fileName} not found` };
      }
      
      const content = zip.readAsText(entry);
      const regex = new RegExp(contentRegex);
      
      if (!regex.test(content)) {
        return { 
          valid: false, 
          error: `File ${fileName} does not match required pattern` 
        };
      }
      
      return { valid: true };
    } catch (error) {
      return { valid: false, error: 'Could not validate file content' };
    }
  }
}