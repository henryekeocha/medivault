import express, { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
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
import { bypassAuth } from './middleware/auth.js';
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

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
      connectSrc: ["'self'", process.env.CORS_ORIGIN].filter(Boolean) as string[],
      fontSrc: ["'self'", 'https:', 'data:'],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: true,
  crossOriginResourcePolicy: { policy: "same-site" }
}));

// CORS configuration
const corsOptions = {
  origin: function(origin: string | undefined, callback: (err: Error | null, allow: boolean) => void) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://[::1]:3000'
    ];
    
    // Allow requests with no origin (like mobile apps, curl requests, etc.)
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.warn(`CORS blocked request from origin: ${origin}`);
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
  credentials: true,
  maxAge: 86400, // 24 hours
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});

// Body parsing and additional middleware
app.use(compression()); // Compress responses
app.use(cookieParser(process.env.SESSION_SECRET));
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

// Apply bypassAuth to all routes - it will either bypass auth for public routes or apply the protect middleware
app.use(bypassAuth);

// Regular routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/images', imageRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/providers', providerRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/analysis', analysisRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/health-metrics', healthMetricRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/system-settings', systemSettingsRoutes);
app.use('/api/analytics', analyticsRoutes);

// Error handling
app.use(errorHandler as ErrorRequestHandler);

export default app; 