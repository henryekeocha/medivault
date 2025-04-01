import express from 'express';
import { protect } from '../../../middleware/clerk.js';
import { getPatientSettings, updatePatientSettings } from '../../../controllers/v1/patient/settings.controller.js';

const router = express.Router();

// Protected routes
router.use(protect);

// Patient settings routes
router.get('/', getPatientSettings);
router.put('/', updatePatientSettings);

export default router; 