import { AppError } from '../utils/appError.js';
import { Role } from '@prisma/client';
export const getSystemMetrics = async (req, res, next) => {
    try {
        // Only allow admins to access system metrics
        if (req.user.role !== Role.ADMIN) {
            return next(new AppError('Not authorized to access system metrics', 403));
        }
        const metrics = await req.analyticsService.getSystemMetrics();
        res.status(200).json({
            status: 'success',
            data: metrics
        });
    }
    catch (error) {
        next(error);
    }
};
export const getUserMetrics = async (req, res, next) => {
    try {
        const { userId } = req.params;
        // Users can only access their own metrics unless they're admins
        if (userId !== req.user.id.toString() && req.user.role !== Role.ADMIN) {
            return next(new AppError('Not authorized to access these metrics', 403));
        }
        const metrics = await req.analyticsService.getUserMetrics(userId);
        res.status(200).json({
            status: 'success',
            data: metrics
        });
    }
    catch (error) {
        next(error);
    }
};
export const getFileAccessHistory = async (req, res, next) => {
    try {
        const { fileId } = req.params;
        // Check if user has access to this file
        // This would typically check against a file_permissions table
        // Implementation depends on your access control system
        const history = await req.analyticsService.getFileAccessHistory(fileId);
        res.status(200).json({
            status: 'success',
            data: history
        });
    }
    catch (error) {
        next(error);
    }
};
//# sourceMappingURL=analytics.controller.js.map