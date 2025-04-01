import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get auth from Clerk
    const session = await auth();
    
    // Get token from Clerk
    const token = await session.getToken();
    
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
    const response = await fetch(`${backendUrl}/notifications/${notificationId}/read`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });

    // If backend request fails, return a user-friendly error
    if (!response.ok) {
      console.error(`Failed to mark notification ${notificationId} as read: ${response.status}`);
      return NextResponse.json(
        { 
          status: 'error',
          message: 'Failed to mark notification as read',
          data: { id: notificationId, read: false }
        },
        { status: 200 } // Return 200 to prevent UI errors
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { 
        status: 'error', 
        message: 'Server error', 
        data: { id: params.id, read: false } 
      },
      { status: 200 } // Return 200 to prevent UI errors
    );
  }
} 