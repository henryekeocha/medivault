import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
import { AppError } from './utils/appError.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import imageRoutes from './routes/images.js';
import messageRoutes from './routes/messages.js';
import settingsRoutes from './routes/settings.js';
import fileRoutes from './routes/files.js';
import analyticsRoutes from './routes/analytics.js';
import healthRoutes from './routes/health.routes.js';
import providerRoutes from './routes/providers.js';
import notificationRoutes from './routes/notifications.js';
import { prisma } from './lib/prisma.js';
import { createServer } from 'http';
import { WebSocketService } from './services/websocket.service.js';
import { NotificationService } from './services/notification.service.js';
import { AnalyticsService } from './services/analytics.service.js';
import { NextFunction, Request, Response } from 'express';
import type { User } from '@prisma/client';
import { initializeServices, injectServices } from './middleware/services.middleware.js';

// Custom error handler type that includes our User type
type CustomErrorHandler = (
  err: Error | AppError,
  req: Request & { user?: User },
  res: Response,
  next: NextFunction
) => void;

// Extend Express Request type
declare module 'express-serve-static-core' {
  interface Request {
    user?: User;
    wsService?: WebSocketService;
    notificationService?: NotificationService;
    analyticsService?: AnalyticsService;
  }
}

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(express.json());

// CORS configuration
if (process.env.NODE_ENV === 'development') {
  console.log('Using development CORS settings');
  
  // Log the exact CORS_ORIGIN for debugging
  console.log(`CORS_ORIGIN environment variable: ${process.env.CORS_ORIGIN}`);
  
  app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'], // Allow both localhost and 127.0.0.1
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
  }));
  
  // Log the CORS configuration
  console.log(`CORS configured with origins: http://localhost:3000, http://127.0.0.1:3000`);
} else {
  // In production, use the CORS_ORIGIN from environment
  const productionOrigin = process.env.CORS_ORIGIN || 'https://your-production-domain.com';
  console.log(`Using production CORS settings with origin: ${productionOrigin}`);
  
  app.use(cors({
    origin: productionOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    optionsSuccessStatus: 200
  }));
}

// Health check route - should be public and outside API prefix
app.use('/health', healthRoutes);

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handling middleware must be the last middleware
const errorHandlerMiddleware: CustomErrorHandler = (err, req, res, next) => {
  errorHandler(err, req, res, next);
};

// Register error handler
app.use(errorHandlerMiddleware as ErrorRequestHandler);

// Create HTTP server
const server = createServer(app);

// Initialize services
const wsService = new WebSocketService(server);
const notificationService = new NotificationService(wsService, prisma);
const analyticsService = new AnalyticsService(prisma);

// Initialize services middleware
initializeServices(wsService, notificationService, analyticsService);

// Make services available globally
declare global {
  namespace Express {
    interface Request {
      wsService?: WebSocketService;
      notificationService?: NotificationService;
      analyticsService?: AnalyticsService;
    }
  }
}

// Add services to request object
app.use(injectServices);

// Start server
const PORT = parseInt(process.env.PORT || "3001", 10);
const server_url = `http://localhost:${PORT}`;

// Add debug logging for database connection
console.log('Database URL:', process.env.DATABASE_URL ? 'Set (hidden for security)' : 'Not set');
console.log('Environment:', process.env.NODE_ENV || 'development');

// Add a fallback database URL for development if it's not set
if (!process.env.DATABASE_URL && (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV)) {
  console.log('Using local database for development');
  process.env.DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/medicalimaging';
}

// Check if critical environment variables are set
if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL environment variable is not set!');
  process.exit(1);
}

// Start server and connect to database
async function bootstrap() {
  try {
    // Test database connection
    await prisma.$connect();
    console.log('Database connection established');

    // Start server and explicitly bind to 0.0.0.0 (all interfaces)
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server is running on port ${PORT} (binding on 0.0.0.0)`);
    });
  } catch (error) {
    console.error('Error connecting to database:', error);
    process.exit(1);
  }
}

bootstrap();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    console.log('💤 Process terminated!');
    process.exit(0);
  });
}); 