import type { Request, Response } from 'express';
import { getHealth, getVersion } from '../src/controllers/health.controller.js';

function createMockResponse() {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response & {
    status: jest.Mock;
    json: jest.Mock;
  };
}

describe('Health controller', () => {
  it('returns service health with uptime and version', () => {
    const res = createMockResponse();

    getHealth({} as Request, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];

    expect(payload).toEqual(
      expect.objectContaining({
        ok: true,
        version: expect.any(String),
      }),
    );
    expect(typeof payload.uptime).toBe('number');
  });

  it('returns version metadata with optional commit hash', () => {
    const res = createMockResponse();

    getVersion({} as Request, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledTimes(1);
    const payload = res.json.mock.calls[0][0];

    expect(payload).toEqual(
      expect.objectContaining({
        name: expect.any(String),
        version: expect.any(String),
      }),
    );
  });
});
