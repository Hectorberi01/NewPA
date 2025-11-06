// import multer from 'multer';
// import multerS3 from "multer-s3";
// import path from 'path';
// import { s3Client } from "../config/aws.config";

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

import multer from "multer";
import multerS3 from "multer-s3";
import path from "path";
import { s3Client } from "../config/aws.config";

const allowedTypes = [
  ".zip", ".rar", ".tar", ".gz", ".7z", ".csv", ".xlsx", ".xls", ".json", ".pdf",
  ".docx", ".doc", ".pptx", ".ppt", ".txt", ".md", ".jpg", ".jpeg", ".png", ".gif",
  ".bmp", ".svg"
];

export const uploadMiddleware = multer({
  storage: multerS3({
    s3: s3Client,
    bucket: process.env.AWS_S3_BUCKET!,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    acl: "public-read", // ou "private" si tu veux restreindre l’accès
    key: (req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase();
      if (!allowedTypes.includes(ext)) {
        return cb(new Error("Invalid file type"), "");
      }
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
      const fileName = `deliverables/${file.fieldname}-${uniqueSuffix}${ext}`;
      cb(null, fileName);
    },
  }),
  limits: { fileSize: 150 * 1024 * 1024 }, // 150 Mo
});
