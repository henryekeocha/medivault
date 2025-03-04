import express from 'express';
import { protect } from '../middleware/auth.js';
import { getSettings, updateSettings, updatePassword, toggleTwoFactor, generateBackupCodes, } from '../controllers/settings.controller.js';
const router = express.Router();
// Protected routes
router.use(protect);
// Settings routes
router.get('/', getSettings);
router.patch('/', updateSettings);
router.patch('/password', updatePassword);
router.patch('/2fa', toggleTwoFactor);
router.post('/backup-codes', generateBackupCodes);
export default router;
//# sourceMappingURL=settings.js.map