import { AppError } from '../utils/appError.js';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';
import { ZodError } from 'zod';
export const errorHandler = (err, req, res, next) => {
    // Log all errors with timestamp and request information
    console.error(`[ERROR] ${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
    console.error(`Request body: ${JSON.stringify(req.body)}`);
    console.error(`Error type: ${err.constructor.name}`);
    console.error(`Error message: ${err.message}`);
    console.error(`Stack trace: ${err.stack}`);
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({
            status: err.status,
            message: err.message,
        });
    }
    if (err instanceof PrismaClientKnownRequestError) {
        // Handle Prisma-specific errors
        console.error(`Prisma Error Code: ${err.code}, Meta: ${JSON.stringify(err.meta)}`);
        switch (err.code) {
            case 'P2002':
                return res.status(409).json({
                    status: 'fail',
                    message: 'A record with this data already exists.',
                    details: err.meta
                });
            case 'P2025':
                return res.status(404).json({
                    status: 'fail',
                    message: 'Record not found.',
                    details: err.meta
                });
            case 'P2003':
                return res.status(400).json({
                    status: 'fail',
                    message: 'Related record not found.',
                    details: err.meta
                });
            case 'P2001':
                return res.status(404).json({
                    status: 'fail',
                    message: 'Record does not exist.',
                    details: err.meta
                });
            default:
                console.error('Prisma Error:', err);
                return res.status(500).json({
                    status: 'error',
                    message: 'Database operation failed.',
                    code: err.code,
                    details: err.meta
                });
        }
    }
    // Handle validation errors
    if (err instanceof ZodError) {
        const validationErrors = err.errors.map(e => ({
            field: e.path.join('.'),
            message: e.message
        }));
        return res.status(400).json({
            status: 'error',
            message: 'Validation failed',
            errors: validationErrors
        });
    }
    // Handle JWT errors
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({
            status: 'fail',
            message: 'Invalid token. Please log in again!'
        });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
            status: 'fail',
            message: 'Your token has expired! Please log in again.'
        });
    }
    // Development error response
    if (process.env.NODE_ENV === 'development') {
        return res.status(500).json({
            status: 'error',
            error: err,
            message: err.message,
            stack: err.stack
        });
    }
    // Log unexpected errors
    console.error('Unexpected Error:', err);
    // Production error response
    return res.status(500).json({
        status: 'error',
        message: 'Something went wrong!',
    });
};
//# sourceMappingURL=errorHandler.js.map