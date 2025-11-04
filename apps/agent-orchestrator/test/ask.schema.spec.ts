import { askRequestSchema } from '../src/schemas/ask.schema.js';

describe('askRequestSchema', () => {
  it('accepts valid payloads and normalizes whitespace', () => {
    const result = askRequestSchema.parse({
      agent: 'agente-01',
      message: '   Qual é o sentido da graça?   ',
    });

    expect(result.agent).toBe('agente-01');
    expect(result.message).toBe('Qual é o sentido da graça?');
    expect(result.stream).toBe(false);
  });

  it('allows enabling stream explicitly', () => {
    const result = askRequestSchema.parse({
      agent: 'joao-calvino',
      message: 'Explique a predestinação.',
      stream: true,
    });

    expect(result.stream).toBe(true);
  });

  it('rejects invalid agent slugs', () => {
    const invalid = askRequestSchema.safeParse({
      agent: 'Inválido!',
      message: 'Mensagem válida.',
    });

    expect(invalid.success).toBe(false);
  });

  it('rejects overly long messages', () => {
    const longMessage = 'a'.repeat(2001);
    const invalid = askRequestSchema.safeParse({
      agent: 'agente-02',
      message: longMessage,
    });

    expect(invalid.success).toBe(false);
  });
});
