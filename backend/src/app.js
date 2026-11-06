import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { config } from './config/env.js';
import { requestLogger } from './middleware/logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFound.js';
import { healthRouter } from './routes/healthRoutes.js';
import { createNoteRouter, noteRouter } from './routes/noteRoutes.js';
import { NoteController } from './controllers/noteController.js';

export function createApp({ storage } = {}) {
  const app = express();

  // Security HTTP headers
  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS configuration
  const corsOptions = {
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) {
        return callback(null, true);
      }
      if (config.corsOrigins.includes('*') || config.corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} not allowed by CORS policy`));
    },
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
  };
  app.use(cors(corsOptions));

  // Request parsing with sensible body limits
  app.use(express.json({ limit: '100kb' }));
  app.use(express.urlencoded({ extended: true, limit: '100kb' }));

  // Basic request logging (omitted in test unless specified)
  if (!config.isTest) {
    app.use(requestLogger);
  }

  // Mount API endpoints
  app.use('/api/health', healthRouter);

  if (storage) {
    const customController = new NoteController(storage);
    app.use('/api/notes', createNoteRouter(customController));
  } else {
    app.use('/api/notes', noteRouter);
  }

  // Fallthrough 404 for unknown routes
  app.use(notFoundHandler);

  // Centralized error handling
  app.use(errorHandler);

  return app;
}

export const app = createApp();
