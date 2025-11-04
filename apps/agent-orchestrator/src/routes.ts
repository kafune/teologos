import { Router } from 'express';
import { askHandler } from './controllers/ask.controller.js';
import { getHealth, getVersion } from './controllers/health.controller.js';

const router = Router();

router.get('/health', getHealth);
router.get('/version', getVersion);
router.post('/ask', askHandler);

export default router;
