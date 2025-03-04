import express from 'express';
import type { RequestHandler } from 'express';
import multer from 'multer';
import * as fileController from '../controllers/file.controller.js';
import { protect } from '../middleware/auth.js';
import { encryptResponse, decryptRequest, hipaaLogger } from '../middleware/encryption.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Apply protection and HIPAA logging to all routes
router.use(protect as unknown as RequestHandler);
router.use(hipaaLogger as unknown as RequestHandler);

// Apply encryption middleware in production
if (process.env.NODE_ENV === 'production') {
  router.use(decryptRequest as unknown as RequestHandler);
  router.use(encryptResponse as unknown as RequestHandler);
}

// File routes
router.post(
  '/upload',
  upload.single('file'),
  fileController.uploadFile as unknown as RequestHandler
);

router.get(
  '/download/:fileId',
  fileController.downloadFile as unknown as RequestHandler
);

router.delete(
  '/:fileId',
  fileController.deleteFile as unknown as RequestHandler
);

export default router; 