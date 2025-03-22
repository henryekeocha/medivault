import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

// Handler for marking a notification as read
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const notificationId = params.id;
    
    // Get token from request cookies or authorization header
    const cookieStore = await cookies();
    const tokenCookie = cookieStore.get('token');
    let token = tokenCookie?.value;
    
    // Check for Authorization header if token not in cookies
    if (!token) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Forward request to backend
    const apiUrl = process.env.BACKEND_API_URL || 'http://localhost:3001/api';
    const response = await fetch(`${apiUrl}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'An error occurred while marking notification as read' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handler for deleting a notification
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const notificationId = params.id;
    
    // Forward request to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
    const response = await fetch(`${backendUrl}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // If backend request fails, return a user-friendly error
    if (!response.ok) {
      console.error(`Failed to delete notification ${notificationId}: ${response.status}`);
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Failed to delete notification',
          data: null
        },
        { status: 200 } // Return 200 to prevent UI errors
      );
    }

    // Try to parse JSON, but it might be empty for DELETE
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = { status: 'success' };
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting notification:', error);
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