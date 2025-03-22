import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

/**
 * Handler for forgetting a device
 * DELETE /api/auth/devices/[deviceKey]
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: { deviceKey: string } }
) {
  try {
    const { deviceKey } = params;
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get access token - this might be in different locations based on your auth implementation
    // @ts-ignore - accessToken may be added to session by your auth configuration
    const accessToken = session.accessToken || session.user.accessToken;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'No access token available' },
        { status: 401 }
      );
    }
    
    // Forget device through backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.delete(
      `${backendUrl}/api/v1/auth/devices/${deviceKey}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error forgetting device:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while forgetting the device',
      },
      { status: error.response?.status || 500 }
    );
  }
}

/**
 * Handler for updating device status (remembered/not remembered)
 * PUT /api/auth/devices/[deviceKey]
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: { deviceKey: string } }
) {
  try {
    const { deviceKey } = params;
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get access token - this might be in different locations based on your auth implementation
    // @ts-ignore - accessToken may be added to session by your auth configuration
    const accessToken = session.accessToken || session.user.accessToken;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'No access token available' },
        { status: 401 }
      );
    }
    
    // Get request body
    const body = await req.json();
    const { remembered } = body;
    
    if (typeof remembered !== 'boolean') {
      return NextResponse.json(
        { success: false, message: 'Invalid request. "remembered" field must be a boolean.' },
        { status: 400 }
      );
    }
    
    // Update device status through backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.put(
      `${backendUrl}/api/v1/auth/devices/${deviceKey}`,
      { remembered },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error updating device status:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while updating the device status',
      },
      { status: error.response?.status || 500 }
    );
  }
} 