import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';

/**
 * Handler for getting user devices
 * GET /api/auth/devices
 */
export async function GET(req: NextRequest) {
  try {
    const cookieStore = await cookies();
    const accessToken = cookieStore.get('cognitoAccessToken')?.value;
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Get devices from backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.get(
      `${backendUrl}/api/v1/auth/devices`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching devices:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching devices',
      },
      { status: error.response?.status || 500 }
    );
  }
} 