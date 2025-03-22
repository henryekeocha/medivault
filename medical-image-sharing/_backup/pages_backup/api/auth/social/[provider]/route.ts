import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { logAudit } from '@/lib/audit-logger'; 

/**
 * Handler for initiating social login with a provider
 * POST /api/auth/social/:provider
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { provider: string } }
) {
  try {
    const { provider } = params;
    
    if (provider !== 'google' && provider !== 'facebook') {
      return NextResponse.json(
        { success: false, message: 'Invalid provider' },
        { status: 400 }
      );
    }
    
    // Get authorization URL from backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.post(
      `${backendUrl}/api/v1/auth/social/${provider}`
    );
    
    // Log the social login attempt
    logAudit('LOGIN_FAILED', {
      provider,
      status: 'success',
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error(`Error initiating ${params.provider} login:`, error);
    
    // Log the error
    logAudit('LOGIN_FAILED', {
      provider: params.provider,
      status: 'error',
      error: error.message,
      timestamp: new Date().toISOString()
    });
    
    return NextResponse.json(
      {
        success: false,
        message: 'An error occurred while initiating social login',
      },
      { status: 500 }
    );
  }
} 