import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { restrictTo } from '../middleware/auth.js';
import { hipaaLogger } from '../middleware/hipaaLogger.js';
import { encryptResponse } from '../middleware/encryption.js';
import { providerController } from '../controllers/provider.controller.js';
import { Role } from '@prisma/client';
const router = Router();
// Apply protection middleware to all routes
router.use(protect);
router.use(hipaaLogger);
// Conditionally apply encryption middleware based on environment
if (process.env.NODE_ENV === 'production') {
    router.use(encryptResponse);
}
// Provider profile routes
router.route('/profile')
    .get(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.getProviderProfile)
    .put(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.updateProviderProfile);
// Patient management routes
router.route('/patients')
    .get(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.getProviderPatients);
// Appointment management routes
router.route('/appointments')
    .get(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.getProviderAppointments)
    .post(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.scheduleAppointment);
// Medical record management routes
router.route('/medical-records')
    .get(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.getProviderMedicalRecords);
// Analytics routes
router.route('/analytics')
    .get(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.getProviderAnalytics);
export default router;
//# sourceMappingURL=providers.js.map