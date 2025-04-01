import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    const token = await session.getToken();
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const limit = searchParams.get('limit');
    const providerId = searchParams.get('providerId');

    // Build query parameters
    const queryParams = new URLSearchParams();
    if (status) queryParams.append('status', status);
    if (startDate) queryParams.append('startDate', startDate);
    if (endDate) queryParams.append('endDate', endDate);
    if (limit) queryParams.append('limit', limit);
    if (providerId) queryParams.append('doctorId', providerId);

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001';
    const url = `${backendUrl}/api/providers/appointments?${queryParams.toString()}`;
    
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
          data: {
            items: [],
            totalCount: 0,
            pagination: {
              page: 1,
              limit: Number(limit) || 10,
              total: 0
            }
          }
        });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error connecting to backend appointments endpoint:', error);
      // Return empty appointments as fallback
      return NextResponse.json({
        status: 'success',
        data: {
          items: [],
          totalCount: 0,
          pagination: {
            page: 1,
            limit: Number(limit) || 10,
            total: 0
          }
        }
      });
    }
  } catch (error) {
    console.error('Error proxying provider appointments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch provider appointments' },
      { status: 500 }
    );
  }
} 