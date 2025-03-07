import axios from 'axios';

export interface Device {
  deviceKey: string;
  deviceName?: string;
  deviceAttributes?: {
    [key: string]: string;
  };
  deviceCreateDate?: string;
  deviceLastModifiedDate?: string;
  deviceLastAuthenticatedDate?: string;
  remembered?: boolean;
}

export interface AuthEvent {
  eventId: string;
  eventType: string;
  creationDate: string;
  eventResponse: string;
  eventRisk?: {
    riskDecision: string;
    riskLevel: string;
  };
  deviceName?: string;
  ipAddress?: string;
  city?: string;
  country?: string;
}

/**
 * Service for managing device tracking
 */
export const deviceService = {
  /**
   * Get all devices for the current user
   */
  async getDevices(): Promise<Device[]> {
    try {
      const response = await axios.get('/api/auth/devices');
      return response.data.devices || [];
    } catch (error) {
      console.error('Error fetching devices:', error);
      return [];
    }
  },

  /**
   * Get authentication events for the current user
   */
  async getAuthEvents(): Promise<AuthEvent[]> {
    try {
      const response = await axios.get('/api/auth/devices/events');
      return response.data.events || [];
    } catch (error) {
      console.error('Error fetching auth events:', error);
      return [];
    }
  },

  /**
   * Forget a device
   * @param deviceKey The device key to forget
   */
  async forgetDevice(deviceKey: string): Promise<boolean> {
    try {
      await axios.delete(`/api/auth/devices/${deviceKey}`);
      return true;
    } catch (error) {
      console.error('Error forgetting device:', error);
      return false;
    }
  },

  /**
   * Update device remembered status
   * @param deviceKey The device key to update
   * @param remembered Whether the device should be remembered
   */
  async updateDeviceStatus(deviceKey: string, remembered: boolean): Promise<boolean> {
    try {
      await axios.put(`/api/auth/devices/${deviceKey}`, { remembered });
      return true;
    } catch (error) {
      console.error('Error updating device status:', error);
      return false;
    }
  }
}; 