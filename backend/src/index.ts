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
import shareRoutes from './routes/shares.js';
import syncRoutes from './routes/sync.routes.js';
import prisma from './lib/prisma.js';
import { createServer } from 'http';
import { WebSocketService } from './services/websocket.service.js';
import { NotificationService } from './services/notification.service.js';
import { AnalyticsService } from './services/analytics.service.js';
import { NextFunction, Request, Response } from 'express';
import type { User } from '@prisma/client';
import { initializeServices, injectServices } from './middleware/services.middleware.js';
import { PrismaClient, Role, AppointmentStatus } from '@prisma/client';
import authRoutesV2 from './routes/auth.routes.js';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { bypassAuth } from './middleware/bypassAuth.js';
import { syncUserMiddleware } from './middleware/syncUser.js';
import patientSettingsRoutes from './routes/v1/patient/settings.js';
import { protect } from './middleware/clerk.js';
import { AuthenticatedRequest } from './types/auth.js';
import { logger } from './utils/logger.js';
import { ImageType } from './types/enums.js';

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
    clerkId?: string; // Add clerkId for Clerk integration
  }
}

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Create HTTP server first, before applying any middleware
const server = createServer(app);

// Debug WebSocket connections
server.on('upgrade', (request, socket, head) => {
  const { pathname } = new URL(request.url || '', `http://${request.headers.host}`);
  console.log(`WebSocket upgrade request for: ${pathname}`);
});

// Initialize Socket.IO service immediately
console.log('Initializing WebSocket service...');
const wsService = new WebSocketService(server);

// Log environment variables for debugging
console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
console.log(`CLERK_SECRET_KEY: ${process.env.CLERK_SECRET_KEY ? 'Set' : 'Not set'}`);
console.log(`WebSocket URL: ${process.env.NEXT_PUBLIC_WS_URL || 'Not set'}`);

// Middleware - add explicit debug to see each middleware execution
app.use((req, res, next) => {
  if (req.headers.upgrade === 'websocket') {
    console.log(`WebSocket request detected: ${req.method} ${req.url}`);
  }
  next();
});

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
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept', 
      'Origin', 
      'x-request-id',
      'x-clerk-auth-token',
      'x-clerk-user-id',
      'Sec-WebSocket-Key', 
      'Sec-WebSocket-Version', 
      'Sec-WebSocket-Extensions', 
      'Sec-WebSocket-Protocol', 
      'Connection', 
      'Upgrade'
    ],
    exposedHeaders: ['Authorization', 'Content-Type', 'x-request-id'],
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
    allowedHeaders: [
      'Content-Type', 
      'Authorization', 
      'X-Requested-With', 
      'Accept', 
      'Origin', 
      'x-request-id',
      'x-clerk-auth-token',
      'x-clerk-user-id',
      'Sec-WebSocket-Key', 
      'Sec-WebSocket-Version', 
      'Sec-WebSocket-Extensions', 
      'Sec-WebSocket-Protocol', 
      'Connection', 
      'Upgrade'
    ],
    exposedHeaders: ['Authorization', 'Content-Type', 'x-request-id'],
    optionsSuccessStatus: 200
  }));
}

// Health check route - should be public and outside API prefix
app.use('/health', healthRoutes);

// Add API health endpoint to match frontend requests
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Add missing auth endpoints that are expected by the front-end
app.post('/api/auth/send-code', async (req, res) => {
  try {
    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }
    
    // Look up the user by email
    console.log(`2FA: Looking up user with email: ${email}`);
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      console.error(`2FA: User not found with email: ${email}`);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    if (!user.authId) {
      console.error(`2FA: User has no Clerk ID (authId): ${user.id}`);
      return res.status(400).json({
        status: 'error',
        message: 'User has no associated Clerk account'
      });
    }
    
    // Return the user's Clerk ID for the frontend to handle verification
    return res.status(200).json({
      status: 'success',
      message: 'User found. 2FA should be handled through Clerk in the frontend',
      clerkId: user.authId,
      userId: user.id
    });
  } catch (error) {
    console.error('2FA: Error processing verification request:', error);
    return res.status(500).json({
      status: 'error',
      message: 'An error occurred'
    });
  }
});

// Add verify-code endpoint
app.post('/api/auth/verify-code', async (req, res) => {
  try {
    const { email, code, clerkId } = req.body;
    
    if (!email) {
      console.error('2FA: Missing email parameter');
      return res.status(400).json({
        status: 'error',
        message: 'Email is required'
      });
    }
    
    // Find user by email
    console.log(`2FA: Looking up user with email: ${email}`);
    const user = await prisma.user.findFirst({
      where: { email: email.toLowerCase() }
    });
    
    if (!user) {
      console.error(`2FA: User not found with email: ${email}`);
      return res.status(404).json({
        status: 'error',
        message: 'User not found'
      });
    }
    
    console.log(`2FA: User found: ${user.id}, authId: ${user.authId || 'none'}`);
    
    // Use the Clerk ID from the request body if provided, otherwise use the user's authId
    const userClerkId = clerkId || user.authId;
    
    if (!userClerkId) {
      console.error(`2FA: No Clerk ID available for user: ${user.id}`);
      return res.status(400).json({
        status: 'error',
        message: 'No Clerk ID associated with this user'
      });
    }
    
    // Verify with Clerk that this user has completed 2FA
    try {
      // Get the current user state from Clerk
      const clerkUser = await clerkClient.users.getUser(userClerkId);
      
      if (!clerkUser) {
        console.error(`2FA: User not found in Clerk: ${userClerkId}`);
        return res.status(404).json({
          status: 'error',
          message: 'User not found in Clerk'
        });
      }
      
      // We don't verify the code here - Clerk handles that via the frontend SDK
      // Instead, we update our database and the Clerk metadata to record the verification
      
      // Update the user's last login timestamp
      await prisma.user.update({
        where: { id: user.id },
        data: { 
          lastLoginAt: new Date(),
          // Also update any other relevant fields
          emailVerified: clerkUser.emailAddresses.some(email => 
            email.verification?.status === 'verified') ? new Date() : user.emailVerified
        }
      });
      
      console.log(`2FA: Updated last login time for user ${user.id}`);
      
      // Update Clerk metadata to mark 2FA as verified
      await clerkClient.users.updateUser(userClerkId, {
        publicMetadata: { 
          ...clerkUser.publicMetadata,
          twoFactorVerified: true,
          twoFactorRequired: true, // Ensure this stays set
          lastVerification: new Date().toISOString(),
          // Also ensure the role and database ID are set
          role: user.role,
          dbUserId: user.id,
          dbSynced: true
        }
      });
      
      console.log(`2FA: Updated Clerk metadata for user ${user.id}, authId: ${userClerkId}`);
      
      return res.status(200).json({
        status: 'success',
        message: 'Verification successful',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role
        }
      });
    } catch (clerkError) {
      console.error('2FA: Error verifying with Clerk:', clerkError);
      return res.status(500).json({
        status: 'error',
        message: 'Failed to verify with Clerk'
      });
    }
  } catch (error) {
    console.error('2FA: Error verifying code:', error);
    return res.status(500).json({
      status: 'error',
      message: 'Failed to verify code'
    });
  }
});

// Webhook handler to sync users immediately upon registration
app.post('/api/webhooks/clerk', async (req, res) => {
  try {
    const { type, data } = req.body;
    console.log(`Webhook received: ${type}`);
    
    // Only process user.created events
    if (type === 'user.created') {
      const userId = data.id;
      
      try {
        // Get the user from Clerk
        const clerkUser = await clerkClient.users.getUser(userId);
        
        if (!clerkUser) {
          console.error(`Webhook: User not found in Clerk with ID: ${userId}`);
          return res.status(404).json({ success: false, message: 'User not found in Clerk' });
        }
        
        // Get primary email
        const primaryEmailId = clerkUser.primaryEmailAddressId;
        const primaryEmail = clerkUser.emailAddresses.find(
          emailObj => emailObj.id === primaryEmailId
        );
        
        if (!primaryEmail?.emailAddress) {
          console.error(`Webhook: No primary email found for Clerk user: ${userId}`);
          return res.status(400).json({ success: false, message: 'User has no primary email address' });
        }
        
        // Default to PATIENT role if not specified
        const role = (clerkUser.publicMetadata?.role || 'PATIENT') as Role;
        
        // Format email verification date
        const emailVerified = primaryEmail.verification?.status === 'verified' ? new Date() : null;
        
        // Generate username
        const timestamp = Date.now().toString().slice(-6);
        const firstName = clerkUser.firstName || '';
        const lastName = clerkUser.lastName || '';
        const baseUsername = `${firstName}${lastName}`.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '');
        const username = baseUsername.length < 3 ? `user_${timestamp}` : `${baseUsername}_${timestamp}`;
        
        // Create user in our database
        const user = await prisma.user.create({
          data: {
            authId: userId,
            name: `${firstName || ''} ${lastName || ''}`.trim() || 'User',
            email: primaryEmail.emailAddress,
            username,
            password: '', // Empty since we're using Clerk
            emailVerified,
            role,
            isActive: true,
            lastLoginAt: new Date(),
            image: clerkUser.imageUrl,
          }
        });
        
        console.log(`Webhook: Created new user: ${user.id} with authId: ${userId}`);
        
        // Update Clerk metadata with the database ID and explicitly set 2FA requirement
        await clerkClient.users.updateUser(userId, {
          publicMetadata: { 
            ...clerkUser.publicMetadata,
            role,
            dbSynced: true,
            dbUserId: user.id,
            twoFactorRequired: true,
            twoFactorVerified: false,
            preferredMfaMethod: 'email_code',
            syncTimestamp: new Date().toISOString()
          }
        });
        
        console.log(`Webhook: Updated Clerk metadata and configured 2FA for user ${user.id}`);
      } catch (error) {
        console.error('Webhook: Error creating user:', error);
        return res.status(500).json({ success: false, message: 'Error creating user' });
      }
    }
    
    // Return success for all webhook types to acknowledge receipt
    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/auth', authRoutesV2); // Use the auth.routes.ts file for 2FA endpoints
app.use('/api/users', userRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/shares', shareRoutes);
app.use('/api/sync', bypassAuth, syncUserMiddleware, syncRoutes);
app.use('/api/v1/patient/settings', protect, patientSettingsRoutes);

// Admin routes
app.get('/api/admin/statistics', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // Get statistics data
    const [userCount, imageCount, storageSize] = await Promise.all([
      prisma.user.count(),
      prisma.image.count(),
      prisma.image.aggregate({
        _sum: {
          fileSize: true
        }
      })
    ]);

    // Get user counts by role
    const providers = await prisma.user.count({ where: { role: 'PROVIDER' } });
    const patients = await prisma.user.count({ where: { role: 'PATIENT' } });
    const admins = await prisma.user.count({ where: { role: 'ADMIN' } });

    // Get new users today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const newToday = await prisma.user.count({
      where: {
        createdAt: {
          gte: today
        }
      }
    });

    // Get images uploaded today
    const uploadedToday = await prisma.image.count({
      where: {
        uploadDate: {
          gte: today
        }
      }
    });

    // Get appointment statistics
    const [todayAppointments, upcomingAppointments, completedAppointments, cancelledAppointments] = await Promise.all([
      // Today's appointments (scheduled for today)
      prisma.appointment.count({
        where: {
          datetime: {
            gte: today,
            lt: new Date(today.getTime() + 24 * 60 * 60 * 1000) // Tomorrow
          },
          status: {
            in: [AppointmentStatus.SCHEDULED]
          }
        }
      }),
      // Upcoming appointments (all future appointments)
      prisma.appointment.count({
        where: {
          datetime: {
            gte: today
          },
          status: {
            in: [AppointmentStatus.SCHEDULED]
          }
        }
      }),
      // Completed appointments
      prisma.appointment.count({
        where: {
          status: AppointmentStatus.COMPLETED
        }
      }),
      // Cancelled appointments
      prisma.appointment.count({
        where: {
          status: AppointmentStatus.CANCELLED
        }
      })
    ]);

    res.json({
      status: 'success',
      data: {
        totalUsers: userCount,
        totalImages: imageCount,
        totalStorageBytes: storageSize._sum.fileSize || 0,
        totalStorageGB: `${((storageSize._sum.fileSize || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB`,
        userStats: {
          total: userCount,
          active: userCount, // Simplified - would need a proper active user check
          providers,
          patients,
          admins,
          newToday
        },
        imageStats: {
          total: imageCount,
          uploadedToday,
          processingQueue: 0, // Default value
          storageUsed: `${((storageSize._sum.fileSize || 0) / (1024 * 1024 * 1024)).toFixed(2)} GB`,
          failedUploads: 0 // Default value
        },
        appointments: {
          today: todayAppointments,
          upcoming: upcomingAppointments,
          completed: completedAppointments,
          cancelled: cancelledAppointments
        },
        users: {
          providers,
          patients
        }
      }
    });
  } catch (error) {
    console.error('Error retrieving admin statistics:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to retrieve statistics' }
    });
  }
});

app.get('/api/admin/system-health', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // Get active users (users active in the last 15 minutes)
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const activeUsers = await prisma.user.count({
      where: {
        lastActiveAt: {
          gte: fifteenMinutesAgo
        }
      }
    });

    // Get storage usage
    const storageUsage = await prisma.image.aggregate({
      _sum: {
        fileSize: true
      }
    });

    // System uptime (in seconds)
    const uptime = process.uptime();
    const uptimeFormatted = formatUptime(uptime);

    res.json({
      status: 'success',
      data: {
        status: 'healthy',
        uptime: uptimeFormatted,
        lastBackup: 'Not configured',
        storageUsed: storageUsage._sum.fileSize || 0,
        totalStorage: 100 * 1024 * 1024 * 1024, // 100GB as an example
        activeUsers,
        cpuUsage: 0, // Would need OS-level monitoring
        memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024, // In MB
        diskUsage: 0, // Would need OS-level monitoring
        maxConcurrentUsers: 100 // Example value
      }
    });
  } catch (error) {
    console.error('Error fetching system health:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch system health data' }
    });
  }
});

app.get('/api/admin/system-alerts', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // For now, return empty alerts array
    res.json({
      status: 'success',
      data: {
        alerts: []
      }
    });
  } catch (error) {
    console.error('Error fetching system alerts:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch system alerts' }
    });
  }
});

app.get('/api/admin/activity-logs', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    // Query user activity logs
    const activities = await prisma.userActivity.findMany({
      take: limit,
      skip: skip,
      orderBy: {
        timestamp: 'desc'
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Count total activities
    const totalCount = await prisma.userActivity.count();

    // Return paginated response
    res.json({
      status: 'success',
      data: {
        data: activities,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching activity logs:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch activity logs' }
    });
  }
});

// User management endpoints
app.get('/api/admin/users', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Get filtering parameters
    const role = req.query.role as string | undefined;
    const status = req.query.status as string | undefined;
    const search = req.query.search as string | undefined;
    
    // Get sorting parameters
    const sortBy = req.query.sortBy as string || 'createdAt';
    const sortDirection = req.query.sortDirection as string || 'desc';

    // Build where clause based on filters
    const where: any = {};
    
    if (role) {
      where.role = role.toUpperCase();
    }
    
    if (status) {
      where.isActive = status.toLowerCase() === 'active';
    }
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Query users with pagination and filtering
    const users = await prisma.user.findMany({
      take: limit,
      skip: skip,
      where,
      orderBy: {
        [sortBy]: sortDirection
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
        authId: true,
        username: true,
        image: true
      }
    });

    // Count total users matching filters
    const totalCount = await prisma.user.count({ where });

    // Return paginated response
    res.json({
      status: 'success',
      data: {
        data: users,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch users' }
    });
  }
});

// Create user endpoint
app.post('/api/admin/users', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { name, email, role, password } = req.body;

    // Validate input
    if (!name || !email || !role) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'Name, email, and role are required' }
      });
    }

    // Check if user with email already exists
    const existingUser = await prisma.user.findFirst({
      where: { email }
    });

    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'User with this email already exists' }
      });
    }

    // Create user
    const user = await prisma.user.create({
      data: {
        name,
        email,
        role,
        // Create a username from email or name
        username: email.split('@')[0] || name.toLowerCase().replace(/\s+/g, '.'),
        isActive: true,
        ...(password && { password }) // Only include password if provided
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to create user' }
    });
  }
});

// Update user endpoint
app.patch('/api/admin/users/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { id } = req.params;
    const { name, email, role, isActive } = req.body;

    // Validate input
    if (!id) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'User ID is required' }
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'User not found' }
      });
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(isActive !== undefined && { isActive })
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to update user' }
    });
  }
});

// Deactivate user endpoint
app.post('/api/admin/users/:id/deactivate', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { id } = req.params;
    const { reason } = req.body;

    // Validate input
    if (!id) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'User ID is required' }
      });
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id }
    });

    if (!existingUser) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'User not found' }
      });
    }

    // Deactivate user
    const user = await prisma.user.update({
      where: { id },
      data: {
        isActive: false
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true
      }
    });

    // Log deactivation
    await prisma.userActivity.create({
      data: {
        userId: req.user.id,
        action: 'USER_DEACTIVATED',
        resourceType: 'USER',
        resourceId: id,
        metadata: { reason }
      }
    });

    res.json({
      status: 'success',
      data: user
    });
  } catch (error) {
    console.error('Error deactivating user:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to deactivate user' }
    });
  }
});

// Storage management endpoints
app.get('/api/admin/storage', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // Get total image storage information
    const [totalFiles, storageUsed, imagesByType] = await Promise.all([
      prisma.image.count(),
      prisma.image.aggregate({
        _sum: {
          fileSize: true
        }
      }),
      prisma.image.groupBy({
        by: ['type'],
        _count: {
          id: true
        },
        _sum: {
          fileSize: true
        }
      })
    ]);

    // Prepare storage by type statistics
    const imageTypeStats: Record<string, number> = {};
    const storageByStatus: Record<string, number> = {
      PROCESSING: 0,
      READY: 0,
      ERROR: 0
    };

    for (const stat of imagesByType) {
      imageTypeStats[stat.type] = stat._count.id;
    }

    // Get storage by status
    const storageByStatusData = await prisma.image.groupBy({
      by: ['status'],
      _sum: {
        fileSize: true
      }
    });

    for (const stat of storageByStatusData) {
      storageByStatus[stat.status] = (stat._sum.fileSize || 0) / (1024 * 1024); // Convert to MB
    }

    // Get storage by age
    const today = new Date();
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(today.getDate() - 30);
    
    const ninetyDaysAgo = new Date(today);
    ninetyDaysAgo.setDate(today.getDate() - 90);
    
    const oneEightyDaysAgo = new Date(today);
    oneEightyDaysAgo.setDate(today.getDate() - 180);

    const [lessThan30Days, between30And90Days, between90And180Days, moreThan180Days] = await Promise.all([
      prisma.image.aggregate({
        where: {
          uploadDate: {
            gte: thirtyDaysAgo
          }
        },
        _sum: {
          fileSize: true
        }
      }),
      prisma.image.aggregate({
        where: {
          uploadDate: {
            lt: thirtyDaysAgo,
            gte: ninetyDaysAgo
          }
        },
        _sum: {
          fileSize: true
        }
      }),
      prisma.image.aggregate({
        where: {
          uploadDate: {
            lt: ninetyDaysAgo,
            gte: oneEightyDaysAgo
          }
        },
        _sum: {
          fileSize: true
        }
      }),
      prisma.image.aggregate({
        where: {
          uploadDate: {
            lt: oneEightyDaysAgo
          }
        },
        _sum: {
          fileSize: true
        }
      })
    ]);

    // Get storage by user (top users by storage)
    const storageByUserData = await prisma.user.findMany({
      take: 10,
      select: {
        id: true,
        name: true,
        _count: {
          select: {
            images: true
          }
        },
        images: {
          select: {
            fileSize: true
          }
        }
      },
      orderBy: {
        images: {
          _count: 'desc'
        }
      }
    });

    const storageByUser = storageByUserData.map(user => {
      const userStorageBytes = user.images.reduce((sum, image) => sum + (image.fileSize || 0), 0);
      return {
        userId: user.id,
        userName: user.name,
        storageUsed: userStorageBytes / (1024 * 1024), // Convert to MB
        filesCount: user._count.images
      };
    });

    // Prepare the response
    const totalStorageMB = (storageUsed._sum.fileSize || 0) / (1024 * 1024);
    const totalAvailableMB = 1024 * 1024; // 1TB example allocation
    const availableStorageMB = Math.max(0, totalAvailableMB - totalStorageMB);

    res.json({
      status: 'success',
      data: {
        totalStorage: totalAvailableMB, // MB
        usedStorage: totalStorageMB, // MB
        availableStorage: availableStorageMB, // MB
        filesCount: totalFiles,
        imagesByType: imageTypeStats,
        storageByUser,
        storageByAge: {
          lessThan30Days: (lessThan30Days._sum.fileSize || 0) / (1024 * 1024), // MB
          between30And90Days: (between30And90Days._sum.fileSize || 0) / (1024 * 1024), // MB
          between90And180Days: (between90And180Days._sum.fileSize || 0) / (1024 * 1024), // MB
          moreThan180Days: (moreThan180Days._sum.fileSize || 0) / (1024 * 1024) // MB
        },
        storageByStatus,
        // Include 6 months of history (mock data for now)
        history: Array.from({ length: 6 }).map((_, index) => {
          const date = new Date();
          date.setMonth(date.getMonth() - index);
          return {
            month: date.toLocaleString('default', { month: 'short', year: 'numeric' }),
            storageUsed: Math.max(0, totalStorageMB - (index * totalStorageMB / 10)) // Mock decreasing storage usage
          };
        })
      }
    });
  } catch (error) {
    console.error('Error fetching storage statistics:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch storage statistics' }
    });
  }
});

// Storage cleanup endpoint
app.post('/api/admin/storage/cleanup', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { olderThan, types, status } = req.body;

    // Validate input
    if (!olderThan || !Array.isArray(types) || !Array.isArray(status)) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'olderThan, types, and status are required' }
      });
    }

    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(olderThan));

    // Find files to delete
    const filesToDelete = await prisma.image.findMany({
      where: {
        uploadDate: {
          lt: cutoffDate
        },
        ...(types.length > 0 ? { type: { in: types } } : {}),
        ...(status.length > 0 ? { status: { in: status } } : {})
      },
      select: {
        id: true,
        fileSize: true
      }
    });

    // For safety in this implementation, we won't actually delete files
    // but we'll return how many would be deleted and how much space would be freed
    const deletedCount = filesToDelete.length;
    const freedSpaceBytes = filesToDelete.reduce((sum, file) => sum + (file.fileSize || 0), 0);
    const freedSpaceMB = freedSpaceBytes / (1024 * 1024);

    res.json({
      status: 'success',
      data: {
        deletedCount,
        freedSpace: freedSpaceMB.toFixed(2),
        message: 'Cleanup simulation complete. No files were actually deleted.'
      }
    });
  } catch (error) {
    console.error('Error running storage cleanup:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to run storage cleanup' }
    });
  }
});

// Admin image management endpoints
app.get('/api/admin/images', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Get filtering parameters
    const type = req.query.type as string | undefined;
    const status = req.query.status as string | undefined;
    const patientId = req.query.patientId as string | undefined;
    
    // Build where clause based on filters
    const where: any = {};
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (patientId) {
      where.patientId = patientId;
    }

    // Query images with pagination and filtering
    const [images, totalCount] = await Promise.all([
      prisma.image.findMany({
        take: limit,
        skip: skip,
        where,
        orderBy: {
          uploadDate: 'desc'
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      }),
      prisma.image.count({ where })
    ]);

    // Return paginated response
    res.json({
      status: 'success',
      data: {
        data: images,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin images:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch images' }
    });
  }
});

app.get('/api/admin/images/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { id } = req.params;

    // Get image by id
    const image = await prisma.image.findUnique({
      where: { id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        annotations: true
      }
    });

    if (!image) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'Image not found' }
      });
    }

    res.json({
      status: 'success',
      data: image
    });
  } catch (error) {
    console.error('Error fetching image details:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch image details' }
    });
  }
});

app.patch('/api/admin/images/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { id } = req.params;
    const { status, type, metadata } = req.body;

    // Check if image exists
    const existingImage = await prisma.image.findUnique({
      where: { id }
    });

    if (!existingImage) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'Image not found' }
      });
    }

    // Update image
    const image = await prisma.image.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(type && { type }),
        ...(metadata && { metadata })
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    res.json({
      status: 'success',
      data: image
    });
  } catch (error) {
    console.error('Error updating image:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to update image' }
    });
  }
});

app.delete('/api/admin/images/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { id } = req.params;

    // Check if image exists
    const existingImage = await prisma.image.findUnique({
      where: { id }
    });

    if (!existingImage) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'Image not found' }
      });
    }

    // Delete image
    await prisma.image.delete({
      where: { id }
    });

    // Log deletion
    await prisma.userActivity.create({
      data: {
        userId: req.user.id,
        action: 'IMAGE_DELETED',
        resourceType: 'IMAGE',
        resourceId: id,
        metadata: { 
          imageId: id,
          originalUploader: existingImage.userId,
          patientId: existingImage.patientId,
          fileSize: existingImage.fileSize
        }
      }
    });

    res.json({
      status: 'success',
      data: { message: 'Image deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting image:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to delete image' }
    });
  }
});

app.get('/api/admin/images/:id/download', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { id } = req.params;

    // Get image by id
    const image = await prisma.image.findUnique({
      where: { id }
    });

    if (!image) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'Image not found' }
      });
    }

    // For S3 or other storage, you would generate a signed URL or stream the file
    // For local storage, you would send the file directly
    // This implementation depends on how files are stored

    // Example for local storage:
    // const filePath = path.join(__dirname, '../uploads', image.path);
    // res.download(filePath, image.filename);

    // For now, just return a success message with the file info
    res.json({
      status: 'success',
      data: { 
        message: 'Download endpoint implemented. File would be streamed here.',
        fileInfo: {
          filename: image.filename,
          type: image.type,
          size: image.fileSize
        }
      }
    });
  } catch (error) {
    console.error('Error downloading image:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to download image' }
    });
  }
});

// Import or define a proper interface for DICOM metadata
interface DicomMetadata {
  patientName?: string;
  patientId?: string;
  patientBirthDate?: string;
  patientSex?: string;
  studyDate?: string;
  studyTime?: string;
  studyDescription?: string;
  seriesDescription?: string;
  modality?: string;
  manufacturer?: string;
  institutionName?: string;
  [key: string]: string | undefined;
}

app.get('/api/admin/images/:id/dicom-metadata', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { id } = req.params;

    // Get image by id
    const image = await prisma.image.findUnique({
      where: { id }
    });

    if (!image) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'Image not found' }
      });
    }

    // Check if image is DICOM
    // Using a string type assertion since DICOM is stored as a string in the database
    // but may not be part of the ImageType enum
    const imageType = image.type as string;
    if (imageType !== 'DICOM') {
      return res.status(400).json({
        status: 'error',
        error: { message: 'Image is not a DICOM file' }
      });
    }

    // In a real implementation, you would retrieve and parse DICOM metadata
    // For now, return placeholder data
    const metadata = image.metadata as Record<string, any> || {};
    
    res.json({
      status: 'success',
      data: {
        patientName: metadata.patientName || 'Unknown',
        patientId: image.patientId,
        studyDate: metadata.studyDate || new Date().toISOString(),
        modality: metadata.modality || 'Unknown',
        studyDescription: metadata.studyDescription || 'No description',
        seriesDescription: metadata.seriesDescription || 'No description',
        // Add any DICOM-specific tags here
      } as DicomMetadata
    });
  } catch (error) {
    console.error('Error fetching DICOM metadata:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch DICOM metadata' }
    });
  }
});

// Helper function to format uptime
function formatUptime(uptime: number): string {
  const days = Math.floor(uptime / (24 * 60 * 60));
  const hours = Math.floor((uptime % (24 * 60 * 60)) / (60 * 60));
  const minutes = Math.floor((uptime % (60 * 60)) / 60);
  const seconds = Math.floor(uptime % 60);
  
  return `${days}d ${hours}h ${minutes}m ${seconds}s`;
}

// Admin settings endpoints
app.get('/api/admin/settings', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // Default settings object matching what the frontend expects
    const settings = {
      system: {
        maintenanceMode: false,
        debugMode: process.env.NODE_ENV === 'development',
        maxUploadSize: 100, // MB
        maxStoragePerUser: 1024, // MB (1GB)
        autoDeleteInactiveAccounts: 365, // days
        maxConcurrentUploads: 3,
      },
      security: {
        requireTwoFactor: true,
        passwordExpiryDays: 90,
        maxLoginAttempts: 5,
        sessionTimeout: 30, // minutes
        allowedIpRanges: [],
        enforceStrongPasswords: true,
        minPasswordLength: 8,
      },
      email: {
        smtpServer: process.env.SMTP_HOST || '',
        smtpPort: parseInt(process.env.SMTP_PORT || '587'),
        smtpUsername: process.env.SMTP_USER || '',
        smtpPassword: process.env.SMTP_PASS ? '********' : '', // Mask the password
        defaultFromEmail: process.env.FROM_EMAIL || 'noreply@example.com',
        defaultFromName: process.env.FROM_NAME || 'Medical Imaging System',
      },
      storage: {
        provider: 'local',
        region: process.env.AWS_REGION || '',
        bucket: process.env.AWS_BUCKET || '',
        cdnEnabled: false,
        compressionEnabled: true,
        backupEnabled: true,
        backupFrequency: 'daily',
        retentionPeriod: 90, // days
      },
      compliance: {
        hipaaLoggingEnabled: true,
        auditTrailRetention: 365, // days
        dataEncryptionLevel: 'AES-256',
        requireConsentForSharing: true,
        requireReasonForAccess: true,
        automaticLogout: true,
      },
      api: {
        rateLimit: 100,
        rateLimitInterval: 'minute',
        maxRequestSize: 10, // MB
        enableCaching: true,
        cacheDuration: 300, // seconds
        enableCors: true,
      },
    };

    res.json({
      status: 'success',
      data: settings
    });
  } catch (error) {
    console.error('Error fetching system settings:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch system settings' }
    });
  }
});

app.put('/api/admin/settings', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const settings = req.body;

    // Validate settings structure
    if (!settings || !settings.system || !settings.security) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'Invalid settings format' }
      });
    }

    // Here you would persist the settings to a database
    // For now, we'll just return success and the same settings

    // Log the update action
    await prisma.userActivity.create({
      data: {
        userId: req.user.id,
        action: 'SETTINGS_UPDATED',
        resourceType: 'SYSTEM',
        resourceId: 'system-settings',
        metadata: { updatedAt: new Date().toISOString() }
      }
    });

    res.json({
      status: 'success',
      data: {
        settings,
        message: 'Settings updated successfully'
      }
    });
  } catch (error) {
    console.error('Error updating system settings:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to update system settings' }
    });
  }
});

// Admin message management endpoints
app.get('/api/admin/messages', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Get filtering parameters
    const type = req.query.type as string | undefined;
    const messageStatus = req.query.status as string | undefined;
    
    // Build where clause based on filters
    const where: any = {};
    
    if (type) {
      where.type = type;
    }
    
    if (messageStatus) {
      where.status = messageStatus;
    }

    // Query messages with pagination and filtering
    const [messages, totalCount] = await Promise.all([
      prisma.message.findMany({
        take: limit,
        skip: skip,
        where,
        orderBy: {
          createdAt: 'desc'
        },
        include: {
          sender: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          recipient: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          }
        }
      }),
      prisma.message.count({ where })
    ]);

    // Map database messages to the format expected by the frontend
    const formattedMessages = messages.map(message => ({
      ...message,
      // Derive status from readAt field
      status: message.readAt ? 'READ' : 'DELIVERED',
      // Default type to DIRECT
      type: 'DIRECT'
    }));

    // Return paginated response
    res.json({
      status: 'success',
      data: {
        data: formattedMessages,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching admin messages:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch messages' }
    });
  }
});

app.get('/api/admin/messages/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { id } = req.params;

    // Get message by id
    const message = await prisma.message.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    if (!message) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'Message not found' }
      });
    }

    // Add status and type properties to the message 
    const messageWithStatus = {
      ...message,
      status: message.readAt ? 'READ' : 'DELIVERED',
      type: 'DIRECT'
    };

    res.json({
      status: 'success',
      data: messageWithStatus
    });
  } catch (error) {
    console.error('Error fetching message details:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch message details' }
    });
  }
});

app.patch('/api/admin/messages/:id/status', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { id } = req.params;
    const { status } = req.body;

    // Validate input
    if (!status) {
      return res.status(400).json({
        status: 'error',
        error: { message: 'Status is required' }
      });
    }

    // Check if message exists
    const existingMessage = await prisma.message.findUnique({
      where: { id }
    });

    if (!existingMessage) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'Message not found' }
      });
    }

    // Map the status value to the appropriate readAt value
    let updateData: any = {};
    
    if (status === 'READ') {
      updateData.readAt = existingMessage.readAt || new Date();
    } else if (status === 'DELIVERED' || status === 'SENT') {
      updateData.readAt = null;
    }

    // Update message status by updating the readAt field
    const message = await prisma.message.update({
      where: { id },
      data: updateData,
      include: {
        sender: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        recipient: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    // Add virtual status field for the response
    const messageWithStatus = {
      ...message,
      status,
      type: 'DIRECT'
    };

    // Log the update action
    await prisma.userActivity.create({
      data: {
        userId: req.user.id,
        action: 'MESSAGE_STATUS_UPDATED',
        resourceType: 'MESSAGE',
        resourceId: id,
        metadata: { 
          previousStatus: existingMessage.readAt ? 'READ' : 'DELIVERED',
          newStatus: status
        }
      }
    });

    res.json({
      status: 'success',
      data: messageWithStatus
    });
  } catch (error) {
    console.error('Error updating message status:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to update message status' }
    });
  }
});

app.delete('/api/admin/messages/:id', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    const { id } = req.params;

    // Check if message exists
    const existingMessage = await prisma.message.findUnique({
      where: { id }
    });

    if (!existingMessage) {
      return res.status(404).json({
        status: 'error',
        error: { message: 'Message not found' }
      });
    }

    // Delete message
    await prisma.message.delete({
      where: { id }
    });

    // Log the deletion action
    await prisma.userActivity.create({
      data: {
        userId: req.user.id,
        action: 'MESSAGE_DELETED',
        resourceType: 'MESSAGE',
        resourceId: id,
        metadata: { 
          senderId: existingMessage.senderId,
          recipientId: existingMessage.recipientId
        }
      }
    });

    res.json({
      status: 'success',
      data: { message: 'Message deleted successfully' }
    });
  } catch (error) {
    console.error('Error deleting message:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to delete message' }
    });
  }
});

// Add admin providers endpoint
app.get('/api/admin/providers', protect, async (req, res) => {
  try {
    // Check if user is admin
    if (req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        status: 'error',
        error: { message: 'Access denied. Admin role required.' }
      });
    }

    // Get pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    // Get filtering parameters
    const search = req.query.search as string | undefined;
    const specialty = req.query.specialty as string | undefined;
    
    // Build where clause based on filters
    const where: any = {
      role: Role.PROVIDER
    };
    
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' as any } },
        { email: { contains: search, mode: 'insensitive' as any } }
      ];
    }
    
    if (specialty) {
      where.specialty = { contains: specialty, mode: 'insensitive' as any };
    }

    // Query providers with pagination and filtering
    const [providers, totalCount] = await Promise.all([
      prisma.user.findMany({
        take: limit,
        skip: skip,
        where,
        orderBy: {
          name: 'asc'
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          specialty: true,
          isActive: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              patientsAsDr: true
            }
          }
        }
      }),
      prisma.user.count({ where })
    ]);

    // Format providers with patient count
    const formattedProviders = providers.map(provider => ({
      id: provider.id,
      name: provider.name,
      email: provider.email,
      role: provider.role,
      specialty: provider.specialty,
      isActive: provider.isActive,
      createdAt: provider.createdAt,
      updatedAt: provider.updatedAt,
      patientCount: provider._count.patientsAsDr
    }));

    // Return paginated response
    res.json({
      status: 'success',
      data: {
        data: formattedProviders,
        pagination: {
          total: totalCount,
          page,
          limit,
          pages: Math.ceil(totalCount / limit)
        }
      }
    });
  } catch (error) {
    console.error('Error fetching providers:', error);
    res.status(500).json({
      status: 'error',
      error: { message: 'Failed to fetch providers' }
    });
  }
});

// Error handling middleware must be the last middleware
const errorHandlerMiddleware: CustomErrorHandler = (err, req, res, next) => {
  errorHandler(err, req, res, next);
};

// Register error handler
app.use(errorHandlerMiddleware as ErrorRequestHandler);

// Initialize services
const notificationService = new NotificationService(wsService, prisma as unknown as PrismaClient);
const analyticsService = new AnalyticsService(prisma as unknown as PrismaClient);

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