import { CognitoIdentityProviderClient, AdminListUserAuthEventsCommand, AdminListDevicesCommand, AdminForgetDeviceCommand, AdminUpdateDeviceStatusCommand, } from '@aws-sdk/client-cognito-identity-provider';
import { logger } from '../../utils/logger.js';
/**
 * Service for tracking and managing user devices in Cognito
 */
export class DeviceTrackingService {
    client;
    userPoolId;
    constructor() {
        // Initialize the Cognito client
        this.client = new CognitoIdentityProviderClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
        // Set the User Pool ID from environment variables
        this.userPoolId = process.env.COGNITO_USER_POOL_ID || '';
        if (!this.userPoolId) {
            logger.warn('Cognito User Pool ID not set in environment variables');
        }
    }
    /**
     * Get a list of devices for a user
     * @param username The username of the user
     * @returns List of devices
     */
    async listDevices(username) {
        try {
            const command = new AdminListDevicesCommand({
                UserPoolId: this.userPoolId,
                Username: username,
            });
            const response = await this.client.send(command);
            return response.Devices || [];
        }
        catch (error) {
            logger.error('Error listing devices:', error);
            throw error;
        }
    }
    /**
     * Get authentication events for a user
     * @param username The username of the user
     * @returns List of authentication events
     */
    async listAuthEvents(username) {
        try {
            const command = new AdminListUserAuthEventsCommand({
                UserPoolId: this.userPoolId,
                Username: username,
                MaxResults: 25, // Limit to 25 most recent events
            });
            const response = await this.client.send(command);
            return response.AuthEvents || [];
        }
        catch (error) {
            logger.error('Error listing auth events:', error);
            throw error;
        }
    }
    /**
     * Forget (remove) a device
     * @param username The username of the user
     * @param deviceKey The device key to forget
     * @returns Result of the operation
     */
    async forgetDevice(username, deviceKey) {
        try {
            const command = new AdminForgetDeviceCommand({
                UserPoolId: this.userPoolId,
                Username: username,
                DeviceKey: deviceKey,
            });
            return await this.client.send(command);
        }
        catch (error) {
            logger.error('Error forgetting device:', error);
            throw error;
        }
    }
    /**
     * Update device status (remembered or not remembered)
     * @param username The username of the user
     * @param deviceKey The device key to update
     * @param remembered Whether the device should be remembered
     * @returns Result of the operation
     */
    async updateDeviceStatus(username, deviceKey, remembered) {
        try {
            const command = new AdminUpdateDeviceStatusCommand({
                UserPoolId: this.userPoolId,
                Username: username,
                DeviceKey: deviceKey,
                DeviceRememberedStatus: remembered ? 'remembered' : 'not_remembered',
            });
            return await this.client.send(command);
        }
        catch (error) {
            logger.error('Error updating device status:', error);
            throw error;
        }
    }
}
export default new DeviceTrackingService();
//# sourceMappingURL=device-tracking.js.map