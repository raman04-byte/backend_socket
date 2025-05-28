/**
 * WebRTC Socket Server
 * 
 * Main entry point for the WebRTC signaling server
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { createServer } from 'http';
import { logger } from './utils/logger.js';
import { formatSuccess } from './utils/response.js';
import { initializeWebRTCServer } from './features/webrtc/socket-server.js';
import webrtcRouter from './features/webrtc/routes/webrtc_route.js';
import { errorHandler } from './middleware/errorHandler.js';
import path from 'path';

// Get directory paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Load environment variables from .env file
dotenv.config({ path: join(rootDir, '.env') });

// Debug environment variables
logger.info('Environment Check:', {
    DEBUG_LOGS: process.env.DEBUG_LOGS,
    NODE_ENV: process.env.NODE_ENV,
    PORT: process.env.PORT
});

// Initialize express app
const app = express();
const port = process.env.PORT || 3000;

// Setup CORS
const corsOptions = {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json());

// Serve static files from the public directory
app.use(express.static(join(rootDir, 'public')));

// Basic routes
app.get('/api', (req, res) => {
    res.json({
        name: 'WebRTC Socket Server',
        version: '1.0.0',
        status: 'running'
    });
});

// Health check route
app.get('/health', (req, res) => {
    res.json(formatSuccess({
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        version: '1.0.0'
    }));
});

// WebRTC routes
app.use('/api/v1/webrtc', webrtcRouter);

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        status: 404
    });
});

// Error handler
app.use(errorHandler);

// Create HTTP server
const server = createServer(app);

// Start the server
server.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
});

// Initialize the WebRTC signaling server
initializeWebRTCServer(server);

export default app;
