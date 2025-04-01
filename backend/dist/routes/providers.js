import { Router } from 'express';
import { protect } from '../middleware/clerk.js';
import { restrictTo } from '../middleware/clerk.js';
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
// Provider directory route
router.route('/')
    .get(providerController.getAllProviders);
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
// Provider availability routes
router.route('/availability/hours')
    .get(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.getProviderWorkingHours)
    .post(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.saveProviderWorkingHours);
router.route('/availability/blocks')
    .get(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.getProviderAvailabilityBlocks)
    .post(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.addProviderAvailabilityBlock)
    .put(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.saveProviderAvailabilityBlocks);
router.route('/availability/blocks/:blockId')
    .delete(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.removeProviderAvailabilityBlock);
router.route('/availability/blocked')
    .get(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.getProviderBlockedTimes)
    .post(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.addProviderBlockedTime)
    .put(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.saveProviderBlockedTimes);
router.route('/availability/blocked/:blockedTimeId')
    .delete(restrictTo(Role.PROVIDER, Role.ADMIN), providerController.removeProviderBlockedTime);
export default router;
//# sourceMappingURL=providers.js.map