import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

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
    const response = await fetch(`${apiUrl}/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    const data = await response.json();
    
    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || 'An error occurred while deleting notification' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error deleting notification:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 