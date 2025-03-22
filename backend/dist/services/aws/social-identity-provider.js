import { logger } from '../../utils/logger.js';
/**
 * Service for managing NextAuth OAuth providers
 * (Replacement for the previous Cognito-based social identity provider)
 */
export class SocialIdentityProviderService {
    // Configuration
    googleClientId;
    googleClientSecret;
    facebookAppId;
    facebookAppSecret;
    nextAuthUrl;
    constructor() {
        // Initialize from environment variables
        this.googleClientId = process.env.GOOGLE_CLIENT_ID || '';
        this.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET || '';
        this.facebookAppId = process.env.FACEBOOK_CLIENT_ID || '';
        this.facebookAppSecret = process.env.FACEBOOK_CLIENT_SECRET || '';
        this.nextAuthUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        console.log(`Initializing Social Identity Provider service with NextAuth providers:
      Google Client ID: ${this.googleClientId ? this.googleClientId.substring(0, 5) + '...' : 'Not set'}
      Facebook App ID: ${this.facebookAppId ? this.facebookAppId.substring(0, 5) + '...' : 'Not set'}
      NextAuth URL: ${this.nextAuthUrl}
    `);
        if (!this.googleClientId || !this.googleClientSecret) {
            console.warn('Google OAuth credentials not set for Social Identity Provider service');
        }
        if (!this.facebookAppId || !this.facebookAppSecret) {
            console.warn('Facebook OAuth credentials not set for Social Identity Provider service');
        }
    }
    /**
     * Get list of configured identity providers
     * @returns List of configured providers
     */
    async listIdentityProviders() {
        try {
            const providers = [];
            if (this.googleClientId && this.googleClientSecret) {
                providers.push({
                    name: 'Google',
                    enabled: true
                });
            }
            if (this.facebookAppId && this.facebookAppSecret) {
                providers.push({
                    name: 'Facebook',
                    enabled: true
                });
            }
            return providers;
        }
        catch (error) {
            logger.error('Error listing identity providers:', error);
            throw error;
        }
    }
    /**
     * Check if a provider is already configured
     * @param providerName The name of the provider (e.g., 'Google', 'Facebook')
     * @returns Whether the provider is configured
     */
    async isProviderConfigured(providerName) {
        if (providerName === 'Google') {
            return !!(this.googleClientId && this.googleClientSecret);
        }
        else if (providerName === 'Facebook') {
            return !!(this.facebookAppId && this.facebookAppSecret);
        }
        return false;
    }
    /**
     * Configure Google as an identity provider
     * @param clientId Google OAuth client ID
     * @param clientSecret Google OAuth client secret
     * @returns Success status
     */
    async configureGoogleProvider(clientId, clientSecret) {
        try {
            // With NextAuth, we store these in environment variables
            // This would typically update environment variables or database settings
            this.googleClientId = clientId;
            this.googleClientSecret = clientSecret;
            logger.info('Google OAuth provider configured');
            return { success: true, message: 'Google provider configured' };
        }
        catch (error) {
            logger.error('Error configuring Google provider:', error);
            throw error;
        }
    }
    /**
     * Configure Facebook as an identity provider
     * @param appId Facebook App ID
     * @param appSecret Facebook App Secret
     * @returns Success status
     */
    async configureFacebookProvider(appId, appSecret) {
        try {
            // With NextAuth, we store these in environment variables
            // This would typically update environment variables or database settings
            this.facebookAppId = appId;
            this.facebookAppSecret = appSecret;
            logger.info('Facebook OAuth provider configured');
            return { success: true, message: 'Facebook provider configured' };
        }
        catch (error) {
            logger.error('Error configuring Facebook provider:', error);
            throw error;
        }
    }
    /**
     * Generate the authorization URL for a social identity provider
     * @param provider The identity provider (e.g., 'Google', 'Facebook')
     * @returns The authorization URL
     */
    getAuthorizationUrl(provider) {
        // With NextAuth.js, the authorization URL is handled internally by NextAuth
        // This is just a compatibility function that returns the sign-in URL with the right provider
        return `${this.nextAuthUrl}/api/auth/signin/${provider.toLowerCase()}`;
    }
}
export default new SocialIdentityProviderService();
//# sourceMappingURL=social-identity-provider.js.map