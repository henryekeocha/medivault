'use server';

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAccessToken } from '../../auth-helper';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';

/**
 * POST handler to verify a user attribute
 */
export async function POST(req: NextRequest) {
  try {
    const accessToken = getAccessToken();
    
    if (!accessToken) {
      return NextResponse.json(
        { error: 'Unauthorized', message: 'No authentication token provided' },
        { status: 401 }
      );
    }
    
    // Get attribute and code from request body
    const requestData = await req.json();
    const { attribute, code } = requestData;
    
    if (!attribute || !['email', 'phone_number'].includes(attribute)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Valid attribute is required (email or phone_number)' },
        { status: 400 }
      );
    }
    
    if (!code) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Verification code is required' },
        { status: 400 }
      );
    }
    
    // Verify attribute through backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.post(
      `${backendUrl}/api/v1/auth/user/verify`,
      { attribute, code },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    logAudit('USER_ATTRIBUTE_VERIFIED', {
      attribute,
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error verifying user attribute:', error);
    const apiError = handleApiError(error);
    
    logAudit('USER_ATTRIBUTE_VERIFICATION_FAILED', {
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