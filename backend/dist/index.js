import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/errorHandler.js';
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
import { initializeServices, injectServices } from './middleware/services.middleware.js';
import authRoutesV2 from './routes/auth.routes.js';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { bypassAuth } from './middleware/bypassAuth.js';
import { syncUserMiddleware } from './middleware/syncUser.js';
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
}
else {
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
    }
    catch (error) {
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
                    emailVerified: clerkUser.emailAddresses.some(email => email.verification?.status === 'verified') ? new Date() : user.emailVerified
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
        }
        catch (clerkError) {
            console.error('2FA: Error verifying with Clerk:', clerkError);
            return res.status(500).json({
                status: 'error',
                message: 'Failed to verify with Clerk'
            });
        }
    }
    catch (error) {
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
                const primaryEmail = clerkUser.emailAddresses.find(emailObj => emailObj.id === primaryEmailId);
                if (!primaryEmail?.emailAddress) {
                    console.error(`Webhook: No primary email found for Clerk user: ${userId}`);
                    return res.status(400).json({ success: false, message: 'User has no primary email address' });
                }
                // Default to PATIENT role if not specified
                const role = (clerkUser.publicMetadata?.role || 'PATIENT');
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
            }
            catch (error) {
                console.error('Webhook: Error creating user:', error);
                return res.status(500).json({ success: false, message: 'Error creating user' });
            }
        }
        // Return success for all webhook types to acknowledge receipt
        return res.status(200).json({ success: true });
    }
    catch (error) {
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
// Error handling middleware must be the last middleware
const errorHandlerMiddleware = (err, req, res, next) => {
    errorHandler(err, req, res, next);
};
// Register error handler
app.use(errorHandlerMiddleware);
// Initialize services
const notificationService = new NotificationService(wsService, prisma);
const analyticsService = new AnalyticsService(prisma);
// Initialize services middleware
initializeServices(wsService, notificationService, analyticsService);
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
    }
    catch (error) {
        console.error('Error connecting to database:', error);
        process.exit(1);
    }
}
bootstrap();
// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
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
//# sourceMappingURL=index.js.map