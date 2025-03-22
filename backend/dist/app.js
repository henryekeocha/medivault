import express from 'express';
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
            connectSrc: ["'self'", process.env.CORS_ORIGIN].filter(Boolean),
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
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:3000',
            'http://[::1]:3000'
        ];
        // Allow requests with no origin (like mobile apps, curl requests, etc.)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        }
        else {
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
    verify: (req, res, buf) => {
        req.rawBody = buf.toString();
    }
}));
app.use(express.urlencoded({
    extended: true,
    limit: process.env.MAX_FILE_SIZE || '10mb'
}));
// Logging
if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
}
else {
    app.use(morgan('combined'));
}
// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
// Simple diagnostic endpoint for debugging
app.get('/api/test', (req, res) => {
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
app.post('/api/test-auth', (req, res) => {
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
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/images', imageRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/patients', patientRoutes);
app.use('/api/v1/providers', providerRoutes);
app.use('/api/v1/settings', settingsRoutes);
app.use('/api/v1/audit', auditRoutes);
app.use('/api/v1/analysis', analysisRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/appointments', appointmentRoutes);
app.use('/api/v1/health-metrics', healthMetricRoutes);
app.use('/api/chatbot', chatbotRoutes);
app.use('/api/settings', systemSettingsRoutes);
// Error handling
app.use(errorHandler);
export default app;
//# sourceMappingURL=app.js.map