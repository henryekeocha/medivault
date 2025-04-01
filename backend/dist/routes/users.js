import { Router } from 'express';
import { protect } from '../middleware/clerk.js';
import { restrictTo } from '../middleware/clerk.js';
import { userController } from '../controllers/user.controller.js';
import { Role } from '@prisma/client';
const router = Router();
// Apply protection middleware to all routes
router.use(protect);
// Profile routes - available to all authenticated users
router.route('/profile')
    .get(userController.getProfile)
    .put(userController.updateProfile);
// Restrict user management routes to Provider
router.use(restrictTo(Role.PROVIDER));
// User management routes
router.route('/')
    .get(userController.getAllUsers)
    .post(userController.createUser);
router.route('/:id')
    .get(userController.getUser)
    .put(userController.updateUser)
    .delete(userController.deleteUser);
export default router;
//# sourceMappingURL=users.js.map