import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Handler for fetching available social identity providers
 * GET /api/auth/social/providers
 */
export async function GET(req: NextRequest) {
  try {
    // Get backend URL from environment variables
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    // Log the URL being accessed (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Social Providers] Accessing backend at: ${backendUrl}/api/auth/social/providers`);
    }
    
    // Use the correct API path structure
    const response = await axios.get(
      `${backendUrl}/api/auth/social/providers`,
      {
        timeout: 3000 // 3 second timeout to prevent long hanging requests
      }
    );
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    // Don't log full error details in production
    if (process.env.NODE_ENV === 'development') {
      console.error('Error fetching social providers:', error);
    } else {
      console.error('Error fetching social providers:', error.message || 'Unknown error');
    }
    
    // Return default providers as fallback
    return NextResponse.json({
      success: true,
      providers: [
        { name: 'Google', type: 'Google' },
        { name: 'Facebook', type: 'Facebook' }
      ]
    }, { status: 200 });
  }
} 