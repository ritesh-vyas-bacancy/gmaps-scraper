import type { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger.js';

export interface AppError extends Error {
  statusCode?: number;
  errorCode?: string;
}

export function createError(message: string, statusCode = 500, errorCode?: string): AppError {
  const err: AppError = new Error(message);
  err.statusCode = statusCode;
  err.errorCode = errorCode;
  return err;
}

export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const statusCode = err.statusCode ?? 500;
  const message = err.message ?? 'Internal server error';

  logger.error('Request error', {
    path: req.path,
    method: req.method,
    statusCode,
    message,
  });

  res.status(statusCode).json({
    error: err.errorCode ?? 'INTERNAL_ERROR',
    message,
    statusCode,
  });
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: 'NOT_FOUND',
    message: `Route ${req.method} ${req.path} not found`,
    statusCode: 404,
  });
}
