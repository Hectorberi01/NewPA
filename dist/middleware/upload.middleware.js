"use strict";
// import multer from 'multer';
// import multerS3 from "multer-s3";
// import path from 'path';
// import { s3Client } from "../config/aws.config";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadMiddleware = void 0;
// const allowedTypes = [
//   ".zip", ".rar", ".tar", ".gz", ".7z", ".csv", ".xlsx", ".xls", ".json", ".pdf",
//   ".docx", ".doc", ".pptx", ".ppt", ".txt", ".md", ".jpg", ".jpeg", ".png", ".gif",
//   ".bmp", ".svg"
// ];
// const storage = multer.diskStorage({
//   destination: (req, file, cb) => {
//     cb(null, 'uploads/');
//   },
//   filename: (req, file, cb) => {
//     const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
//     cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
//   }
// });
// const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
//   // const allowedTypes = ['.zip', '.rar', '.tar', '.gz', '.7z', '.csv', '.xlsx', '.xls', '.json', '.pdf', '.docx', 
//   //   '.doc', '.pptx', '.ppt', '.txt', '.md', '.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg'];
//   const ext = path.extname(file.originalname).toLowerCase();
//   if (allowedTypes.includes(ext)) {
//     cb(null, true);
//   } else {
//     cb(new Error('Invalid file type. Only archives are allowed.'));
//   }
// };
// export const uploadMiddleware = multer({
//   storage,
//   fileFilter,
//   limits: {
//     fileSize: 150 * 1024 * 1024 // 50MB max
//   }
// });
const multer_1 = __importDefault(require("multer"));
const multer_s3_1 = __importDefault(require("multer-s3"));
const path_1 = __importDefault(require("path"));
const aws_config_1 = require("../config/aws.config");
const allowedTypes = [
    ".zip", ".rar", ".tar", ".gz", ".7z", ".csv", ".xlsx", ".xls", ".json", ".pdf",
    ".docx", ".doc", ".pptx", ".ppt", ".txt", ".md", ".jpg", ".jpeg", ".png", ".gif",
    ".bmp", ".svg"
];
exports.uploadMiddleware = (0, multer_1.default)({
    storage: (0, multer_s3_1.default)({
        s3: aws_config_1.s3Client,
        bucket: process.env.AWS_S3_BUCKET,
        contentType: multer_s3_1.default.AUTO_CONTENT_TYPE,
        key: (req, file, cb) => {
            const ext = path_1.default.extname(file.originalname).toLowerCase();
            if (!allowedTypes.includes(ext)) {
                return cb(new Error("Invalid file type"), "");
            }
            const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
            const fileName = `deliverables/${file.fieldname}-${uniqueSuffix}${ext}`;
            cb(null, fileName);
        },
    }),
    limits: { fileSize: 150 * 1024 * 1024 },
});
