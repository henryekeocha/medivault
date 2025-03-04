import { Request, Response, NextFunction } from 'express';
import { WebSocketService } from '../services/websocket.service.js';
import { NotificationService } from '../services/notification.service.js';
import { AnalyticsService } from '../services/analytics.service.js';

// Services instances will be passed from the main application
let wsService: WebSocketService;
let notificationService: NotificationService;
let analyticsService: AnalyticsService;

// Initialize services
export const initializeServices = (
  ws: WebSocketService,
  notification: NotificationService,
  analytics: AnalyticsService
) => {
  wsService = ws;
  notificationService = notification;
  analyticsService = analytics;
};

// Middleware to inject services into request
export const injectServices = (req: Request, res: Response, next: NextFunction) => {
  req.wsService = wsService;
  req.notificationService = notificationService;
  req.analyticsService = analyticsService;
  next();
}; 