import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAccessToken, getRefreshToken } from '../auth-helper';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';

/**
 * POST handler to logout a user and revoke their refresh token
 */
export async function POST(req: NextRequest) {
  try {
    const refreshToken = getRefreshToken();
    const accessToken = getAccessToken();
    
    // Clear cookies regardless of successful logout
    const response = NextResponse.json({ success: true });
    response.cookies.delete('cognitoAccessToken');
    response.cookies.delete('cognitoIdToken');
    response.cookies.delete('cognitoRefreshToken');
    
    // If no refresh token, just return success (already logged out)
    if (!refreshToken) {
      return response;
    }
    
    // Send logout request to backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    await axios.post(
      `${backendUrl}/api/v1/auth/logout`,
      { refreshToken },
      {
        headers: accessToken ? {
          Authorization: `Bearer ${accessToken}`
        } : undefined
      }
    );
    
    logAudit('USER_LOGGED_OUT', {
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return response;
  } catch (error) {
    console.error('Error during logout:', error);
    const apiError = handleApiError(error);
    
    // Still clear cookies even if there's an error with the token revocation
    const response = NextResponse.json(
      { success: true, warning: 'Cookies cleared but backend logout may have failed' },
      { status: 200 }
    );
    
    response.cookies.delete('cognitoAccessToken');
    response.cookies.delete('cognitoIdToken');
    response.cookies.delete('cognitoRefreshToken');
    
    logAudit('USER_LOGGED_OUT_PARTIAL', {
      status: 'warning',
      message: 'Cookies cleared but token revocation may have failed',
      timestamp: new Date().toISOString(),
      error: apiError.message
    });
    
    return response;
  }
} 