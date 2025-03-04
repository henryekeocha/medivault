import express from 'express';
import * as appointmentController from '../controllers/appointment.controller.js';
import { protect } from '../middleware/auth.js';
import { hipaaLogger } from '../middleware/encryption.js';
import { rateLimiter } from '../middleware/rateLimiter.js';
const router = express.Router();
// Apply protection and HIPAA logging to all routes
router.use('/', protect);
router.use('/', hipaaLogger);
// Apply rate limiting to appointment endpoints
const appointmentRateLimit = rateLimiter({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // limit each IP to 100 requests per windowMs
});
// Appointment routes
router.post('/', appointmentRateLimit, appointmentController.createAppointment[0], appointmentController.createAppointment[1]);
router.patch('/:id', appointmentRateLimit, appointmentController.updateAppointment[0], appointmentController.updateAppointment[1]);
router.get('/', appointmentController.getAppointments[0], appointmentController.getAppointments[1]);
router.get('/provider/:providerId/availability', appointmentController.getProviderAvailability);
export default router;
//# sourceMappingURL=appointments.js.map