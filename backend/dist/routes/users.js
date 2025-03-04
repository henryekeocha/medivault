import { Router } from 'express';
import { protect } from '../middleware/auth.js';
import { restrictTo } from '../middleware/auth.js';
import { userController } from '../controllers/user.controller.js';
import { Role } from '@prisma/client';
const router = Router();
// Apply protection middleware to all routes
router.use(protect);
// Restrict all user management routes to Admin
router.use(restrictTo(Role.ADMIN));
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