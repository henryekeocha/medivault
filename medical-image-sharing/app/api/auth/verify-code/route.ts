import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  console.log('2FA: Handling verify-code request');
  
  try {
    // Get the user's auth token from Clerk
    const session = await auth();
    const { userId } = session;
    const token = await session.getToken();
    
    if (!userId || !token) {
      console.error('2FA: No authenticated user for verify-code');
      return NextResponse.json({ 
        status: 'error',
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Parse the request body
    const body = await req.json().catch(() => ({}));
    const { email, code } = body;
    
    if (!email || !code) {
      console.error('2FA: Missing required parameters for verify-code');
      return NextResponse.json({ 
        status: 'error', 
        message: 'Email and verification code are required' 
      }, { status: 400 });
    }
    
    console.log(`2FA: Forwarding verify-code request for email: ${email}`);
    
    // Forward the request to the backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const apiUrl = `${backendUrl}/api/auth/verify-code`;
    console.log(`2FA: Sending request to backend URL: ${apiUrl}`);
    
    const response = await axios.post(
      apiUrl,
      { email, code },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Return the backend's response
    console.log('2FA: Verify-code request successful, response:', response.data);
    return NextResponse.json(response.data);
    
  } catch (error: any) {
    console.error('2FA: Error in verify-code endpoint:', error);
    console.error('2FA: Full error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    // Handle errors from the backend
    if (error.response) {
      return NextResponse.json(
        error.response.data || { status: 'error', message: 'Failed to verify code' },
        { status: error.response.status || 500 }
      );
    }
    
    // Handle other types of errors
    return NextResponse.json({ 
      status: 'error',
      message: error.message || 'Internal server error'
    }, { status: 500 });
  }
} 