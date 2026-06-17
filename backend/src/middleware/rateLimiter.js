import rateLimit from 'express-rate-limit';

const isDev = process.env.NODE_ENV !== 'production';

// Relaxed rate limiting in development mode to prevent local test loop lockout
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDev ? 10000 : 100, 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many requests from this IP, please try again after 15 minutes'
  }
});

export const authLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: isDev ? 5000 : 20, 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: 'Too many login attempts from this IP, please try again after an hour'
  }
});
