"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileValidationService = void 0;
const fs_1 = __importDefault(require("fs"));
const adm_zip_1 = __importDefault(require("adm-zip"));
class FileValidationService {
    static async validateArchiveSize(filePath, maxSizeMB) {
        try {
            const stats = fs_1.default.statSync(filePath);
            const fileSizeMB = stats.size / (1024 * 1024);
            if (fileSizeMB > maxSizeMB) {
                return {
                    valid: false,
                    error: `File size (${fileSizeMB?.toFixed(2)}MB) exceeds maximum allowed size (${maxSizeMB}MB)`
                };
            }
            return { valid: true };
        }
        catch (error) {
            return { valid: false, error: 'Could not validate file size' };
        }
    }
    static async validateFilePresence(filePath, requiredFiles) {
        try {
            const zip = new adm_zip_1.default(filePath);
            const zipEntries = zip.getEntries();
            const fileNames = zipEntries.map(entry => entry.entryName);
            const missingFiles = requiredFiles.filter(file => !fileNames.some(fileName => fileName.includes(file)));
            if (missingFiles.length > 0) {
                return {
                    valid: false,
                    error: 'Required files are missing',
                    missingFiles
                };
            }
            return { valid: true };
        }
        catch (error) {
            return { valid: false, error: 'Could not validate file contents' };
        }
    }
    static async validateFolderStructure(filePath, expectedStructure) {
        try {
            const zip = new adm_zip_1.default(filePath);
            const zipEntries = zip.getEntries();
            const folders = zipEntries
                .filter(entry => entry.isDirectory)
                .map(entry => entry.entryName.replace(/\/$/, ''));
            const missingFolders = expectedStructure.filter(folder => !folders.includes(folder));
            if (missingFolders.length > 0) {
                return {
                    valid: false,
                    error: `Missing folders: ${missingFolders.join(', ')}`
                };
            }
            return { valid: true };
        }
        catch (error) {
            return { valid: false, error: 'Could not validate folder structure' };
        }
    }
    static async validateFileContent(filePath, fileName, contentRegex) {
        try {
            const zip = new adm_zip_1.default(filePath);
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
        }
        catch (error) {
            return { valid: false, error: 'Could not validate file content' };
        }
    }
}
exports.FileValidationService = FileValidationService;
