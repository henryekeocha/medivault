import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAccessToken } from '../auth-helper';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';

/**
 * GET handler to retrieve all devices for the current user
 */
export async function GET(req: NextRequest) {
  try {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authentication token provided' },
        { status: 401 }
      );
    }
    
    // Get devices from backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.get(
      `${backendUrl}/api/v1/auth/devices`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    logAudit('USER_DEVICES_RETRIEVED', {
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error retrieving user devices:', error);
    const apiError = handleApiError(error);
    
    logAudit('USER_DEVICES_RETRIEVAL_FAILED', {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: apiError.message
    });
    
    return NextResponse.json(
      { error: apiError.code, message: apiError.message },
      { status: apiError.statusCode }
    );
  }
}

/**
 * DELETE handler to remove a device for the current user
 */
export async function DELETE(req: NextRequest) {
  try {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authentication token provided' },
        { status: 401 }
      );
    }
    
    // Get the device key from the request
    const { searchParams } = new URL(req.url);
    const deviceKey = searchParams.get('deviceKey');
    
    if (!deviceKey) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Device key is required' },
        { status: 400 }
      );
    }
    
    // Delete device through backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    await axios.delete(
      `${backendUrl}/api/v1/auth/devices/${deviceKey}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    logAudit('USER_DEVICE_REMOVED', {
      deviceKey,
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json({
      success: true,
      message: 'Device removed successfully'
    });
  } catch (error) {
    console.error('Error removing user device:', error);
    const apiError = handleApiError(error);
    
    logAudit('USER_DEVICE_REMOVAL_FAILED', {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: apiError.message
    });
    
    return NextResponse.json(
      { error: apiError.code, message: apiError.message },
      { status: apiError.statusCode }
    );
  }
}

/**
 * PUT handler to update a device status (remembered/not remembered)
 */
export async function PUT(req: NextRequest) {
  try {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authentication token provided' },
        { status: 401 }
      );
    }
    
    // Get the request data
    const requestData = await req.json();
    const { deviceKey, remembered } = requestData;
    
    if (!deviceKey) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Device key is required' },
        { status: 400 }
      );
    }
    
    if (remembered === undefined) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Remembered status is required' },
        { status: 400 }
      );
    }
    
    // Update device through backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.put(
      `${backendUrl}/api/v1/auth/devices/${deviceKey}`,
      { remembered },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    logAudit('USER_DEVICE_UPDATED', {
      deviceKey,
      remembered,
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error updating user device:', error);
    const apiError = handleApiError(error);
    
    logAudit('USER_DEVICE_UPDATE_FAILED', {
      status: 'error',
      timestamp: new Date().toISOString(),
      error: apiError.message
    });
    
    return NextResponse.json(
      { error: apiError.code, message: apiError.message },
      { status: apiError.statusCode }
    );
  }
} 