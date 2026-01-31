import multer from 'multer';
import { Request } from 'express';
import { getFileExtension, isAllowedExtension } from '../utils/path-utils';

/**
 * Multer configuration for file uploads
 */

const storage = multer.memoryStorage();

const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const ext = getFileExtension(file.originalname);
  
  if (isAllowedExtension(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${ext} is not allowed. Only .json, .yaml, .yml files are supported.`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '5242880', 10), // 5MB default
  },
});
