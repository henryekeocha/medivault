import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(
  req: NextRequest,
  { params }: { params: { providerId: string } }
) {
  try {
    const { userId, getToken } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = await getToken();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const limit = searchParams.get('limit');

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (startDate) queryParams.append('startDate', startDate);
    if (limit) queryParams.append('limit', limit);

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
    const url = `${backendUrl}/providers/appointments?providerId=${params.providerId}&${queryParams.toString()}`;
    
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      // If backend endpoint doesn't exist or returns an error
      if (!response.ok) {
        console.warn(`Backend provider appointments endpoint error: ${response.status} ${response.statusText}`);
        // Return empty appointments array as fallback
        return NextResponse.json({
          status: 'success',
          data: []
        });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (fetchError) {
      console.error('Error connecting to backend appointments endpoint:', fetchError);
      // Return empty appointments as fallback
      return NextResponse.json({
        status: 'success',
        data: []
      });
    }
  } catch (error) {
    console.error('Error proxying provider appointments:', error);
    return NextResponse.json(
      { status: 'error', error: 'Failed to fetch provider appointments' },
      { status: 500 }
    );
  }
} 