import cors from 'cors';
import express from 'express';
import type { NextFunction, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import morgan from 'morgan';
import type { Server } from 'node:http';
import routes from './routes.js';
import { cfg } from './config.js';
import { logger } from './logger.js';

export function createApp() {
  const app = express();

  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: '*',
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    }),
  );
  app.use(express.json({ limit: '1mb' }));

  const limiter = rateLimit({
    windowMs: cfg.rateLimitWindowMs,
    max: cfg.rateLimitMax,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use(limiter);

  const accessLogStream = {
    write: (message: string) => {
      logger.info({ access: message.trim() });
    },
  };
  app.use(morgan('combined', { stream: accessLogStream }));

  app.use(routes);

  app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    logger.error({ err }, 'Unhandled error');
    res.status(500).json({ error: 'INTERNAL_ERROR' });
  });

  return app;
}

export function startServer(): Promise<Server> {
  const app = createApp();

  return new Promise((resolve, reject) => {
    const server = app
      .listen(cfg.port, '0.0.0.0', () => {
        logger.info(
          {
            port: cfg.port,
            env: cfg.env,
          },
          'agent-orchestrator listening',
        );
        resolve(server);
      })
      .on('error', (error) => {
        logger.error({ err: error }, 'Failed to start server');
        reject(error);
      });
  });
}
