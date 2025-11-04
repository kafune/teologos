import type { Request, Response } from 'express';
import OpenAI from 'openai';
import { logger } from '../logger.js';
import { cfg } from '../config.js';
import { buildCitations, buildMessages } from '../services/prompt.service.js';
import { ragService } from '../services/rag.service.js';

const openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const retrieve = (agent: string, message: string, topK?: number) =>
  ragService.retrieve(agent, message, topK);

export async function askHandler(req: Request, res: Response) {
  const { agent, message } = req.body ?? {};
  const authorization = req.headers.authorization;

  if (typeof authorization !== 'string' || !authorization.startsWith('Bearer ')) {
    logger.warn({ headers: { authorization } }, 'Missing bearer token for /ask');
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  const receivedToken = authorization.slice('Bearer '.length).trim();
  if (!receivedToken || receivedToken !== cfg.orchestratorToken) {
    logger.warn('Invalid bearer token for /ask');
    return res.status(401).json({ error: 'UNAUTHORIZED' });
  }

  if (typeof agent !== 'string' || typeof message !== 'string' || !agent.trim() || !message.trim()) {
    logger.warn({ body: req.body }, 'Invalid /ask payload');
    return res.status(400).json({ error: 'INVALID_INPUT' });
  }

  const normalizedAgent = agent.trim().toLowerCase();
  const normalizedMessage = message.trim();

  try {
    const ctx = await retrieve(normalizedAgent, normalizedMessage, 8);
    const messages = await buildMessages(normalizedAgent, normalizedMessage, ctx);
    const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

    let completion;
    try {
      completion = await openaiClient.chat.completions.create({
        model,
        messages,
      });
    } catch (error) {
      logger.error({ err: error }, 'OpenAI chat completion failed');
      return res.status(502).json({ error: 'LLM_ERROR' });
    }

    const answer = completion.choices[0]?.message?.content?.trim();
    if (!answer) {
      logger.error({ completion }, 'OpenAI chat completion returned empty answer');
      return res.status(502).json({ error: 'LLM_ERROR' });
    }

    const citations = buildCitations(ctx);
    return res.json({ answer, citations });
  } catch (error) {
    logger.error({ err: error }, 'Unexpected error in askHandler');
    return res.status(500).json({ error: 'INTERNAL_ERROR' });
  }
}
