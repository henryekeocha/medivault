import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Handler for fetching available social identity providers
 * GET /api/auth/social/providers
 */
export async function GET(req: NextRequest) {
  try {
    // Get providers from backend
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:4000';
    const response = await axios.get(
      `${backendUrl}/api/v1/auth/social/providers`
    );
    
    return NextResponse.json(response.data);
  } catch (error: any) {
    console.error('Error fetching social providers:', error);
    
    // If we can't reach the backend, return default providers
    // This allows the UI to still function even if the backend is unavailable
    return NextResponse.json({
      success: true,
      providers: [
        { name: 'Google', type: 'Google' },
        { name: 'Facebook', type: 'Facebook' }
      ]
    });
  }
} 