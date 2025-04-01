import express from 'express';
import { createAppointment, listAppointments, getAppointment, updateAppointment, cancelAppointment } from '../controllers/appointment.controller.js';
import { protect, restrictTo } from '../middleware/clerk.js';
import { Role } from '@prisma/client';
const router = express.Router();
// All routes require authentication
router.use(protect);
// Routes accessible by both patients and providers
router.get('/', listAppointments);
router.get('/:id', getAppointment);
// Routes restricted to providers only
router.use(restrictTo(Role.PROVIDER));
router.post('/', createAppointment);
router.patch('/:id', updateAppointment);
router.delete('/:id', cancelAppointment);
export default router;
//# sourceMappingURL=appointments.js.map