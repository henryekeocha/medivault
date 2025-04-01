import express, { Request, Response, NextFunction, ErrorRequestHandler, Application } from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler.js';
import { bypassAuth } from './middleware/bypassAuth.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import imageRoutes from './routes/images.js';
import messageRoutes from './routes/messages.js';
import patientRoutes from './routes/patients.js';
import providerRoutes from './routes/providers.js';
import settingsRoutes from './routes/settings.js';
import auditRoutes from './routes/audit.js';
import analysisRoutes from './routes/analysis.js';
import notificationRoutes from './routes/notifications.js';
import appointmentRoutes from './routes/appointments.js';
import healthMetricRoutes from './routes/health-metrics.js'; 
import chatbotRoutes from './routes/chatbot.js';
import systemSettingsRoutes from './routes/system.settings.js';
import analyticsRoutes from './routes/analytics.js';
import syncRoutes from './routes/sync.routes.js';
import shareRoutes from './routes/shares.js';
import { syncUserMiddleware } from './middleware/syncUser.js';
import { clerkClient } from '@clerk/clerk-sdk-node';
import prisma from './lib/prisma.js';
import patientSettingsRoutes from './routes/v1/patient/settings.js';
import { protect } from './middleware/clerk.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app: Application = express();

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https:'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.CORS_ORIGIN, "ws:", "wss:", "127.0.0.1:*", "localhost:*"].filter(Boolean) as string[],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

// CORS configuration
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:3000'; 
console.log(`CORS_ORIGIN environment variable: ${corsOrigin}`);

const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'Authorization', 
    'x-access-token', 
    'x-request-id',
    'x-clerk-auth-token',
    'x-clerk-user-id'
  ],
  credentials: true,
  maxAge: 86400,
  exposedHeaders: ['Content-Length', 'X-Request-ID'] // Expose our custom headers
};

console.log(`CORS configured with origins: ${corsOptions.origin.join(', ')}`);
app.use(cors(corsOptions));

// Special middleware for WebSocket connections
app.use((req, res, next) => {
  // If this is a socket.io polling request or upgrade request, skip other middleware
  if (req.path.startsWith('/socket.io/') || req.headers.upgrade === 'websocket') {
    console.log(`Socket.IO request detected: ${req.method} ${req.path}`);
    // For WebSocket upgrade requests, immediately pass to the next middleware
    return next();
  }
  next();
});

// Rate limiting
const limiter = rateLimit({
  max: 100, // Maximum of 100 requests per IP in specified window
  windowMs: 15 * 60 * 1000, // 15 minutes
  message: 'Too many requests from this IP, please try again in 15 minutes'
});
app.use('/api/', limiter);

// Body parsing and additional middleware
app.use(compression()); // Compress responses
app.use(cookieParser(process.env.ENCRYPTION_KEY));
app.use(express.json({
  limit: process.env.MAX_FILE_SIZE || '10mb',
  verify: (req: Request, res: Response, buf: Buffer) => {
    (req as any).rawBody = buf.toString();
  }
}));
app.use(express.urlencoded({
  extended: true,
  limit: process.env.MAX_FILE_SIZE || '10mb'
}));

// Logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Simple diagnostic endpoint for debugging
app.get('/api/test', (req: Request, res: Response) => {
  res.json({ 
    message: 'Test endpoint is working', 
    timestamp: new Date().toISOString(),
    env: {
      CORS_ORIGIN: process.env.CORS_ORIGIN,
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
      AWS_REGION: process.env.AWS_REGION
    }
  });
});

// Basic POST endpoint test
app.post('/api/test-auth', (req: Request, res: Response) => {
  console.log('Test auth endpoint hit with body:', req.body);
  res.json({ 
    success: true, 
    message: 'Test auth endpoint working',
    receivedData: {
      email: req.body?.email || 'not provided',
      passwordProvided: req.body?.password ? true : false
    }
  });
});

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// Add auth routes BEFORE the bypass middleware - these don't require auth for most endpoints
app.use('/api/auth', authRoutes);

// Add shares routes
app.use('/api/shares', shareRoutes);

// Add specific endpoint for user sync that doesn't require authentication
app.post('/api/auth/sync/:clerkId', async (req: Request, res: Response) => {
  try {
    const clerkId = req.params.clerkId;
    const force = !!req.body?.force;
    console.log(`Direct sync endpoint called for Clerk ID: ${clerkId}, Force: ${force}`);
    
    if (!clerkId) {
      return res.status(400).json({ 
        success: false, 
        message: 'Clerk ID is required in URL' 
      });
    }
    
    // Get user from Clerk
    const clerkUser = await clerkClient.users.getUser(clerkId);
    
    if (!clerkUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found in Clerk' 
      });
    }
    
    // Get primary email
    const primaryEmailId = clerkUser.primaryEmailAddressId;
    const primaryEmail = clerkUser.emailAddresses.find(
      emailObj => emailObj.id === primaryEmailId
    );
    
    if (!primaryEmail?.emailAddress) {
      return res.status(400).json({
        success: false,
        message: 'User has no primary email address'
      });
    }
    
    // Get role from metadata or default to PATIENT
    const role = (req.body?.role || clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || 'PATIENT');
    
    // Construct name from first and last name
    const name = `${clerkUser.firstName || ''} ${clerkUser.lastName || ''}`.trim();
    
    // Get verification status
    const emailVerified = primaryEmail.verification?.status === 'verified'
      ? new Date()
      : null;
    
    // Try to find existing user first
    const existingUser = await prisma.user.findFirst({
      where: { authId: clerkId }
    });
    
    let user;
    if (existingUser && !force) {
      // Update existing user
      user = await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          email: primaryEmail.emailAddress,
          name: name || existingUser.name,
          role,
          image: clerkUser.imageUrl || existingUser.image,
          emailVerified: emailVerified || existingUser.emailVerified,
          lastLoginAt: new Date(),
        }
      });
      
      console.log(`Updated existing user with ID: ${user.id}`);
    } else {
      // If user exists but force is true, do a full refresh of user data
      if (existingUser && force) {
        console.log(`Force update requested for user ${existingUser.id}`);
        user = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            email: primaryEmail.emailAddress,
            name: name || 'User',
            role,
            image: clerkUser.imageUrl,
            emailVerified: emailVerified,
            lastLoginAt: new Date(),
            // Reset any fields that might need refreshing
            isActive: true,
          }
        });
        console.log(`Force-updated existing user with ID: ${user.id}`);
      } else {
        // Generate username if needed
        const baseUsername = `${clerkUser.firstName || ''}${clerkUser.lastName || ''}`.toLowerCase().replace(/\s+/g, '');
        const timestamp = Date.now().toString().slice(-6);
        const username = baseUsername.length < 3 ? 
                          `user_${timestamp}` : 
                          `${baseUsername}_${timestamp}`;
        
        // Create new user
        user = await prisma.user.create({
          data: {
            authId: clerkId,
            name: name || 'User',
            email: primaryEmail.emailAddress,
            username,
            password: '', // Empty since we're using Clerk
            role,
            isActive: true,
            emailVerified: emailVerified || null,
            lastLoginAt: new Date(),
            image: clerkUser.imageUrl,
          }
        });
        
        console.log(`Created new user with ID: ${user.id}`);
      }
    }
    
    // Update Clerk metadata
    try {
      await clerkClient.users.updateUser(clerkId, {
        publicMetadata: {
          ...clerkUser.publicMetadata,
          role,
          dbUserId: user.id,
          dbSynced: true,
          lastSyncAt: new Date().toISOString()
        }
      });
      
      console.log(`Updated Clerk metadata for user ${user.id}`);
    } catch (metadataError) {
      console.error('Error updating Clerk metadata:', metadataError);
      // Continue execution even if metadata update fails
    }
    
    return res.status(200).json({
      success: true,
      message: 'User synchronized successfully',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Error in direct sync endpoint:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to synchronize user data',
      error: process.env.NODE_ENV === 'development' ? String(error) : undefined
    });
  }
});

// Apply bypassAuth to all other API routes that require auth checking
app.use('/api/users', bypassAuth, userRoutes);
app.use('/api/images', bypassAuth, imageRoutes);
app.use('/api/messages', bypassAuth, messageRoutes);
app.use('/api/patients', bypassAuth, patientRoutes);
app.use('/api/providers', bypassAuth, providerRoutes);
app.use('/api/settings', bypassAuth, settingsRoutes);
app.use('/api/audit', bypassAuth, auditRoutes);
app.use('/api/analysis', bypassAuth, analysisRoutes);
app.use('/api/notifications', bypassAuth, notificationRoutes);
app.use('/api/appointments', bypassAuth, appointmentRoutes);
app.use('/api/health-metrics', bypassAuth, healthMetricRoutes);
app.use('/api/chatbot', bypassAuth, chatbotRoutes);
app.use('/api/system-settings', bypassAuth, systemSettingsRoutes);
app.use('/api/analytics', bypassAuth, analyticsRoutes);
app.use('/api/v1/patient/settings', protect, patientSettingsRoutes);

// Add the sync routes - protected and with sync middleware
app.use('/api/sync', bypassAuth, syncUserMiddleware, syncRoutes);

// Error handling
app.use(errorHandler as ErrorRequestHandler);

export default app; 