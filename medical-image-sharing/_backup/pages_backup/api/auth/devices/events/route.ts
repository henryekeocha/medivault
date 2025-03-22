import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

/**
 * Handler for getting user device authentication events
 * GET /api/auth/devices/events
 */
export async function GET(req: NextRequest) {
  try {
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
    
    // Get device events from backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.get(
      `${backendUrl}/api/v1/auth/devices/events`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching device events:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while fetching device events',
      },
      { status: error.response?.status || 500 }
    );
  }
} 