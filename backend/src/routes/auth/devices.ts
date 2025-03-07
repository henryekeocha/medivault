import { Router } from 'express';
import { protect } from '../../middleware/auth.js';
import deviceTrackingService from '../../services/aws/device-tracking.js';
import { logger } from '../../utils/logger.js';
import { logAudit } from '../../utils/audit-logger.js';

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
    const username = req.user?.username;
    
    if (!username) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }
    
    const devices = await deviceTrackingService.listDevices(username);
    
    // Audit log the security event
    logAudit('USER_DEVICES_RETRIEVED', {
      status: 'success',
      timestamp: new Date().toISOString(),
      userId: username,
      deviceCount: devices.length
    });
    
    return res.status(200).json({
      success: true,
      devices: devices.map((device: any) => ({
        deviceKey: device.DeviceKey,
        deviceName: device.DeviceAttributes?.find((attr: any) => attr.Name === 'device_name')?.Value || 'Unknown Device',
        deviceType: device.DeviceAttributes?.find((attr: any) => attr.Name === 'device_type')?.Value || 'Unknown',
        lastAuthenticated: device.DeviceLastAuthenticatedDate,
        lastModified: device.DeviceLastModifiedDate,
        remembered: device.DeviceRememberedStatus === 'remembered',
      })),
    });
  } catch (error) {
    // System log for operational debugging
    logger.error('Error getting devices:', error);
    
    // Audit log for security monitoring
    logAudit('USER_DEVICES_RETRIEVAL_FAILED', {
      status: 'error',
      timestamp: new Date().toISOString(),
      userId: req.user?.username,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred while getting devices',
    });
  }
});

/**
 * Get authentication events for the current user
 * GET /auth/devices/events
 */
router.get('/events', async (req, res) => {
  try {
    const username = req.user?.username;
    
    if (!username) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }
    
    const events = await deviceTrackingService.listAuthEvents(username);
    
    // Audit log the security event
    logAudit('USER_AUTH_EVENTS_RETRIEVED', {
      status: 'success',
      timestamp: new Date().toISOString(),
      userId: username,
      eventCount: events.length
    });
    
    return res.status(200).json({
      success: true,
      events: events.map((event: any) => ({
        eventId: event.EventId,
        eventType: event.EventType,
        eventResponse: event.EventResponse,
        eventRisk: event.EventRisk,
        createdAt: event.CreationDate,
        ipAddress: event.EventContextData?.IpAddress,
        city: event.EventContextData?.City,
        country: event.EventContextData?.Country,
        deviceName: event.EventContextData?.DeviceName,
      })),
    });
  } catch (error) {
    // System log for operational debugging
    logger.error('Error getting auth events:', error);
    
    // Audit log for security monitoring
    logAudit('USER_AUTH_EVENTS_RETRIEVAL_FAILED', {
      status: 'error',
      timestamp: new Date().toISOString(),
      userId: req.user?.username,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred while getting authentication events',
    });
  }
});

/**
 * Forget a device
 * DELETE /auth/devices/:deviceKey
 */
router.delete('/:deviceKey', async (req, res) => {
  try {
    const { deviceKey } = req.params;
    const username = req.user?.username;
    
    if (!username) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }
    
    await deviceTrackingService.forgetDevice(username, deviceKey);
    
    // System log for operational tracking
    logger.info(`Device ${deviceKey} forgotten for user ${username}`);
    
    // Audit log for security monitoring
    logAudit('USER_DEVICE_REMOVED', {
      status: 'success',
      timestamp: new Date().toISOString(),
      userId: username,
      deviceKey: deviceKey
    });
    
    return res.status(200).json({
      success: true,
      message: 'Device forgotten successfully',
    });
  } catch (error) {
    // System log for operational debugging
    logger.error('Error forgetting device:', error);
    
    // Audit log for security monitoring
    logAudit('USER_DEVICE_REMOVAL_FAILED', {
      status: 'error',
      timestamp: new Date().toISOString(),
      userId: req.user?.username,
      deviceKey: req.params.deviceKey,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred while forgetting the device',
    });
  }
});

/**
 * Update device status (remembered or not remembered)
 * PUT /auth/devices/:deviceKey
 */
router.put('/:deviceKey', async (req, res) => {
  try {
    const { deviceKey } = req.params;
    const { remembered } = req.body;
    const username = req.user?.username;
    
    if (!username) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated',
      });
    }
    
    if (typeof remembered !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'The "remembered" field must be a boolean',
      });
    }
    
    await deviceTrackingService.updateDeviceStatus(username, deviceKey, remembered);
    
    // System log for operational tracking
    logger.info(`Device ${deviceKey} ${remembered ? 'remembered' : 'not remembered'} for user ${username}`);
    
    // Audit log for security monitoring
    logAudit('USER_DEVICE_UPDATED', {
      status: 'success',
      timestamp: new Date().toISOString(),
      userId: username,
      deviceKey: deviceKey,
      remembered: remembered
    });
    
    return res.status(200).json({
      success: true,
      message: `Device ${remembered ? 'remembered' : 'not remembered'} successfully`,
    });
  } catch (error) {
    // System log for operational debugging
    logger.error('Error updating device status:', error);
    
    // Audit log for security monitoring
    logAudit('USER_DEVICE_UPDATE_FAILED', {
      status: 'error',
      timestamp: new Date().toISOString(),
      userId: req.user?.username,
      deviceKey: req.params.deviceKey,
      remembered: req.body?.remembered,
      errorMessage: error instanceof Error ? error.message : String(error)
    });
    
    return res.status(500).json({
      success: false,
      message: 'An error occurred while updating the device status',
    });
  }
});

export default router; 