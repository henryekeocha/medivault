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
import { prisma } from './lib/prisma.js';
import { createServer } from 'http';
import { WebSocketService } from './services/websocket.service.js';
import { NotificationService } from './services/notification.service.js';
import { AnalyticsService } from './services/analytics.service.js';
import { initializeServices, injectServices } from './middleware/services.middleware.js';
// Load environment variables
dotenv.config();
// Create Express app
const app = express();
// Middleware
app.use(express.json());
// More permissive CORS configuration for development
if (process.env.NODE_ENV === 'development') {
    console.log('Using development CORS settings');
    app.use(cors({
        origin: '*', // Allow all origins in development
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        optionsSuccessStatus: 200
    }));
}
else {
    app.use(cors({
        origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
        credentials: true,
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
        optionsSuccessStatus: 200
    }));
}
// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/files', fileRoutes);
app.use('/api/analytics', analyticsRoutes);
// Error handling middleware must be the last middleware
const errorHandlerMiddleware = (err, req, res, next) => {
    errorHandler(err, req, res, next);
};
// Register error handler
app.use(errorHandlerMiddleware);
// Create HTTP server
const server = createServer(app);
// Initialize services
const wsService = new WebSocketService(server);
const notificationService = new NotificationService(wsService, prisma);
const analyticsService = new AnalyticsService(prisma);
// Initialize services middleware
initializeServices(wsService, notificationService, analyticsService);
// Add services to request object
app.use(injectServices);
// Start server
const PORT = process.env.PORT || 3000;
const server_url = `http://localhost:${PORT}`;
// Start server and connect to database
async function bootstrap() {
    try {
        // Test database connection
        await prisma.$connect();
        console.log('Database connection established');
        // Start server
        server.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
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