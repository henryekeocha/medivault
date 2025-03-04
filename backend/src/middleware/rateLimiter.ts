import rateLimit from 'express-rate-limit';
import type { RateLimitRequestHandler } from 'express-rate-limit';

interface RateLimiterOptions {
  windowMs?: number;
  max?: number;
  message?: string;
}

export const rateLimiter = (options: RateLimiterOptions): RateLimitRequestHandler => {
  return rateLimit({
    windowMs: options.windowMs || 15 * 60 * 1000, // Default 15 minutes
    max: options.max || 100, // Default limit each IP to 100 requests per windowMs
    message: options.message || 'Too many requests from this IP, please try again later',
    standardHeaders: true,
    legacyHeaders: false,
  });
}; 