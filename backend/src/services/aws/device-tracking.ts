import prisma from '../../lib/prisma.js';
import { logger } from '../../utils/logger.js';

// Define types for our returned objects
interface Device {
  deviceKey: string;
  deviceName: string;
  deviceType: string | null;
  lastUsedAt: Date;
  remembered: boolean;
  browser: string | null;
  os: string | null;
}

interface AuthEventInfo {
  eventId: string;
  eventType: string;
  createdAt: Date;
  ipAddress: string;
  deviceName: string | null;
  browser: string | null;
  os: string | null;
  success: boolean;
}

/**
 * Service for tracking and managing user devices using the database
 */
export class DeviceTrackingService {
  /**
   * Get a list of devices for a user
   * @param userId The ID of the user
   * @returns List of devices
   */
  async listDevices(userId: string): Promise<Device[]> {
    try {
      // Use raw query to avoid schema issues until migration is applied
      const devices = await prisma.$queryRaw`
        SELECT 
          id, 
          "userId", 
          "deviceName", 
          "deviceType", 
          "lastUsedAt", 
          remembered, 
          browser, 
          os 
        FROM "UserDevice" 
        WHERE "userId" = ${userId}::uuid 
        ORDER BY "lastUsedAt" DESC
      `;
      
      return (devices as any[]).map(device => ({
        deviceKey: device.id,
        deviceName: device.deviceName,
        deviceType: device.deviceType,
        lastUsedAt: device.lastUsedAt,
        remembered: device.remembered,
        browser: device.browser,
        os: device.os,
      }));
    } catch (error) {
      logger.error('Error listing devices:', error);
      throw error;
    }
  }

  /**
   * Get authentication events for a user
   * @param userId The ID of the user
   * @returns List of authentication events
   */
  async listAuthEvents(userId: string): Promise<AuthEventInfo[]> {
    try {
      // Use raw query to avoid schema issues until migration is applied
      const events = await prisma.$queryRaw`
        SELECT 
          id, 
          "userId", 
          "eventType", 
          "ipAddress", 
          "deviceName", 
          browser, 
          os, 
          success, 
          "createdAt"
        FROM "AuthEvent" 
        WHERE "userId" = ${userId}::uuid 
        ORDER BY "createdAt" DESC
        LIMIT 25
      `;
      
      return (events as any[]).map(event => ({
        eventId: event.id,
        eventType: event.eventType,
        createdAt: event.createdAt,
        ipAddress: event.ipAddress,
        deviceName: event.deviceName,
        browser: event.browser,
        os: event.os,
        success: event.success,
      }));
    } catch (error) {
      logger.error('Error listing auth events:', error);
      throw error;
    }
  }

  /**
   * Forget (remove) a device
   * @param userId The ID of the user
   * @param deviceKey The device key to forget
   * @returns Result of the operation
   */
  async forgetDevice(userId: string, deviceKey: string): Promise<{ success: boolean }> {
    try {
      // Use raw query to avoid schema issues until migration is applied
      await prisma.$executeRaw`
        DELETE FROM "UserDevice" 
        WHERE id = ${deviceKey}::uuid AND "userId" = ${userId}::uuid
      `;
      
      return { success: true };
    } catch (error) {
      logger.error('Error forgetting device:', error);
      throw error;
    }
  }

  /**
   * Update device status (remembered or not remembered)
   * @param userId The ID of the user
   * @param deviceKey The device key to update
   * @param remembered Whether the device should be remembered
   * @returns Result of the operation
   */
  async updateDeviceStatus(userId: string, deviceKey: string, remembered: boolean): Promise<{ success: boolean }> {
    try {
      // Use raw query to avoid schema issues until migration is applied
      await prisma.$executeRaw`
        UPDATE "UserDevice" 
        SET remembered = ${remembered}, "updatedAt" = NOW()
        WHERE id = ${deviceKey}::uuid AND "userId" = ${userId}::uuid
      `;
      
      return { success: true };
    } catch (error) {
      logger.error('Error updating device status:', error);
      throw error;
    }
  }
  
  /**
   * Record a new authentication event
   * @param userId The ID of the user
   * @param eventData The event data
   * @returns The created event
   */
  async recordAuthEvent(userId: string, eventData: {
    eventType: string;
    ipAddress: string;
    deviceName?: string;
    browser?: string;
    os?: string;
    success: boolean;
  }): Promise<{ id: string }> {
    try {
      // Use raw query to avoid schema issues until migration is applied
      const result = await prisma.$queryRaw`
        INSERT INTO "AuthEvent" (
          id, 
          "userId", 
          "eventType", 
          "ipAddress", 
          "deviceName", 
          browser, 
          os, 
          success, 
          "createdAt"
        ) VALUES (
          uuid_generate_v4(),
          ${userId}::uuid,
          ${eventData.eventType},
          ${eventData.ipAddress},
          ${eventData.deviceName || null},
          ${eventData.browser || null},
          ${eventData.os || null},
          ${eventData.success},
          NOW()
        )
        RETURNING id
      `;
      
      return { id: (result as any[])[0].id };
    } catch (error) {
      logger.error('Error recording auth event:', error);
      throw error;
    }
  }
}

export default new DeviceTrackingService(); 