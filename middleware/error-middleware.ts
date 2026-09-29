import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export class AppError extends Error {
  public status_code: number;
  public error_code: string;
  public error_details?: unknown;

  constructor(message: string, status_code = 500, error_code = 'INTERNAL_SERVER_ERROR', error_details?: unknown) {
    super(message);
    this.status_code = status_code;
    this.error_code = error_code;
    this.error_details = error_details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const error_middleware = (
  error_instance: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Handle Zod validation error
  if (error_instance instanceof ZodError) {
    const formatted_issues = error_instance.issues.map((issue) => ({
      field: issue.path.join('.'),
      issue: issue.message,
    }));

    res.status(400).json({
      status: 'error',
      error_code: 'VALIDATION_ERROR',
      message: 'Data input tidak valid',
      error_details: formatted_issues,
    });
    return;
  }

  // Handle custom AppError
  if (error_instance instanceof AppError) {
    res.status(error_instance.status_code).json({
      status: 'error',
      error_code: error_instance.error_code,
      message: error_instance.message,
      ...(error_instance.error_details ? { error_details: error_instance.error_details } : {}),
    });
    return;
  }

  // Handle general standard Error
  if (error_instance instanceof Error) {
    console.error('[Unhandled Error]:', error_instance);
    res.status(500).json({
      status: 'error',
      error_code: 'INTERNAL_SERVER_ERROR',
      message: error_instance.message || 'Terjadi kesalahan pada server',
    });
    return;
  }

  // Fallback for unknown error types
  console.error('[Unknown Error]:', error_instance);
  res.status(500).json({
    status: 'error',
    error_code: 'UNKNOWN_ERROR',
    message: 'Terjadi kesalahan yang tidak diketahui',
  });
};
