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
    const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3001/api';
    
    try {
      const response = await fetch(`${backendUrl}/providers/analytics?providerId=${params.providerId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      // If backend endpoint doesn't exist or returns an error
      if (!response.ok) {
        console.warn(`Backend analytics endpoint error: ${response.status} ${response.statusText}`);
        // Return default provider statistics as fallback
        return NextResponse.json({
          status: 'success',
          data: {
            patientStats: {
              total: 0,
              active: 0,
              new: 0
            },
            imageStats: {
              total: 0,
              recentUploads: 0,
              storageUsed: '0 MB'
            },
            appointmentStats: {
              upcoming: 0,
              completed: 0,
              cancelled: 0
            }
          }
        });
      }

      const data = await response.json();
      return NextResponse.json(data);
    } catch (error) {
      console.error('Error connecting to backend analytics endpoint:', error);
      
      // Return empty analytics as fallback
      return NextResponse.json({
        status: 'success',
        data: {
          patientStats: {
            total: 0,
            active: 0,
            new: 0
          },
          imageStats: {
            total: 0,
            recentUploads: 0,
            storageUsed: '0 MB'
          },
          appointmentStats: {
            upcoming: 0,
            completed: 0,
            cancelled: 0
          }
        }
      });
    }
  } catch (error) {
    console.error('Error proxying analytics:', error);
    
    // Return a graceful error response
    return NextResponse.json({
      status: 'error',
      error: 'Failed to fetch analytics',
      data: {
        patientStats: {
          total: 0,
          active: 0,
          new: 0
        },
        imageStats: {
          total: 0,
          recentUploads: 0,
          storageUsed: '0 MB'
        },
        appointmentStats: {
          upcoming: 0,
          completed: 0,
          cancelled: 0
        }
      }
    }, {
      status: 200 // Use 200 to prevent UI from breaking
    });
  }
} 