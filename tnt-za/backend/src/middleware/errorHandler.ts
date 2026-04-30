import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env';

export function errorHandler(err: any, _req: Request, res: Response, _next: NextFunction) {
  const status = err.status || 500;
  const message = status === 500 && env.NODE_ENV === 'production'
    ? 'Internal server error'
    : err.message || 'Something went wrong';

  console.error(`[Error] ${status}: ${err.message}`, status === 500 ? err.stack : '');

  res.status(status).json({
    success: false,
    error: message,
    code: status,
  });
}

export function notFoundHandler(_req: Request, res: Response) {
  res.status(404).json({ success: false, error: 'Route not found', code: 404 });
}
