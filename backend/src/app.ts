import express from 'express';
import cors from 'cors';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yamljs';
import path from 'path';
import { fileURLToPath } from 'url';

import userRoutes from './routes/users.js';
import imageRoutes from './routes/images.js';
import messageRoutes from './routes/messages.js';
import settingsRoutes from './routes/settings.js';
import { errorHandler } from './middleware/errorHandler.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Load Swagger document
const swaggerDocument = YAML.load(path.join(__dirname, 'swagger.yaml'));

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

// API Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/images', imageRoutes);
app.use('/api/v1/messages', messageRoutes);
app.use('/api/v1/settings', settingsRoutes);

// Error handling
app.use(errorHandler);

export default app; 