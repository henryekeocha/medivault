import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import mfaService from '../../services/auth/mfa-service.js';
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
    
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const secretCode = await mfaService.generateTotpSecret(userId);
    
    return res.status(200).json({
      success: true,
      secretCode,
    });
  } catch (error) {
    logger.error('Error setting up TOTP MFA:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while setting up TOTP MFA'
    });
  }
});

/**
 * Verify a TOTP token
 * POST /auth/mfa/totp/verify
 */
router.post('/totp/verify', async (req, res) => {
  try {
    const { token } = req.body;
    const userId = req.user?.id;
    
    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Token is required'
      });
    }
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const isValid = await mfaService.verifyTotpToken(userId, token);
    
    if (!isValid) {
      return res.status(400).json({
        success: false,
        message: 'Invalid token'
      });
    }
    
    // Enable MFA for the user
    await mfaService.enableMfa(userId);
    
    return res.status(200).json({
      success: true,
      message: 'TOTP MFA verified and enabled'
    });
  } catch (error) {
    logger.error('Error verifying TOTP token:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while verifying TOTP token'
    });
  }
});

/**
 * Disable MFA
 * POST /auth/mfa/disable
 */
router.post('/disable', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    await mfaService.disableMfa(userId);
    
    return res.status(200).json({
      success: true,
      message: 'MFA disabled successfully'
    });
  } catch (error) {
    logger.error('Error disabling MFA:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while disabling MFA'
    });
  }
});

/**
 * Get MFA status
 * GET /auth/mfa/status
 */
router.get('/status', async (req, res) => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }
    
    const status = await mfaService.getMfaStatus(userId);
    
    return res.status(200).json({
      success: true,
      data: status
    });
  } catch (error) {
    logger.error('Error getting MFA status:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while getting MFA status'
    });
  }
});

export default router; 