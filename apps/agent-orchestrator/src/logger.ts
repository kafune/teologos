import pino from 'pino';
import { cfg, isDevelopment } from './config.js';

export const logger = pino({
  level: cfg.logLevel,
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          translateTime: 'SYS:standard',
          ignore: 'pid,hostname',
        },
      }
    : undefined,
});
