import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

/**
 * Handler for checking API health status
 * GET /api/health
 */
export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api';
  const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
  
  type ServiceStatus = {
    status: 'healthy' | 'unhealthy' | 'unknown';
    responseTime: number | null;
    error?: string;
  };
  
  const health = {
    uptime: process.uptime(),
    timestamp: Date.now(),
    environment: process.env.NODE_ENV,
    apiUrl,
    backendUrl,
    services: {
      api: { status: 'unknown', responseTime: null } as ServiceStatus,
      backend: { status: 'unknown', responseTime: null } as ServiceStatus,
    }
  };

  try {
    // Check API connectivity
    const apiStartTime = Date.now();
    await axios.get(`${apiUrl}/health`, { timeout: 3000 });
    health.services.api = {
      status: 'healthy',
      responseTime: Date.now() - apiStartTime
    };
  } catch (error: any) {
    health.services.api = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: process.env.NODE_ENV === 'development' ? error.message : 'API connection failed'
    };
  }

  try {
    // Check backend connectivity
    const backendStartTime = Date.now();
    await axios.get(`${backendUrl}/health`, { timeout: 3000 });
    health.services.backend = {
      status: 'healthy',
      responseTime: Date.now() - backendStartTime
    };
  } catch (error: any) {
    health.services.backend = {
      status: 'unhealthy',
      responseTime: Date.now() - startTime,
      error: process.env.NODE_ENV === 'development' ? error.message : 'Backend connection failed'
    };
  }

  // Overall status is healthy only if all services are healthy
  const isHealthy = Object.values(health.services).every(
    service => service.status === 'healthy'
  );

  return NextResponse.json(
    { 
      status: isHealthy ? 'healthy' : 'unhealthy',
      ...health,
      responseTime: Date.now() - startTime
    },
    { status: isHealthy ? 200 : 503 }
  );
} 