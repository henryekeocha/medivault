'use server';

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAccessToken } from '../../../auth-helper';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';

/**
 * POST handler to set up SMS MFA
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
    
    // Set up SMS MFA through backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.post(
      `${backendUrl}/api/v1/auth/mfa/sms/setup`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    logAudit('SMS_MFA_SETUP_INITIATED', {
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error setting up SMS MFA:', error);
    const apiError = handleApiError(error);
    
    logAudit('SMS_MFA_SETUP_FAILED', {
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