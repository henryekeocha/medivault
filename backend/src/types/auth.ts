import { Request } from 'express';
import { NotificationService } from '../services/notification.service.js';
import { AnalyticsService } from '../services/analytics.service.js';
import { WebSocketService } from '../services/websocket.service.js';
import { Role } from '@prisma/client';

// Define the Clerk user type
export interface ClerkUser {
  id: string;
  email: string;
  role: Role;
}

// Instead of declaring in global namespace, create a specific type for authenticated requests
// This avoids conflicts with other declarations while ensuring user is required
export interface AuthenticatedRequest extends Request {
  user: ClerkUser; // Non-optional ClerkUser for authenticated requests
  rawBody?: string;
  notificationService?: NotificationService;
  analyticsService?: AnalyticsService;
  wsService?: WebSocketService;
}

// Remove duplicate type definitions - these are already in models.ts 