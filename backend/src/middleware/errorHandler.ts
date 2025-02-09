import { Request, Response, NextFunction } from 'express';
import { QueryFailedError, EntityNotFoundError } from 'typeorm';

export class AppError extends Error {
  statusCode: number;
  status: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error | AppError | QueryFailedError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      status: err.status,
      message: err.message,
    });
  }

  if (err instanceof QueryFailedError) {
    // Handle TypeORM errors
    const pgError = err as any;
    if (pgError.code === '23505') { // unique violation
      return res.status(400).json({
        status: 'fail',
        message: 'A record with this value already exists.',
      });
    }
  }

  if (err instanceof EntityNotFoundError) {
    return res.status(404).json({
      status: 'fail',
      message: 'Record not found.',
    });
  }

  // Log unexpected errors
  console.error('ERROR 💥', err);

  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong',
  });
}; 