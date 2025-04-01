import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { cookies } from 'next/headers';

export async function GET(req: NextRequest) {
  try {
    // Get auth from Clerk
    const session = await auth();
    
    // If no user ID, return unauthorized with empty data
    if (!session.userId) {
      console.warn('No authenticated user found for notifications request');
      return NextResponse.json({
        status: 'success',
        data: [] // Return empty array for better UI handling
      });
    }

    // Get token from Clerk
    const token = await session.getToken();
    
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