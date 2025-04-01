import { NextResponse } from 'next/server';
import axios from 'axios';

export async function POST(request: Request) {
  try {
    // Parse the request body
    const body = await request.json();
    
    if (!body.clerkId) {
      return NextResponse.json(
        { success: false, message: 'Clerk ID is required' },
        { status: 400 }
      );
    }
    
    // Call the backend endpoint
    try {
      const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3001';
      const response = await axios.post(
        `${backendUrl}/auth/test-user`,
        {
          clerkId: body.clerkId,
          email: body.email || 'user@example.com',
          name: body.name || 'Test User',
          role: body.role || 'PATIENT'
        },
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );
      
      return NextResponse.json({
        success: true,
        user: response.data.user
      });
    } catch (error: any) {
      console.error('Error creating test user:', error.message);
      
      // Try direct database access as an absolute last resort
      // This would require prisma client configuration
      
      return NextResponse.json(
        { 
          success: false,
          message: 'Failed to create test user',
          error: error.message
        },
        { status: 500 }
      );
    }
  } catch (error: any) {
    console.error('Error in test-user API route:', error);
    
    return NextResponse.json(
      { success: false, message: error.message || 'Unknown error' },
      { status: 500 }
    );
  }
} 