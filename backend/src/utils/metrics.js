import client from 'prom-client';
import logger from './logger.js';
import { getAIReviewQueueSize } from '../queues/aiReview.queue.js';

let ioInstance = null;

// Create a custom registry
const register = new client.Registry();

// Enable default system metrics
client.collectDefaultMetrics({ register });

// HTTP Request Count Tracker
const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests processed',
  labelNames: ['method', 'route', 'status_code']
});

// HTTP Request Latency Tracker
const httpRequestDurationSeconds = new client.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.1, 0.3, 0.5, 1, 1.5, 2, 3, 5]
});

// Active Websocket Connections Monitor (dynamic query)
const activeWebsocketConnections = new client.Gauge({
  name: 'active_websocket_connections',
  help: 'Number of currently active WebSocket connections',
  collect() {
    if (ioInstance) {
      this.set(ioInstance.engine.clientsCount);
    }
  }
});

// Background AI Review Queue Job Size Monitor (dynamic query)
const aiReviewQueueSize = new client.Gauge({
  name: 'ai_review_queue_size',
  help: 'Current size of the AI Review Bull queue',
  async collect() {
    const size = await getAIReviewQueueSize();
    this.set(size);
  }
});

// Register metrics
register.registerMetric(httpRequestsTotal);
register.registerMetric(httpRequestDurationSeconds);
register.registerMetric(activeWebsocketConnections);
register.registerMetric(aiReviewQueueSize);

// Initialize with socket server instance
export const initMetrics = (io) => {
  ioInstance = io;
};

// Express middleware tracking count & duration
export const metricsMiddleware = (req, res, next) => {
  if (req.path === '/metrics') {
    return next();
  }

  const start = process.hrtime();

  res.on('finish', () => {
    const duration = process.hrtime(start);
    const durationInSeconds = duration[0] + duration[1] / 1e9;

    const route = req.route ? req.route.path : req.path;
    const method = req.method;
    const statusCode = res.statusCode.toString();

    httpRequestsTotal.inc({ method, route, status_code: statusCode });
    httpRequestDurationSeconds.observe({ method, route, status_code: statusCode }, durationInSeconds);
  });

  next();
};

// Expose metrics route endpoint handler
export const getMetrics = async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (err) {
    logger.error(`Failed to generate metrics: ${err.message}`);
    res.status(500).end(err.message);
  }
};
