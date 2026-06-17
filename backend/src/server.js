import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import logger from './utils/logger.js';
import { connectDB } from './config/db.js';
import { connectRedis, getPubSubClients } from './config/redis.js';
import authRoutes from './routes/auth.routes.js';
import sessionRoutes from './routes/session.routes.js';
import userRoutes from './routes/user.routes.js';
import { authenticateSocket } from './middleware/auth.middleware.js';
import { handleCollaboration } from './socket/collaboration.js';
import { initAIReviewQueue } from './queues/aiReview.queue.js';
import { initExecutionQueue } from './queues/execution.queue.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { metricsMiddleware, getMetrics, initMetrics } from './utils/metrics.js';
import snapshotRoutes from './routes/snapshot.routes.js';
import { initSnapshotCron } from './cron/snapshot.cron.js';

import path from 'path';
import fs from 'fs';

// Load environment variables (supports running from root or backend subdirectory)
const localEnv = path.resolve(process.cwd(), '.env');
const parentEnv = path.resolve(process.cwd(), '../.env');

if (fs.existsSync(localEnv)) {
  dotenv.config({ path: localEnv });
} else if (fs.existsSync(parentEnv)) {
  dotenv.config({ path: parentEnv });
} else {
  dotenv.config();
}

// Trigger hot-reload to apply new local port configurations
const app = express();
const server = http.createServer(app);

// Database Connections
await connectDB();
await connectRedis();

// Express Middlewares
app.use(metricsMiddleware);
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Apply rate limiting to all api endpoints
app.use('/api', apiLimiter);

// API Endpoints
app.use('/api/auth', authRoutes);
app.use('/api/sessions', sessionRoutes);
app.use('/api/users', userRoutes);
app.use('/api', snapshotRoutes);

// Prometheus metrics endpoint
app.get('/metrics', getMetrics);

// Service Health Endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'up', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime() 
  });
});

// Catch-all 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'API route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(`Error: ${err.message}`);
  res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
});

// Initialize Socket.io Server
const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Configure Redis Pub/Sub adapter for horizontal scaling if Redis is active
const { pubClient, subClient, isMock } = getPubSubClients();
if (!isMock) {
  io.adapter(createAdapter(pubClient, subClient));
  logger.info('Socket.io Redis adapter integrated successfully');
} else {
  logger.warn('Redis mock fallback is active. Skipping Socket.io Redis adapter integration.');
}

// Apply Socket.io Auth Middleware
io.use(authenticateSocket);

// Set up Collaboration socket lifecycle
handleCollaboration(io);

// Initialize AI Review Queue & Worker
initAIReviewQueue(io);

// Initialize Code Execution Queue & Worker
initExecutionQueue(io);

// Initialize Automatic Session Snapshots cron job
initSnapshotCron();

// Initialize Prometheus metrics socket connection hooks
initMetrics(io);

// Start server listening
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Backend Server listening on port ${PORT}`);
});
