import express from 'express';
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
router.use(protect);
router.use(hipaaLogger);
// Apply encryption middleware in production
if (process.env.NODE_ENV === 'production') {
    router.use(decryptRequest);
    router.use(encryptResponse);
}
// File routes
router.post('/upload', upload.single('file'), fileController.uploadFile);
router.get('/download/:fileId', fileController.downloadFile);
router.delete('/:fileId', fileController.deleteFile);
export default router;
//# sourceMappingURL=files.js.map