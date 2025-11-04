import type { Request, Response } from 'express';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const packageJsonPath = join(process.cwd(), 'package.json');

let packageJson: { name?: string; version?: string } = {};
try {
  const raw = readFileSync(packageJsonPath, 'utf-8');
  packageJson = JSON.parse(raw);
} catch (error) {
  // Fall back to default values if package.json cannot be read (e.g., during tests).
  packageJson = {
    name: 'agent-orchestrator',
    version: '0.0.0',
  };
}

const commitHash =
  process.env.GIT_COMMIT ??
  process.env.COMMIT_SHA ??
  process.env.SOURCE_COMMIT ??
  undefined;

export function getHealth(_req: Request, res: Response) {
  res.json({
    ok: true,
    uptime: process.uptime(),
    version: packageJson.version,
  });
}

export function getVersion(_req: Request, res: Response) {
  const payload: Record<string, string> = {
    name: packageJson.name ?? 'agent-orchestrator',
    version: packageJson.version ?? '0.0.0',
  };

  if (commitHash) {
    payload.commit = commitHash;
  }

  res.json(payload);
}
