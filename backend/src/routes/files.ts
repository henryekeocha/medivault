import { Router } from 'express';
import { protect } from '../middleware/clerk.js';
import { 
  uploadFile, 
  downloadFile, 
  deleteFile 
} from '../controllers/file.controller.js';
import type { RequestHandler } from 'express';

const router = Router();

// Apply protection middleware to all routes
router.use(protect as RequestHandler);

// File upload routes
router.route('/upload')
  .post(uploadFile as RequestHandler);

// File management routes
router.route('/')
  .get((req, res, next) => res.status(501).json({ message: 'Not implemented' }))
  .post((req, res, next) => res.status(501).json({ message: 'Not implemented' }));

router.route('/:id')
  .get(downloadFile as RequestHandler)
  .put((req, res, next) => res.status(501).json({ message: 'Not implemented' }))
  .delete(deleteFile as RequestHandler);

// File sharing routes
router.route('/:id/share')
  .post((req, res, next) => res.status(501).json({ message: 'Not implemented' }))
  .get((req, res, next) => res.status(501).json({ message: 'Not implemented' }));

router.route('/:id/unshare')
  .post((req, res, next) => res.status(501).json({ message: 'Not implemented' }));

export default router; 