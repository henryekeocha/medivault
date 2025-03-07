'use server';

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAccessToken } from '../../auth-helper';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';

/**
 * PUT handler to set the preferred MFA method
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
    
    // Get the preferred method from request body
    const requestData = await req.json();
    const { method } = requestData;
    
    if (!method || !['TOTP', 'SMS', 'NONE'].includes(method)) {
      return NextResponse.json(
        { error: 'Bad Request', message: 'Valid method is required (TOTP, SMS, or NONE)' },
        { status: 400 }
      );
    }
    
    // Set preferred MFA method through backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.put(
      `${backendUrl}/api/v1/auth/mfa/preferred`,
      { method },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    logAudit('MFA_PREFERRED_METHOD_UPDATED', {
      method,
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error setting preferred MFA method:', error);
    const apiError = handleApiError(error);
    
    logAudit('MFA_PREFERRED_METHOD_UPDATE_FAILED', {
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