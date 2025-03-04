// Services instances will be passed from the main application
let wsService;
let notificationService;
let analyticsService;
// Initialize services
export const initializeServices = (ws, notification, analytics) => {
    wsService = ws;
    notificationService = notification;
    analyticsService = analytics;
};
// Middleware to inject services into request
export const injectServices = (req, res, next) => {
    req.wsService = wsService;
    req.notificationService = notificationService;
    req.analyticsService = analyticsService;
    next();
};
//# sourceMappingURL=services.middleware.js.map