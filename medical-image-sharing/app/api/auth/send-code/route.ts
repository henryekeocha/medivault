import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import axios from 'axios';

export async function POST(req: NextRequest) {
  console.log('2FA: Handling send-code request');
  
  try {
    // Get the user's auth token from Clerk
    const session = await auth();
    const { userId } = session;
    const token = await session.getToken();
    
    if (!userId || !token) {
      console.error('2FA: No authenticated user for send-code');
      return NextResponse.json({ 
        status: 'error',
        message: 'Authentication required' 
      }, { status: 401 });
    }
    
    // Parse the request body
    const body = await req.json().catch(() => ({}));
    const { email } = body;
    
    if (!email) {
      console.error('2FA: No email provided for send-code');
      return NextResponse.json({ 
        status: 'error', 
        message: 'Email is required' 
      }, { status: 400 });
    }
    
    console.log(`2FA: Forwarding send-code request for email: ${email}`);
    
    // Forward the request to the backend - using the correct path
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const apiUrl = `${backendUrl}/api/auth/send-code`;
    console.log(`2FA: Sending request to backend URL: ${apiUrl}`);
    
    const response = await axios.post(
      apiUrl,
      { email },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      }
    );
    
    // Return the backend's response
    console.log('2FA: Send-code request successful, response:', response.data);
    return NextResponse.json(response.data);
    
  } catch (error: any) {
    console.error('2FA: Error in send-code endpoint:', error);
    console.error('2FA: Full error details:', {
      message: error.message,
      stack: error.stack,
      response: error.response?.data
    });
    
    // Handle errors from the backend
    if (error.response) {
      return NextResponse.json(
        error.response.data || { status: 'error', message: 'Failed to send verification code' },
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