import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getRefreshToken } from '../auth-helper';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';

/**
 * POST handler to refresh the user's tokens
 */
export async function POST(req: NextRequest) {
  try {
    const refreshToken = getRefreshToken();
    
    if (!refreshToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No refresh token provided' },
        { status: 401 }
      );
    }
    
    // Refresh tokens through backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.post(
      `${backendUrl}/api/v1/auth/refresh`,
      { refreshToken }
    );
    
    const { accessToken, idToken, expiresIn } = response.data;
    
    // Calculate expiry date for cookies
    const expiryDate = new Date();
    expiryDate.setSeconds(expiryDate.getSeconds() + expiresIn);
    
    // 30 days for refresh token (matches Cognito default)
    const refreshTokenExpiry = new Date();
    refreshTokenExpiry.setDate(refreshTokenExpiry.getDate() + 30);
    
    // Create response with new cookies
    const nextResponse = NextResponse.json({
      success: true,
      expiresIn
    });
    
    // Set cookies with the new tokens
    nextResponse.cookies.set({
      name: 'cognitoAccessToken',
      value: accessToken,
      expires: expiryDate,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    nextResponse.cookies.set({
      name: 'cognitoIdToken',
      value: idToken,
      expires: expiryDate,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    // Keep the same refresh token, just update its expiry
    nextResponse.cookies.set({
      name: 'cognitoRefreshToken',
      value: refreshToken,
      expires: refreshTokenExpiry,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/'
    });
    
    logAudit('TOKEN_REFRESHED', {
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return nextResponse;
  } catch (error) {
    console.error('Error refreshing tokens:', error);
    const apiError = handleApiError(error);
    
    // If refresh token is invalid, clear all auth cookies
    if (apiError.statusCode === 401) {
      const response = NextResponse.json(
        { error: apiError.code, message: apiError.message },
        { status: apiError.statusCode }
      );
      
      response.cookies.delete('cognitoAccessToken');
      response.cookies.delete('cognitoIdToken');
      response.cookies.delete('cognitoRefreshToken');
      
      return response;
    }
    
    logAudit('TOKEN_REFRESH_FAILED', {
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