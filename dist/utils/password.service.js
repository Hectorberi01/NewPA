"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PasswordService = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
const crypto_1 = __importDefault(require("crypto"));
class PasswordService {
    static async hashPassword(password) {
        const saltRounds = 10;
        return await bcrypt_1.default.hash(password, saltRounds);
    }
    static async comparePasswords(plainPassword, hashedPassword) {
        console.log("Comparing passwords:", plainPassword, hashedPassword);
        return await bcrypt_1.default.compare(plainPassword, hashedPassword);
    }
    static generateTemporaryPassword(length = 12) {
        const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < length; i++) {
            password += charset.charAt(Math.floor(Math.random() * charset.length));
        }
        return password;
    }
    static generateResetToken() {
        return crypto_1.default.randomBytes(32).toString('hex');
    }
}
exports.PasswordService = PasswordService;
