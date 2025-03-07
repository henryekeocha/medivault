import { Router } from 'express';
import { CognitoService } from '../../services/aws/cognito-service.js';
import socialIdentityProviderService from '../../services/aws/social-identity-provider.js';
import { logger } from '../../utils/logger.js';
/**
 * Router for social login endpoints
 */
const router = Router();
const cognitoService = new CognitoService();
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
        // Generate authorization URL for the provider
        const authUrl = socialIdentityProviderService.getAuthorizationUrl(provider === 'google' ? 'Google' : 'Facebook');
        // Log the social login attempt
        logger.info(`Social login initiated with provider: ${provider}`);
        return res.status(200).json({
            success: true,
            authUrl,
        });
    }
    catch (error) {
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
        // Exchange code for tokens
        // Note: This would typically be handled by Cognito directly with the proper hosted UI setup
        // This endpoint serves as a fallback or for custom integration
        // In a real implementation, you would:
        // 1. Exchange the code for tokens using Cognito's token endpoint
        // 2. Verify the tokens
        // 3. Create or retrieve the user in your database
        // 4. Generate session tokens
        logger.info('Social login callback received', { meta: { code, state } });
        // Redirect to frontend with success
        return res.redirect(`${process.env.FRONTEND_URL}/auth/social-callback?success=true`);
    }
    catch (error) {
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
        const providers = await socialIdentityProviderService.listIdentityProviders();
        return res.status(200).json({
            success: true,
            providers: providers.map(p => ({
                name: p.ProviderName,
                type: p.ProviderType,
            })),
        });
    }
    catch (error) {
        logger.error('Error getting social identity providers:', error);
        return res.status(500).json({
            success: false,
            message: 'An error occurred while getting social identity providers',
        });
    }
});
export default router;
//# sourceMappingURL=social-login.js.map