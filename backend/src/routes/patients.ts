import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { restrictTo } from '../middleware/auth.js';
import { hipaaLogger } from '../middleware/hipaaLogger.js';
import { encryptResponse } from '../middleware/encryption.js';
import { patientController } from '../controllers/patient.controller.js';
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

// Patient profile routes
router.route('/profile')
  .get(
    restrictTo(Role.PATIENT, Role.PROVIDER, Role.ADMIN) as RequestHandler,
    patientController.getPatientProfile as RequestHandler
  )
  .put(
    restrictTo(Role.PATIENT, Role.ADMIN) as RequestHandler,
    patientController.updatePatientProfile as RequestHandler
  );

// Medical records routes
router.route('/medical-records')
  .get(
    restrictTo(Role.PATIENT, Role.PROVIDER, Role.ADMIN) as RequestHandler,
    patientController.getPatientMedicalRecords as RequestHandler
  )
  .post(
    restrictTo(Role.PROVIDER, Role.ADMIN) as RequestHandler,
    patientController.addMedicalRecord as RequestHandler
  );

// Health metrics routes
router.route('/health-metrics')
  .get(
    restrictTo(Role.PATIENT, Role.PROVIDER, Role.ADMIN) as RequestHandler,
    patientController.getPatientHealthMetrics as RequestHandler
  )
  .post(
    restrictTo(Role.PATIENT, Role.ADMIN) as RequestHandler,
    patientController.addHealthMetric as RequestHandler
  );

// Provider relationship routes
router.route('/providers')
  .get(
    restrictTo(Role.PATIENT, Role.ADMIN) as RequestHandler,
    patientController.getPatientProviders as RequestHandler
  )
  .post(
    restrictTo(Role.PATIENT, Role.ADMIN) as RequestHandler,
    patientController.addProviderRelationship as RequestHandler
  );

export default router; 