import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { restrictTo } from '../middleware/auth.js';
import { hipaaLogger } from '../middleware/hipaaLogger.js';
import { encryptResponse } from '../middleware/encryption.js';
import { providerController } from '../controllers/provider.controller.js';
import { Role } from '@prisma/client';
import type { RequestHandler } from 'express';

const router = Router();

// Apply protection middleware to all routes
router.use(protect as RequestHandler);
router.use(hipaaLogger as RequestHandler);

// Conditionally apply encryption middleware based on environment
if (process.env.NODE_ENV === 'production') {
  router.use(encryptResponse as RequestHandler);
}

// Provider profile routes
router.route('/profile')
  .get(
    restrictTo(Role.PROVIDER, Role.ADMIN) as RequestHandler,
    providerController.getProviderProfile as RequestHandler
  )
  .put(
    restrictTo(Role.PROVIDER, Role.ADMIN) as RequestHandler,
    providerController.updateProviderProfile as RequestHandler
  );

// Patient management routes
router.route('/patients')
  .get(
    restrictTo(Role.PROVIDER, Role.ADMIN) as RequestHandler,
    providerController.getProviderPatients as RequestHandler
  );

// Appointment management routes
router.route('/appointments')
  .get(
    restrictTo(Role.PROVIDER, Role.ADMIN) as RequestHandler,
    providerController.getProviderAppointments as RequestHandler
  )
  .post(
    restrictTo(Role.PROVIDER, Role.ADMIN) as RequestHandler,
    providerController.scheduleAppointment as RequestHandler
  );

// Medical record management routes
router.route('/medical-records')
  .get(
    restrictTo(Role.PROVIDER, Role.ADMIN) as RequestHandler,
    providerController.getProviderMedicalRecords as RequestHandler
  );

// Analytics routes
router.route('/analytics')
  .get(
    restrictTo(Role.PROVIDER, Role.ADMIN) as RequestHandler,
    providerController.getProviderAnalytics as RequestHandler
  );

export default router; 