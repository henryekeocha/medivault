import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma.js';
import { AuthenticatedRequest } from '../types/auth.js';

type ResponseWriteCallback = (error: Error | null | undefined) => void;
type ResponseEndCallback = () => void;

export const hipaaLogger = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  const oldWrite = res.write;
  const oldEnd = res.end;
  const chunks: Buffer[] = [];

  res.write = function(chunk: any, encoding?: BufferEncoding, callback?: ResponseWriteCallback) {
    chunks.push(Buffer.from(chunk));
    return oldWrite.apply(res, arguments as any);
  } as typeof res.write;

  res.end = function(chunk?: any, encoding?: BufferEncoding, callback?: ResponseEndCallback) {
    if (chunk) {
      chunks.push(Buffer.from(chunk));
    }

    const responseBody = Buffer.concat(chunks).toString('utf8');

    // Create audit log asynchronously to not block the response
    prisma.auditLog.create({
      data: {
        userId: req.user?.id,
        action: `${req.method}_${req.originalUrl}`,
        details: JSON.stringify({
          type: 'API_REQUEST',
          method: req.method,
          url: req.originalUrl,
          requestBody: req.body,
          responseBody: responseBody,
          headers: req.headers,
          ip: req.ip
        })
      }
    }).catch(err => console.error('Error creating audit log:', err));

    return oldEnd.apply(res, arguments as any);
  } as typeof res.end;

  next();
}; 