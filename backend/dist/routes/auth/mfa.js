import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import cognitoMfaService from '../../services/aws/cognito-mfa-service.js';
import { logger } from '../../utils/logger.js';
const router = Router();
// All routes require authentication
router.use(protect);
/**
 * Generate a new TOTP secret
 * POST /auth/mfa/totp/setup
 */
router.post('/totp/setup', async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }
        const secretCode = await cognitoMfaService.associateSoftwareToken(accessToken);
        return res.status(200).json({
            success: true,
            secretCode
        });
    }
    catch (error) {
        logger.error('Error setting up TOTP:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while setting up TOTP'
        });
    }
});
/**
 * Verify TOTP setup
 * POST /auth/mfa/totp/verify
 */
router.post('/totp/verify', async (req, res) => {
    try {
        const { code, deviceName } = req.body;
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        const username = req.user?.username;
        if (!accessToken) {
            return res.status(401).json({
                success: false,
                message: 'Access token is required'
            });
        }
        if (!code) {
            return res.status(400).json({
                success: false,
                message: 'Verification code is required'
            });
        }
        const status = await cognitoMfaService.verifySoftwareToken(accessToken, code, deviceName);
        if (status === 'SUCCESS' && username) {
            // Set TOTP as the preferred MFA method
            await cognitoMfaService.setTotpPreferred(username, accessToken);
        }
        return res.status(200).json({
            success: status === 'SUCCESS',
            status
        });
    }
    catch (error) {
        logger.error('Error verifying TOTP:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while verifying TOTP'
        });
    }
});
/**
 * Set SMS as preferred MFA method
 * POST /auth/mfa/sms/verify
 */
router.post('/sms/verify', async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        const username = req.user?.username;
        if (!accessToken || !username) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        await cognitoMfaService.setSmsPreferred(username, accessToken);
        return res.status(200).json({
            success: true,
            message: 'SMS MFA has been set as your preferred method'
        });
    }
    catch (error) {
        logger.error('Error setting SMS as preferred MFA method:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while setting SMS as your preferred MFA method'
        });
    }
});
/**
 * Set preferred MFA method
 * PUT /auth/mfa/preferred
 */
router.put('/preferred', async (req, res) => {
    try {
        const { method } = req.body;
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        const username = req.user?.username;
        if (!accessToken || !username) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        if (!method || !['TOTP', 'SMS', 'NONE'].includes(method)) {
            return res.status(400).json({
                success: false,
                message: 'Valid method is required (TOTP, SMS, or NONE)'
            });
        }
        await cognitoMfaService.setPreferredMfaMethod(username, method, accessToken);
        return res.status(200).json({
            success: true,
            message: `MFA method set to ${method}`
        });
    }
    catch (error) {
        logger.error('Error setting preferred MFA method:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while setting your preferred MFA method'
        });
    }
});
/**
 * Disable MFA
 * PUT /auth/mfa/disable
 */
router.put('/disable', async (req, res) => {
    try {
        const accessToken = req.headers.authorization?.replace('Bearer ', '');
        const username = req.user?.username;
        if (!accessToken || !username) {
            return res.status(401).json({
                success: false,
                message: 'Authentication required'
            });
        }
        await cognitoMfaService.disableMfa(username, accessToken);
        return res.status(200).json({
            success: true,
            message: 'MFA has been disabled'
        });
    }
    catch (error) {
        logger.error('Error disabling MFA:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while disabling MFA'
        });
    }
});
export default router;
//# sourceMappingURL=mfa.js.map