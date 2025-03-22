import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function PATCH(req: NextRequest) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);
    
    // Get token from session
    const token = session?.accessToken;
    
    // If no token, return unauthorized
    if (!token) {
      return NextResponse.json(
        { status: 'error', message: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Forward request to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
    const response = await fetch(`${backendUrl}/notifications/read-all`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // If backend request fails, return a user-friendly error
    if (!response.ok) {
      console.error(`Failed to mark all notifications as read: ${response.status}`);
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Failed to mark all notifications as read',
          data: null
        },
        { status: 200 } // Return 200 to prevent UI errors
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Server error', 
        data: null
      },
      { status: 200 } // Return 200 to prevent UI errors
    );
  }
} 