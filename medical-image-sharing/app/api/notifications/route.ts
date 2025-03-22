import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // Get session from NextAuth
    const session = await getServerSession(authOptions);
    
    // Get token from session or Authorization header
    let token = session?.accessToken;
    
    // If no token in session, check Authorization header
    if (!token) {
      const authHeader = req.headers.get('Authorization');
      if (authHeader?.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }
    
    // If still no token, try from cookies
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('token')?.value;
    }
    
    // If no token found, return unauthorized with empty data
    if (!token) {
      console.warn('No authentication token found for notifications request');
      return NextResponse.json({
        status: 'success',
        data: [] // Return empty array for better UI handling
      });
    }

    // Forward request to backend
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
    
    try {
      console.log(`Fetching notifications from ${backendUrl}/notifications`);
      
      const response = await fetch(`${backendUrl}/notifications`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Log the response status
      console.log(`Notifications API response status: ${response.status}`);
      
      // If backend endpoint doesn't exist or returns an error
      if (!response.ok) {
        console.warn(`Backend notifications endpoint error: ${response.status} ${response.statusText}`);
        
        // Return empty notifications array as fallback
        return NextResponse.json({
          status: 'success',
          data: []
        });
      }

      const data = await response.json();
      console.log('Successfully received notifications data from backend');
      
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error('Error connecting to backend notifications endpoint:', fetchError);
      
      // Return empty notifications as fallback
      return NextResponse.json({
        status: 'success',
        data: []
      });
    }
  } catch (error) {
    console.error('Error proxying notifications:', error);
    
    // Return a graceful error response
    return NextResponse.json({
      status: 'error',
      error: 'Failed to fetch notifications',
      data: [] // Still include empty data for the UI
    }, {
      status: 200 // Use 200 to prevent UI from breaking
    });
  }
} 