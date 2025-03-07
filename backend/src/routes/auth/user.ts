import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import cognitoMfaService from '../../services/aws/cognito-mfa-service.js';
import { logger } from '../../utils/logger.js';
import { CognitoService } from '../../services/aws/cognito-service.js';

const router = Router();
const cognitoService = new CognitoService();

// All routes require authentication
router.use(protect);

/**
 * Get current user attributes
 * GET /auth/user
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
    
    const user = await cognitoService.getUser(accessToken);
    
    return res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    logger.error('Error getting user attributes:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while getting user attributes'
    });
  }
});

/**
 * Update user attributes
 * PUT /auth/user
 */
router.put('/', async (req, res) => {
  try {
    const { attributes } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    if (!attributes || Object.keys(attributes).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Attributes are required'
      });
    }
    
    await cognitoService.updateUserAttributes(accessToken, attributes);
    
    return res.status(200).json({
      success: true,
      message: 'User attributes updated successfully'
    });
  } catch (error) {
    logger.error('Error updating user attributes:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating user attributes'
    });
  }
});

/**
 * Request verification code for an attribute
 * POST /auth/user/request-verification
 */
router.post('/request-verification', async (req, res) => {
  try {
    const { attribute } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    if (!attribute || !['email', 'phone_number'].includes(attribute)) {
      return res.status(400).json({
        success: false,
        message: 'Valid attribute is required (email or phone_number)'
      });
    }
    
    const result = await cognitoMfaService.requestAttributeVerification(accessToken, attribute);
    
    return res.status(200).json({
      success: true,
      message: `Verification code sent to ${result.destination}`,
      destination: result.destination,
      attribute: result.attributeName
    });
  } catch (error) {
    logger.error('Error requesting verification code:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while requesting the verification code'
    });
  }
});

/**
 * Verify an attribute
 * POST /auth/user/verify
 */
router.post('/verify', async (req, res) => {
  try {
    const { attribute, code } = req.body;
    const accessToken = req.headers.authorization?.replace('Bearer ', '');
    
    if (!accessToken) {
      return res.status(401).json({
        success: false,
        message: 'Access token is required'
      });
    }
    
    if (!attribute || !['email', 'phone_number'].includes(attribute)) {
      return res.status(400).json({
        success: false,
        message: 'Valid attribute is required (email or phone_number)'
      });
    }
    
    if (!code) {
      return res.status(400).json({
        success: false,
        message: 'Verification code is required'
      });
    }
    
    await cognitoMfaService.verifyUserAttribute(accessToken, attribute, code);
    
    return res.status(200).json({
      success: true,
      message: `${attribute === 'email' ? 'Email' : 'Phone number'} verified successfully`
    });
  } catch (error) {
    logger.error('Error verifying attribute:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while verifying the attribute'
    });
  }
});

export default router; 