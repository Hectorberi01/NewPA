"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.downloadFromS3 = downloadFromS3;
const client_s3_1 = require("@aws-sdk/client-s3");
const aws_config_1 = require("../config/aws.config");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const stream_1 = require("stream");
const util_1 = require("util");
const streamPipeline = (0, util_1.promisify)(stream_1.pipeline);
async function downloadFromS3(fileUrl) {
    const bucketName = process.env.AWS_S3_BUCKET;
    const tmpDir = path_1.default.join(process.cwd(), "tmp");
    if (!fs_1.default.existsSync(tmpDir))
        fs_1.default.mkdirSync(tmpDir);
    const key = decodeURIComponent(new URL(fileUrl).pathname.replace(/^\/+/, "").replace(`${bucketName}/`, ""));
    const localPath = path_1.default.join(tmpDir, path_1.default.basename(key));
    const command = new client_s3_1.GetObjectCommand({ Bucket: bucketName, Key: key });
    const { Body } = await aws_config_1.s3Client.send(command);
    await streamPipeline(Body, fs_1.default.createWriteStream(localPath));
    return localPath;
}
