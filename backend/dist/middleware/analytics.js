import { AnalyticsService } from '../services/analytics.service.js';
import prisma from '../lib/prisma.js';
export const injectAnalyticsService = (req, res, next) => {
    // Create a new instance of AnalyticsService for each request
    req.analyticsService = new AnalyticsService(prisma);
    next();
};
//# sourceMappingURL=analytics.js.map