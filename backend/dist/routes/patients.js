import { Router } from 'express';
import { protect } from '../middleware/clerk.js';
import { restrictTo } from '../middleware/clerk.js';
import { hipaaLogger } from '../middleware/hipaaLogger.js';
import { encryptResponse } from '../middleware/encryption.js';
import { patientController } from '../controllers/patient.controller.js';
import { Role } from '@prisma/client';
const router = Router();
// Apply protection middleware to all routes
router.use(protect);
router.use(hipaaLogger);
// Conditionally apply encryption middleware based on environment
if (process.env.NODE_ENV === 'production') {
    router.use(encryptResponse);
}
// Patient profile routes
router.route('/profile')
    .get(restrictTo(Role.PATIENT, Role.PROVIDER, Role.ADMIN), patientController.getPatientProfile)
    .put(restrictTo(Role.PATIENT, Role.ADMIN), patientController.updatePatientProfile);
// Medical records routes
router.route('/medical-records')
    .get(restrictTo(Role.PATIENT, Role.PROVIDER, Role.ADMIN), patientController.getPatientMedicalRecords)
    .post(restrictTo(Role.PROVIDER, Role.ADMIN), patientController.addMedicalRecord);
// Health metrics routes
router.route('/health-metrics')
    .get(restrictTo(Role.PATIENT, Role.PROVIDER, Role.ADMIN), patientController.getPatientHealthMetrics)
    .post(restrictTo(Role.PATIENT, Role.ADMIN), patientController.addHealthMetric);
// Provider relationship routes
router.route('/providers')
    .get(restrictTo(Role.PATIENT, Role.ADMIN), patientController.getPatientProviders)
    .post(restrictTo(Role.PATIENT, Role.ADMIN), patientController.addProviderRelationship);
export default router;
//# sourceMappingURL=patients.js.map