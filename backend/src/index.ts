import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import 'reflect-metadata';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/users.js';
import imageRoutes from './routes/images.js';
import messageRoutes from './routes/messages.js';
import settingsRoutes from './routes/settings.js';
import { AppDataSource } from './config/database.js';
import http from 'http';

// Load environment variables
dotenv.config();

// Create Express app
const app = express();

// Middleware
app.use(express.json());
app.use(cors({
  origin: process.env.CORS_ORIGIN,
  credentials: true,
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/settings', settingsRoutes);

// Error handling
app.use(errorHandler);

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});

// Create HTTP server
const server = http.createServer(app);

// Start server
const PORT = process.env.PORT || 5000;
const server_url = `http://localhost:${PORT}`;

// Initialize database and start server
AppDataSource.initialize().then(() => {
  console.log('✅ Connected to database successfully');

  server.listen(PORT, () => {
    console.log(`🚀 Server running on ${server_url}`);
    console.log(`📚 API Documentation: ${server_url}/api-docs`);
  });
}).catch((error) => {
  console.error('❌ Error connecting to database:', error);
  process.exit(1);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err: Error) => {
  console.error('UNHANDLED REJECTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  server.close(() => {
    AppDataSource.destroy().then(() => {
      console.log('💤 Process terminated!');
      process.exit(0);
    });
  });
}); 