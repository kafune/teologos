import { config as loadEnv } from 'dotenv';
import { z } from 'zod';

loadEnv();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().min(1).max(65535).default(8080),
  OPENAI_API_KEY: z.string().min(1, 'OPENAI_API_KEY is required'),
  OPENAI_MODEL: z.string().min(1).default('gpt-4o-mini'),
  AGENT_ORCHESTRATOR_TOKEN: z
    .string()
    .min(16, 'AGENT_ORCHESTRATOR_TOKEN must be at least 16 characters long'),
  REQUEST_TIMEOUT_MS: z.coerce.number().positive().default(30000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().positive().default(60000),
  RATE_LIMIT_MAX: z.coerce.number().positive().default(60),
  LOG_LEVEL: z.string().default('info'),
});

const rawEnv = {
  ...process.env,
  OPENAI_API_KEY:
    process.env.OPENAI_API_KEY ??
    (process.env.NODE_ENV === 'test' ? 'test-openai-key' : undefined),
  AGENT_ORCHESTRATOR_TOKEN:
    process.env.AGENT_ORCHESTRATOR_TOKEN ??
    (process.env.NODE_ENV === 'test' ? 'test-agent-orchestrator-token' : undefined),
};

const parsed = envSchema.safeParse(rawEnv);

if (!parsed.success) {
  const formatted = parsed.error.flatten().fieldErrors;
  throw new Error(`Invalid environment configuration: ${JSON.stringify(formatted)}`);
}

const data = parsed.data;

export const cfg = {
  env: data.NODE_ENV,
  port: data.PORT,
  openaiApiKey: data.OPENAI_API_KEY,
  openaiModel: data.OPENAI_MODEL,
  requestTimeoutMs: data.REQUEST_TIMEOUT_MS,
  rateLimitWindowMs: data.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: data.RATE_LIMIT_MAX,
  logLevel: data.LOG_LEVEL,
  orchestratorToken: data.AGENT_ORCHESTRATOR_TOKEN,
};

export const isDevelopment = cfg.env === 'development';
export const isTest = cfg.env === 'test';
