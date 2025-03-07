import { CognitoIdentityProviderClient, SetUserMFAPreferenceCommand, AdminSetUserMFAPreferenceCommand, VerifyUserAttributeCommand, GetUserAttributeVerificationCodeCommand, AssociateSoftwareTokenCommand, VerifySoftwareTokenCommand } from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '../../utils/logger.js';
/**
 * Service for managing Multi-Factor Authentication with AWS Cognito
 */
class CognitoMfaService {
    client;
    userPoolId;
    constructor() {
        this.client = new CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        this.userPoolId = process.env.COGNITO_USER_POOL_ID || '';
        if (!this.userPoolId) {
            logger.warn('Cognito User Pool ID not set in environment variables');
        }
    }
    /**
     * Set SMS as the preferred MFA method for a user
     * @param username User's username
     * @param accessToken User's access token (optional)
     */
    async setSmsPreferred(username, accessToken) {
        try {
            if (accessToken) {
                // Try with user's access token first
                const setMfaPreferenceCommand = new SetUserMFAPreferenceCommand({
                    AccessToken: accessToken,
                    SMSMfaSettings: {
                        Enabled: true,
                        PreferredMfa: true
                    }
                });
                await this.client.send(setMfaPreferenceCommand);
                logger.info(`Set SMS as preferred MFA for user ${username} using access token`);
                return;
            }
        }
        catch (error) {
            logger.error(`Error setting SMS MFA preference with access token for user ${username}:`, error);
        }
        // Fall back to admin version
        const adminSetMfaCommand = new AdminSetUserMFAPreferenceCommand({
            UserPoolId: this.userPoolId,
            Username: username,
            SMSMfaSettings: {
                Enabled: true,
                PreferredMfa: true
            }
        });
        await this.client.send(adminSetMfaCommand);
        logger.info(`Set SMS as preferred MFA for user ${username} using admin privileges`);
    }
    /**
     * Set TOTP as the preferred MFA method for a user
     * @param username User's username
     * @param accessToken User's access token (optional)
     */
    async setTotpPreferred(username, accessToken) {
        try {
            if (accessToken) {
                // Try with user's access token first
                const setMfaPreferenceCommand = new SetUserMFAPreferenceCommand({
                    AccessToken: accessToken,
                    SoftwareTokenMfaSettings: {
                        Enabled: true,
                        PreferredMfa: true
                    }
                });
                await this.client.send(setMfaPreferenceCommand);
                logger.info(`Set TOTP as preferred MFA for user ${username} using access token`);
                return;
            }
        }
        catch (error) {
            logger.error(`Error setting TOTP MFA preference with access token for user ${username}:`, error);
        }
        // Fall back to admin version
        const adminSetMfaCommand = new AdminSetUserMFAPreferenceCommand({
            UserPoolId: this.userPoolId,
            Username: username,
            SoftwareTokenMfaSettings: {
                Enabled: true,
                PreferredMfa: true
            }
        });
        await this.client.send(adminSetMfaCommand);
        logger.info(`Set TOTP as preferred MFA for user ${username} using admin privileges`);
    }
    /**
     * Disable all MFA methods for a user
     * @param username User's username
     * @param accessToken User's access token (optional)
     */
    async disableMfa(username, accessToken) {
        try {
            if (accessToken) {
                // Try with user's access token first
                const setMfaPreferenceCommand = new SetUserMFAPreferenceCommand({
                    AccessToken: accessToken,
                    SMSMfaSettings: {
                        Enabled: false,
                        PreferredMfa: false
                    },
                    SoftwareTokenMfaSettings: {
                        Enabled: false,
                        PreferredMfa: false
                    }
                });
                await this.client.send(setMfaPreferenceCommand);
                logger.info(`Disabled MFA for user ${username} using access token`);
                return;
            }
        }
        catch (error) {
            logger.error(`Error disabling MFA with access token for user ${username}:`, error);
        }
        // Fall back to admin version
        const adminSetMfaCommand = new AdminSetUserMFAPreferenceCommand({
            UserPoolId: this.userPoolId,
            Username: username,
            SMSMfaSettings: {
                Enabled: false,
                PreferredMfa: false
            },
            SoftwareTokenMfaSettings: {
                Enabled: false,
                PreferredMfa: false
            }
        });
        await this.client.send(adminSetMfaCommand);
        logger.info(`Disabled MFA for user ${username} using admin privileges`);
    }
    /**
     * Set the preferred MFA method for a user
     * @param username User's username
     * @param method MFA method to set as preferred ('TOTP', 'SMS', or 'NONE')
     * @param accessToken User's access token (optional)
     */
    async setPreferredMfaMethod(username, method, accessToken) {
        switch (method) {
            case 'TOTP':
                await this.setTotpPreferred(username, accessToken);
                break;
            case 'SMS':
                await this.setSmsPreferred(username, accessToken);
                break;
            case 'NONE':
                await this.disableMfa(username, accessToken);
                break;
            default:
                throw new Error(`Invalid MFA method: ${method}`);
        }
    }
    /**
     * Associate a software token (TOTP) with a user
     * @param accessToken User's access token
     * @returns The secret code for the TOTP app
     */
    async associateSoftwareToken(accessToken) {
        const command = new AssociateSoftwareTokenCommand({
            AccessToken: accessToken
        });
        const response = await this.client.send(command);
        if (!response.SecretCode) {
            throw new Error('Failed to associate software token');
        }
        return response.SecretCode;
    }
    /**
     * Verify a software token (TOTP)
     * @param accessToken User's access token
     * @param code Verification code from TOTP app
     * @returns Status of the verification
     */
    async verifySoftwareToken(accessToken, code, deviceName) {
        const command = new VerifySoftwareTokenCommand({
            AccessToken: accessToken,
            UserCode: code,
            FriendlyDeviceName: deviceName
        });
        const response = await this.client.send(command);
        return response.Status || 'ERROR';
    }
    /**
     * Request a verification code for a user attribute
     * @param accessToken User's access token
     * @param attributeName Name of the attribute to verify (e.g., 'email', 'phone_number')
     * @returns Delivery details for the verification code
     */
    async requestAttributeVerification(accessToken, attributeName) {
        const command = new GetUserAttributeVerificationCodeCommand({
            AccessToken: accessToken,
            AttributeName: attributeName
        });
        const response = await this.client.send(command);
        if (!response.CodeDeliveryDetails) {
            throw new Error(`Failed to request verification code for ${attributeName}`);
        }
        return {
            destination: response.CodeDeliveryDetails.Destination || 'Unknown destination',
            attributeName
        };
    }
    /**
     * Verify a user attribute
     * @param accessToken User's access token
     * @param attributeName Name of the attribute to verify
     * @param code Verification code
     */
    async verifyUserAttribute(accessToken, attributeName, code) {
        const command = new VerifyUserAttributeCommand({
            AccessToken: accessToken,
            AttributeName: attributeName,
            Code: code
        });
        await this.client.send(command);
    }
}
export const cognitoMfaService = new CognitoMfaService();
export default cognitoMfaService;
//# sourceMappingURL=cognito-mfa-service.js.map