import { logger } from './logger.js';
import { startServer } from './server.js';

startServer().catch((error) => {
  logger.error({ err: error }, 'Server failed to start');
  process.exit(1);
});
