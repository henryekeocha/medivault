import express, { RequestHandler } from 'express';
import * as appointmentController from '../controllers/appointment.controller.js';
import { protect } from '../middleware/auth.js';
import { hipaaLogger } from '../middleware/encryption.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply protection and HIPAA logging to all routes
router.use('/', protect as RequestHandler);
router.use('/', hipaaLogger as RequestHandler);

// Apply rate limiting to appointment endpoints
const appointmentRateLimit = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// Appointment routes
router.post( 
  '/',
  appointmentRateLimit as RequestHandler,
  appointmentController.createAppointment as RequestHandler
);

router.patch(
  '/:id',
  appointmentRateLimit as RequestHandler,
  appointmentController.updateAppointment as RequestHandler
);

router.get(
  '/',
  appointmentController.listAppointments as RequestHandler
);

router.get(
  '/:id',
  appointmentController.getAppointment as RequestHandler
);

router.delete(
  '/:id',
  appointmentController.cancelAppointment as RequestHandler
);

// This route doesn't exist in the controller - it needs to be implemented or removed
// For now, we'll use a placeholder to make TypeScript happy
router.get(
  '/provider/:providerId/availability',
  ((req, res, next) => {
    res.status(501).json({
      status: 'error',
      message: 'Provider availability endpoint not implemented yet'
    });
  }) as RequestHandler
);

export default router; 