import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import { logger } from '../../utils/logger.js';
import { logAudit } from '../../utils/audit-logger.js';
import { prisma } from '../../lib/prisma.js';
import { nanoid } from 'nanoid';
/**
 * Router for device tracking endpoints
 */
const router = Router();
// Apply authentication middleware to all routes
router.use(protect);
/**
 * Get all devices for the current user
 * GET /auth/devices
 */
router.get('/', async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // Direct query to the UserDevice model
        const devices = await prisma.$queryRaw `
      SELECT * FROM "UserDevice" 
      WHERE "userId" = ${userId}::uuid 
      ORDER BY "lastUsedAt" DESC
    `;
        return res.status(200).json({
            success: true,
            devices
        });
    }
    catch (error) {
        logger.error('Error getting user devices:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving devices'
        });
    }
});
/**
 * Get a specific device
 * GET /auth/devices/:deviceId
 */
router.get('/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // Direct query to get a specific device
        const devices = await prisma.$queryRaw `
      SELECT * FROM "UserDevice" 
      WHERE "id" = ${deviceId}::uuid AND "userId" = ${userId}::uuid
    `;
        const device = devices[0];
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }
        return res.status(200).json({
            success: true,
            device
        });
    }
    catch (error) {
        logger.error('Error getting device details:', error);
        return res.status(500).json({
            success: false,
            message: 'Error retrieving device'
        });
    }
});
/**
 * Register a new device
 * POST /auth/devices
 */
router.post('/', async (req, res) => {
    try {
        const { deviceName, deviceType, browser, os } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        if (!deviceName) {
            return res.status(400).json({
                success: false,
                message: 'Device name is required'
            });
        }
        // Generate a new UUID
        const deviceId = nanoid();
        const now = new Date();
        // Direct insertion using raw SQL
        await prisma.$executeRaw `
      INSERT INTO "UserDevice" ("id", "userId", "deviceName", "deviceType", "browser", "os", "lastUsedAt", "createdAt", "updatedAt")
      VALUES (
        ${deviceId}::uuid, 
        ${userId}::uuid, 
        ${deviceName}, 
        ${deviceType || null}, 
        ${browser || null}, 
        ${os || null}, 
        ${now}, 
        ${now}, 
        ${now}
      )
    `;
        // Get the newly created device
        const devices = await prisma.$queryRaw `
      SELECT * FROM "UserDevice" 
      WHERE "id" = ${deviceId}::uuid
    `;
        const newDevice = devices[0];
        // Log the device registration
        await logAudit('USER_DEVICE_UPDATED', {
            userId,
            action: 'DEVICE_REGISTERED',
            resource: 'DEVICE',
            resourceId: deviceId,
            details: `Device ${deviceName} registered`,
            ip: req.ip || 'unknown',
            status: 'success',
            timestamp: new Date().toISOString()
        });
        return res.status(201).json({
            success: true,
            device: newDevice,
            message: 'Device registered successfully'
        });
    }
    catch (error) {
        logger.error('Error registering device:', error);
        return res.status(500).json({
            success: false,
            message: 'Error registering device'
        });
    }
});
/**
 * Update a device
 * PUT /auth/devices/:deviceId
 */
router.put('/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const { deviceName, remembered } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // First check if the device exists and belongs to the user
        const devices = await prisma.$queryRaw `
      SELECT * FROM "UserDevice" 
      WHERE "id" = ${deviceId}::uuid AND "userId" = ${userId}::uuid
    `;
        const existingDevice = devices[0];
        if (!existingDevice) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }
        // Update the device using raw SQL
        const finalDeviceName = deviceName || existingDevice.deviceName;
        const finalRemembered = remembered !== undefined ? remembered : existingDevice.remembered;
        const now = new Date();
        await prisma.$executeRaw `
      UPDATE "UserDevice" 
      SET 
        "deviceName" = ${finalDeviceName}, 
        "remembered" = ${finalRemembered}, 
        "lastUsedAt" = ${now}, 
        "updatedAt" = ${now}
      WHERE "id" = ${deviceId}::uuid AND "userId" = ${userId}::uuid
    `;
        // Get the updated device
        const updatedDevices = await prisma.$queryRaw `
      SELECT * FROM "UserDevice" 
      WHERE "id" = ${deviceId}::uuid
    `;
        const updatedDevice = updatedDevices[0];
        // Log the device update
        await logAudit('USER_DEVICE_UPDATED', {
            userId,
            action: 'DEVICE_UPDATED',
            resource: 'DEVICE',
            resourceId: deviceId,
            details: `Device ${finalDeviceName} updated`,
            ip: req.ip || 'unknown',
            status: 'success',
            timestamp: new Date().toISOString()
        });
        return res.status(200).json({
            success: true,
            device: updatedDevice,
            message: 'Device updated successfully'
        });
    }
    catch (error) {
        logger.error('Error updating device:', error);
        return res.status(500).json({
            success: false,
            message: 'Error updating device'
        });
    }
});
/**
 * Remove a device
 * DELETE /auth/devices/:deviceId
 */
router.delete('/:deviceId', async (req, res) => {
    try {
        const { deviceId } = req.params;
        const userId = req.user?.id;
        if (!userId) {
            return res.status(401).json({
                success: false,
                message: 'User not authenticated'
            });
        }
        // First check if the device exists and belongs to the user
        const devices = await prisma.$queryRaw `
      SELECT * FROM "UserDevice" 
      WHERE "id" = ${deviceId}::uuid AND "userId" = ${userId}::uuid
    `;
        const device = devices[0];
        if (!device) {
            return res.status(404).json({
                success: false,
                message: 'Device not found'
            });
        }
        // Delete the device using raw SQL
        await prisma.$executeRaw `
      DELETE FROM "UserDevice" 
      WHERE "id" = ${deviceId}::uuid AND "userId" = ${userId}::uuid
    `;
        // Log the device removal
        await logAudit('USER_DEVICE_REMOVED', {
            userId,
            action: 'DEVICE_REMOVED',
            resource: 'DEVICE',
            resourceId: deviceId,
            details: `Device ${device.deviceName} removed`,
            ip: req.ip || 'unknown',
            status: 'success',
            timestamp: new Date().toISOString()
        });
        return res.status(200).json({
            success: true,
            message: 'Device removed successfully'
        });
    }
    catch (error) {
        logger.error('Error removing device:', error);
        return res.status(500).json({
            success: false,
            message: 'Error removing device'
        });
    }
});
export default router;
//# sourceMappingURL=devices.js.map