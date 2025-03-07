import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { CognitoService } from '../../services/aws/cognito-service.js';
import { logger } from '../../utils/logger.js';
const router = Router();
const cognitoService = new CognitoService();
/**
 * Refresh the session tokens
 * POST /auth/session/refresh
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;
        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: 'Refresh token is required'
            });
        }
        const tokens = await cognitoService.refreshSession(refreshToken);
        return res.status(200).json({
            success: true,
            ...tokens
        });
    }
    catch (error) {
        logger.error('Error refreshing session:', error);
        return res.status(401).json({
            success: false,
            message: 'Failed to refresh session. Please log in again.'
        });
    }
});
// Protected routes
router.use(protect);
/**
 * Get current session information
 * GET /auth/session
 */
router.get('/', async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }
        // Get the user information to verify the session is valid
        const user = await cognitoService.getUser(accessToken);
        return res.status(200).json({
            success: true,
            session: {
                isValid: true,
                username: user.Username,
                email: user.UserAttributes?.find(attr => attr.Name === 'email')?.Value
            }
        });
    }
    catch (error) {
        logger.error('Error getting session information:', error);
        return res.status(401).json({
            success: false,
            message: 'Invalid or expired session',
            session: {
                isValid: false
            }
        });
    }
});
/**
 * Invalidate the current session (sign out)
 * POST /auth/session/revoke
 */
router.post('/revoke', async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }
        await cognitoService.signOut(accessToken);
        return res.status(200).json({
            success: true,
            message: 'Session invalidated successfully'
        });
    }
    catch (error) {
        logger.error('Error revoking session:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while signing out'
        });
    }
});
export default router;
//# sourceMappingURL=session.js.map