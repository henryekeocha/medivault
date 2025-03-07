import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { cookies } from 'next/headers';
import { extractTokenFromRequest, createErrorResponse } from '../auth-helper';

/**
 * GET handler for session validation
 */
export async function GET(req: NextRequest) {
  try {
    const accessToken = extractTokenFromRequest(req);
    
    if (!accessToken) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    // Validate session with backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.get(
      `${backendUrl}/api/v1/auth/session`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error validating session:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Session validation failed',
        session: { isValid: false }
      },
      { status: error.response?.status || 401 }
    );
  }
}

/**
 * POST handler for refreshing tokens
 */
export async function POST(req: NextRequest) {
  try {
    const requestData = await req.json();
    const { refreshToken } = requestData;
    
    if (!refreshToken) {
      return createErrorResponse('Refresh token is required', 400);
    }
    
    // Refresh token with backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.post(
      `${backendUrl}/api/v1/auth/session/refresh`,
      { refreshToken }
    );
    
    // Get the tokens from the response
    const { accessToken, idToken, refreshToken: newRefreshToken } = response.data;
    
    return NextResponse.json({
      success: true,
      accessToken,
      idToken,
      refreshToken: newRefreshToken || refreshToken
    });
  } catch (error: any) {
    console.error('Error refreshing session:', error);
    
    return NextResponse.json(
      {
        success: false,
        message: 'Failed to refresh session. Please log in again.'
      },
      { status: error.response?.status || 401 }
    );
  }
} 