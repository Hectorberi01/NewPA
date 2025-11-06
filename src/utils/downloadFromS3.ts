import { GetObjectCommand } from "@aws-sdk/client-s3";
import { s3Client } from "../config/aws.config";
import fs from "fs";
import path from "path";
import { pipeline } from "stream";
import { promisify } from "util";

const streamPipeline = promisify(pipeline);

export async function downloadFromS3(fileUrl: string): Promise<string> {
  const bucketName = process.env.AWS_S3_BUCKET!;
  const tmpDir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir);

  const key = decodeURIComponent(
    new URL(fileUrl).pathname.replace(/^\/+/, "").replace(`${bucketName}/`, "")
  );

  const localPath = path.join(tmpDir, path.basename(key));
  const command = new GetObjectCommand({ Bucket: bucketName, Key: key });
  const { Body } = await s3Client.send(command);

  await streamPipeline(Body as any, fs.createWriteStream(localPath));
  return localPath;
}
