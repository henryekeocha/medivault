import { AppError } from '../utils/appError.js';
export const errorHandler = (err, req, res, next) => {
    console.error('Error details:', err);
    // Handle authentication errors from Clerk
    if (err.name === 'ClerkAPIResponseError' || err.message?.includes('clerk') || err.message?.includes('authentication')) {
        return res.status(401).json({
            status: 'fail',
            message: 'Authentication failed. Please log in again.',
            error: err.message
        });
    }
    // Handle AppError instances
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
            error: err.isOperational ? undefined : err
        });
    }
    // Handle Prisma errors
    if (err.name === 'PrismaClientKnownRequestError') {
        return res.status(400).json({
            status: 'fail',
            message: 'Database operation failed',
            error: err.message
        });
    }
    // Handle validation errors
    if (err.name === 'ValidationError') {
        return res.status(400).json({
            status: 'fail',
            message: 'Validation failed',
            error: err.message
        });
    }
    // Default error
    return res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        error: process.env.NODE_ENV === 'development' ? err : undefined
    });
};
//# sourceMappingURL=errorHandler.js.map