import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth/auth-options';

export async function GET(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
    
    try {
      const response = await fetch(`${backendUrl}/analytics/users/${params.userId}/metrics`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.accessToken}`,
        },
      });

      // If backend endpoint doesn't exist or returns an error
      if (!response.ok) {
        console.warn(`Backend user metrics endpoint error: ${response.status} ${response.statusText}`);
        // Return default user metrics as fallback
        return NextResponse.json({
          status: 'success',
          data: {
            appointments: {
              total: 0,
              upcoming: 0,
              completed: 0,
              cancelled: 0
            },
            images: {
              total: 0,
              recentUploads: 0,
              storageUsed: '0 MB'
            },
            messages: {
              total: 0,
              unread: 0
            },
            recentActivity: []
          }
        });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error connecting to backend user metrics endpoint:', error);
      
      // Return empty metrics as fallback
      return NextResponse.json({
        status: 'success',
        data: {
          appointments: {
            total: 0,
            upcoming: 0,
            completed: 0,
            cancelled: 0
          },
          images: {
            total: 0,
            recentUploads: 0,
            storageUsed: '0 MB'
          },
          messages: {
            total: 0,
            unread: 0
          },
          recentActivity: []
        }
      });
    }
  } catch (error) {
    console.error('Error proxying user metrics:', error);
    
    // Return a graceful error response
    return NextResponse.json({
      status: 'error',
      error: 'Failed to fetch user metrics',
      data: {
        appointments: {
          total: 0,
          upcoming: 0,
          completed: 0,
          cancelled: 0
        },
        images: {
          total: 0,
          recentUploads: 0,
          storageUsed: '0 MB'
        },
        messages: {
          total: 0,
          unread: 0
        },
        recentActivity: []
      }
    }, {
      status: 200 // Use 200 to prevent UI from breaking
    });
  }
} 