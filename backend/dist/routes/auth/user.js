import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { prisma } from '../../lib/prisma.js';
const router = Router();
// All routes require authentication
router.use(protect);
/**
 * Get current user attributes
 * GET /auth/user
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        // Get user from database
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                emailVerified: true,
                twoFactorEnabled: true,
                specialty: true,
                image: true,
                createdAt: true,
                updatedAt: true
            }
        });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }
        return res.status(200).json({
            success: true,
            user
        });
    }
    catch (error) {
        logger.error('Error getting user attributes:', error);
        return res.status(500).json({
            success: false,
            message: 'Error getting user attributes'
        });
    }
});
/**
 * Update user attributes
 * PUT /auth/user
 */
router.put('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        const attributes = req.body;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        // Sanitize the input - only allow specific fields to be updated
        const allowedFields = ['name', 'image', 'specialty'];
        const sanitizedData = {};
        for (const field of allowedFields) {
            if (attributes[field] !== undefined) {
                sanitizedData[field] = attributes[field];
            }
        }
        // Update user in database
        const updatedUser = await prisma.user.update({
            where: { id: userId },
            data: sanitizedData,
            select: {
                id: true,
                email: true,
                name: true,
                role: true,
                emailVerified: true,
                twoFactorEnabled: true,
                specialty: true,
                image: true,
                createdAt: true,
                updatedAt: true
            }
        });
        return res.status(200).json({
            success: true,
            user: updatedUser
        });
    }
    catch (error) {
        logger.error('Error updating user attributes:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating user attributes'
        });
    }
});
/**
 * Request verification for an attribute (like email)
 * POST /auth/user/verify
 */
router.post('/verify', async (req, res) => {
    try {
        const { attribute } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        if (!attribute || typeof attribute !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Attribute name is required'
            });
        }
        // For now, we'll just pretend we sent a verification code
        // In a real implementation, you'd send an email with a verification link
        return res.status(200).json({
            success: true,
            message: `Verification code sent for ${attribute}`,
            destination: 'email' // Or 'phone_number' for SMS
        });
    }
    catch (error) {
        logger.error('Error requesting attribute verification:', error);
        return res.status(500).json({
            success: false,
            message: 'Error requesting attribute verification'
        });
    }
});
/**
 * Verify an attribute with a code
 * POST /auth/user/verify/confirm
 */
router.post('/verify/confirm', async (req, res) => {
    try {
        const { attribute, code } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not found'
            });
        }
        if (!attribute || !code) {
            return res.status(400).json({
                success: false,
                message: 'Attribute name and verification code are required'
            });
        }
        // For demo purposes, we'll just mark the email as verified if the code is '123456'
        if (attribute === 'email' && code === '123456') {
            await prisma.user.update({
                where: { id: userId },
                data: { emailVerified: new Date() }
            });
            return res.status(200).json({
                success: true,
                message: 'Email verification successful'
            });
        }
        return res.status(400).json({
            success: false,
            message: 'Invalid verification code'
        });
    }
    catch (error) {
        logger.error('Error confirming attribute verification:', error);
        return res.status(500).json({
            success: false,
            message: 'Error confirming attribute verification'
        });
    }
});
export default router;
//# sourceMappingURL=user.js.map