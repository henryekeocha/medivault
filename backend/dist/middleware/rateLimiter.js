import rateLimit from 'express-rate-limit';
export const rateLimiter = (options) => {
    return rateLimit({
        windowMs: options.windowMs || 15 * 60 * 1000, // Default 15 minutes
        max: options.max || 100, // Default limit each IP to 100 requests per windowMs
        message: options.message || 'Too many requests from this IP, please try again later',
        standardHeaders: true,
        legacyHeaders: false,
    });
};
//# sourceMappingURL=rateLimiter.js.map