import { z } from 'zod';

export const askRequestSchema = z.object({
  agent: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,32}$/),
  message: z
    .string()
    .trim()
    .min(1)
    .max(2000),
  stream: z.boolean().optional().default(false),
});

export const askResponseSchema = z.object({
  answer: z.string(),
  citations: z.array(z.any()),
});

export type AskRequest = z.infer<typeof askRequestSchema>;
export type AskResponse = z.infer<typeof askResponseSchema>;
