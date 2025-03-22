import { Router } from 'express';
import { logger } from '../../utils/logger.js'; 
import { prisma } from '../../lib/prisma.js';

/**
 * Router for social login endpoints
 */
const router = Router();

/**
 * Get social login authorization URL
 * POST /auth/social-login/:provider
 */
router.post('/:provider', async (req, res) => {
  try {
    const { provider } = req.params;
    
    if (provider !== 'google' && provider !== 'facebook') {
      return res.status(400).json({
        success: false,
        message: 'Invalid identity provider',
      });
    }
    
    // Generate NextAuth sign-in URL for the provider
    const callbackUrl = encodeURIComponent(`${process.env.NEXTAUTH_URL}/api/auth/callback/${provider}`);
    const authUrl = `${process.env.NEXTAUTH_URL}/api/auth/signin/${provider}?callbackUrl=${callbackUrl}`;
    
    // Log the social login attempt
    logger.info(`Social login initiated with provider: ${provider}`);
    
    return res.status(200).json({
      success: true,
      authUrl,
    });
  } catch (error) {
    logger.error('Error initiating social login:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while initiating social login',
    });
  }
});

/**
 * Handle OAuth callback from social identity providers
 * GET /auth/social-login/callback
 */
router.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query;
    
    if (!code) {
      logger.error('No authorization code received from OAuth provider');
      return res.status(400).json({
        success: false,
        message: 'No authorization code received',
      });
    }
    
    // NextAuth handles the token exchange automatically
    // This endpoint can be used for additional processing if needed
    
    logger.info('Social login callback received', { meta: { code, state } });
    
    // Redirect to frontend with success
    return res.redirect(`${process.env.FRONTEND_URL}/auth/social-callback?success=true`);
  } catch (error) {
    logger.error('Error processing social login callback:', error);
    // Redirect to frontend with error
    return res.redirect(`${process.env.FRONTEND_URL}/auth/social-callback?success=false&error=callback_error`);
  }
});

/**
 * Get configured social identity providers
 * GET /auth/social-login/providers
 */
router.get('/providers', async (req, res) => {
  try {
    // We're now using NextAuth's built-in providers
    const providers = [
      { name: 'Google', type: 'OAuth' },
      { name: 'Facebook', type: 'OAuth' }
    ];
    
    // Only include providers that have credentials configured
    const configuredProviders = providers.filter(p => {
      if (p.name === 'Google') {
        return process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET;
      } else if (p.name === 'Facebook') {
        return process.env.FACEBOOK_CLIENT_ID && process.env.FACEBOOK_CLIENT_SECRET;
      }
      return false;
    });
    
    return res.status(200).json({
      success: true,
      providers: configuredProviders,
    });
  } catch (error) {
    logger.error('Error getting social identity providers:', error);
    return res.status(500).json({
      success: false,
      message: 'An error occurred while getting social identity providers',
    });
  }
});

export default router; 