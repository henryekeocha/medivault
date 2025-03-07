'use server';

import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getAccessToken } from '../../auth-helper';
import { handleApiError } from '@/lib/api/error-handler';
import { logAudit } from '@/lib/audit-logger';

/**
 * PUT handler to disable MFA
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
    
    // Disable MFA through backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.put(
      `${backendUrl}/api/v1/auth/mfa/disable`,
      {},
      {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      }
    );
    
    logAudit('MFA_DISABLED', {
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(response.data);
  } catch (error) {
    console.error('Error disabling MFA:', error);
    const apiError = handleApiError(error);
    
    logAudit('MFA_DISABLE_FAILED', {
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