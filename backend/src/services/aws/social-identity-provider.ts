import {
  CognitoIdentityProviderClient,
  ListIdentityProvidersCommand,
  UpdateIdentityProviderCommand,
  CreateIdentityProviderCommand,
  IdentityProviderType
} from '@aws-sdk/client-cognito-identity-provider';
import { cognitoConfig } from './cognito-config.js';
import { logger } from '../../utils/logger.js'; 

/**
 * Service for managing social identity providers in Cognito
 */
export class SocialIdentityProviderService {
  private client: CognitoIdentityProviderClient;
  private userPoolId: string;

  constructor() {
    // Initialize the Cognito client
    this.client = new CognitoIdentityProviderClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });

    // Set the User Pool ID from environment variables
    this.userPoolId = process.env.COGNITO_USER_POOL_ID || cognitoConfig.userPoolId;

    if (!this.userPoolId) {
      logger.warn('Cognito User Pool ID not set');
    }
  }

  /**
   * Get list of configured identity providers
   * @returns List of identity providers
   */
  async listIdentityProviders() {
    try {
      const command = new ListIdentityProvidersCommand({
        UserPoolId: this.userPoolId,
      });

      const response = await this.client.send(command);
      return response.Providers || [];
    } catch (error) {
      logger.error('Error listing identity providers:', error);
      throw error;
    }
  }

  /**
   * Check if a provider is already configured
   * @param providerName The name of the provider (e.g., 'Google', 'Facebook')
   * @returns Whether the provider is configured
   */
  async isProviderConfigured(providerName: string): Promise<boolean> {
    const providers = await this.listIdentityProviders();
    return providers.some((provider: IdentityProviderType) => provider.ProviderName === providerName);
  }

  /**
   * Configure Google as an identity provider
   * @param clientId Google OAuth client ID
   * @param clientSecret Google OAuth client secret 
   * @returns Result of the operation
   */
  async configureGoogleProvider(clientId: string, clientSecret: string) {
    try {
      const isConfigured = await this.isProviderConfigured('Google');
      const providerDetails = {
        client_id: clientId,
        client_secret: clientSecret,
        authorize_scopes: 'email profile openid',
      };

      if (isConfigured) {
        // Update existing provider
        const command = new UpdateIdentityProviderCommand({
          UserPoolId: this.userPoolId,
          ProviderName: 'Google',
          ProviderDetails: providerDetails,
          AttributeMapping: {
            email: 'email',
            name: 'name',
            given_name: 'given_name',
            family_name: 'family_name',
            picture: 'picture',
          },
        });

        return await this.client.send(command);
      } else {
        // Create new provider
        const command = new CreateIdentityProviderCommand({
          UserPoolId: this.userPoolId,
          ProviderName: 'Google',
          ProviderType: 'Google',
          ProviderDetails: providerDetails,
          AttributeMapping: {
            email: 'email',
            name: 'name',
            given_name: 'given_name',
            family_name: 'family_name',
            picture: 'picture',
          },
        });

        return await this.client.send(command);
      }
    } catch (error) {
      logger.error('Error configuring Google provider:', error);
      throw error;
    }
  }

  /**
   * Configure Facebook as an identity provider
   * @param appId Facebook App ID
   * @param appSecret Facebook App Secret
   * @returns Result of the operation
   */
  async configureFacebookProvider(appId: string, appSecret: string) {
    try {
      const isConfigured = await this.isProviderConfigured('Facebook');
      const providerDetails = {
        client_id: appId,
        client_secret: appSecret,
        authorize_scopes: 'email,public_profile',
      };

      if (isConfigured) {
        // Update existing provider
        const command = new UpdateIdentityProviderCommand({
          UserPoolId: this.userPoolId,
          ProviderName: 'Facebook',
          ProviderDetails: providerDetails,
          AttributeMapping: {
            email: 'email',
            name: 'name',
            picture: 'picture',
          },
        });

        return await this.client.send(command);
      } else {
        // Create new provider
        const command = new CreateIdentityProviderCommand({
          UserPoolId: this.userPoolId,
          ProviderName: 'Facebook',
          ProviderType: 'Facebook',
          ProviderDetails: providerDetails,
          AttributeMapping: {
            email: 'email',
            name: 'name',
            picture: 'picture',
          },
        });

        return await this.client.send(command);
      }
    } catch (error) {
      logger.error('Error configuring Facebook provider:', error);
      throw error;
    }
  }

  /**
   * Generate the authorization URL for a social identity provider
   * @param provider The identity provider (e.g., 'Google', 'Facebook')
   * @returns The authorization URL
   */
  getAuthorizationUrl(provider: 'Google' | 'Facebook'): string {
    const domain = cognitoConfig.oauth.domain;
    const clientId = cognitoConfig.clientId;
    const redirectUri = encodeURIComponent(cognitoConfig.oauth.redirectSignIn);
    const responseType = cognitoConfig.oauth.responseType;
    const scope = encodeURIComponent(cognitoConfig.oauth.scope.join(' '));
    
    return `https://${domain}/oauth2/authorize?identity_provider=${provider}&client_id=${clientId}&response_type=${responseType}&scope=${scope}&redirect_uri=${redirectUri}`;
  }
}

export default new SocialIdentityProviderService(); 