import { ZodError } from 'zod';
import { config } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  // Handle JSON syntax error from express.json()
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      success: false,
      error: {
        message: 'Invalid JSON payload in request body',
      },
    });
  }

  // Handle Zod validation errors
  if (err instanceof ZodError) {
    const details = err.errors.map((e) => ({
      field: e.path.join('.'),
      message: e.message,
    }));

    return res.status(400).json({
      success: false,
      error: {
        message: 'Validation failed',
        details,
      },
    });
  }

  // Handle PayloadTooLargeError from body-parser
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: {
        message: 'Request payload exceeds allowable size limit',
      },
    });
  }

  const statusCode = err.statusCode || err.status || 500;
  const isServerFault = statusCode >= 500;

  if (isServerFault && !config.isTest) {
    console.error(`[Unhandled Error] ${err.message}`, err.stack);
  }

  return res.status(statusCode).json({
    success: false,
    error: {
      message: isServerFault && config.isProduction ? 'Internal server error' : err.message,
    },
  });
}
