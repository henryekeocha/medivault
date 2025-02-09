import express from 'express';
import { protect } from '../middleware/auth.js';
import multer from 'multer';
import {
  uploadImage,
  getImages,
  getImage,
  deleteImage,
  updateImageMetadata,
  shareImage,
  getSharedImage,
  addAnnotation,
  getAnnotations,
  deleteAnnotation,
} from '../controllers/image.controller.js';

const router = express.Router();

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

// Public routes
router.get('/shared/:token', getSharedImage);

// Protected routes
router.use(protect);

// Image routes
router.post('/', upload.single('image'), uploadImage);
router.get('/', getImages);
router.get('/:id', getImage);
router.delete('/:id', deleteImage);
router.patch('/:id/metadata', updateImageMetadata);
router.post('/:id/share', shareImage);

// Annotation routes
router.post('/:id/annotations', addAnnotation);
router.get('/:id/annotations', getAnnotations);
router.delete('/:id/annotations/:annotationId', deleteAnnotation);

export default router; 