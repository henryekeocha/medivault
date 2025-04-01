import express from 'express';
import {
  createAppointment,
  listAppointments,
  getAppointment,
  updateAppointment,
  cancelAppointment
} from '../controllers/appointment.controller.js';
import { protect, restrictTo } from '../middleware/clerk.js';
import { Role } from '@prisma/client';

const router = express.Router();

// All routes require authentication
router.use(protect);

// Routes accessible by both patients and providers
router.get('/', listAppointments as express.RequestHandler);
router.get('/:id', getAppointment as express.RequestHandler);

// Routes restricted to providers only
router.use(restrictTo(Role.PROVIDER));

router.post('/', createAppointment as express.RequestHandler);
router.patch('/:id', updateAppointment as express.RequestHandler);
router.delete('/:id', cancelAppointment as express.RequestHandler);

export default router; 